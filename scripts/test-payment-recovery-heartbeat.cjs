// Offline only: all database, payment, notification and HTTPS operations are
// fixtures. The loader rejects any unlisted dependency; no real ping URL is used.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {EventEmitter} = require('node:events');
const swc = require('next/dist/build/swc');
const root = path.resolve(__dirname, '..');
const fakeUrl = 'https://hc-ping.com/00000000-0000-4000-8000-000000000000';
const instant = Date.parse('2026-10-29T01:00:00Z');
const barrier = () => {let release; const promise = new Promise(r => {release = r;}); return {promise, release};};

function fixture(options = {}) {
  const events = [], requests = [], logs = [], callbacks = [], writes = [];
  let lockHeld = false, clock = instant;
  const env = {VERCEL_ENV: 'production', CRON_SECRET: 'offline-only',
    DRIVEDROP_PAYMENT_HEALTHCHECK_ENABLED: 'true', DRIVEDROP_PAYMENT_HEALTHCHECK_URL: fakeUrl, ...options.env};
  const latest = options.latest || {id: 'current', status: 'succeeded', started_at: new Date(instant - 500),
    finished_at: new Date(instant), checked: 0, failed: 0};
  const backlog = options.backlog || [{queue: 'refunds', pending: 0, review: 0, reserved: 0, expired_leases: 0, oldest: null}];
  const db = {
    availabilityRequest: {findMany: async () => {events.push('authorisations'); return [];},
      updateMany: async () => {throw Error('Unexpected money-state update');}},
    $executeRaw: async (parts, ...values) => {
      assert.match(parts.join('?'), /where id = \? and finished_at is null/);
      events.push('persist-start');
      if (options.persistBarrier) await options.persistBarrier.promise;
      if (options.persistError) throw Error('Synthetic persistence failure');
      writes.push({status: values[1], checked: values[2], failed: values[3], id: values[4]});
      events.push('persisted');
      if (!options.latest) {latest.status = writes.at(-1).status; latest.failed = writes.at(-1).failed;}
      return options.completed ?? 1;
    },
    $queryRaw: async (parts, ...values) => {
      const sql = parts.join('?');
      if (sql.includes('pg_try_advisory_xact_lock')) {
        assert.equal(values[0], 'drivedrop-production-payment-recovery');
        events.push('lock');
        return [{locked: !options.busy && !lockHeld}];
      }
      if (sql.includes('select id, status')) {
        assert(lockHeld || options.healthOnly);
        events.push('health-runs');
        if (options.healthError) throw Error('Sensitive DB error ' + fakeUrl);
        return options.noRuns ? [] : [latest];
      }
      if (sql.includes("SELECT 'authorisations'")) {
        events.push('health-backlog');
        clock += options.healthDelay || 0;
        return backlog;
      }
      throw Error('Unexpected SQL');
    },
    $transaction: async (fn, settings) => {
      if (options.transactionError) throw Error('Sensitive transaction failure ' + fakeUrl);
      if (settings) assert.deepEqual(JSON.parse(JSON.stringify(settings)), {maxWait: 1000, timeout: 5000});
      let owned = false;
      const tx = {...db, $queryRaw: async (...args) => {
        const rows = await db.$queryRaw(...args);
        if (args[0].join('?').includes('pg_try_advisory_xact_lock') && rows[0].locked) {
          owned = true; lockHeld = true;
        }
        return rows;
      }};
      try {return await fn(tx);} finally {if (owned) {lockHeld = false; events.push('unlock');}}
    },
  };
  let worker;
  const mocks = {
    'node:crypto': {randomUUID: () => 'unused'},
    '@prisma/client': {Prisma: {raw: value => value}},
    './prisma': {prisma: db},
    './booking-authorisation-provider': {paymentEnvironment: () => env.VERCEL_ENV || 'development'},
    './payment-runtime': {assertProductionPaymentConfiguration() {}},
    './booking-authorisation': {reconcileRequest: async () => {throw Error('Unexpected payment operation');}},
    './availability-notifications': {notifyAvailability: async () => {throw Error('Unexpected email');}},
    './stripe-payouts': {recoverStripePayouts: async () => {
      events.push('payouts'); if (options.stageError) throw Error('Offline provider failure');
      return {checked: 0, failed: options.itemFailure ? 1 : 0};
    }},
    './stripe-refunds': {recoverStripeRefunds: async () => {events.push('refunds'); return {checked: 0, failed: 0};}},
    'node:https': {request: (url, settings, onResponse) => {
      assert(lockHeld, 'Dispatch ownership must remain held throughout the ping');
      requests.push({url, settings}); events.push('request');
      const req = new EventEmitter();
      req.destroy = error => {events.push('destroy'); req.emit('error', error || Error('Destroyed'));};
      settings.signal.addEventListener('abort', () => req.destroy(settings.signal.reason), {once: true});
      req.end = () => {
        queueMicrotask(async () => {
          if (options.networkError) {req.destroy(Error('Secret transport error ' + fakeUrl)); return;}
          if (options.compete) assert.equal(await worker.claimPaymentRecoveryRun(), null);
          if (options.hang) return; // Real AbortSignal.timeout must settle this request.
          const response = new EventEmitter(); response.statusCode = options.httpStatus ?? 200;
          onResponse(response);
          if (options.aborted) {response.emit('aborted'); return;}
          for (const chunk of options.chunks || [options.body ?? 'OK']) response.emit('data', Buffer.from(chunk));
          response.emit('end');
        });
      };
      return req;
    }},
    'next/server': {NextResponse: {json: (body, init) => Response.json(body, init)}, after: fn => callbacks.push(fn)},
  };
  class Clock extends Date {static now() {return clock;}}
  const context = vm.createContext({process: {env}, console: {error: (...args) => logs.push(JSON.stringify(args))},
    Date: Clock, Buffer, AbortSignal, Request, Response, URL});
  const cache = {};
  function load(relative) {
    if (cache[relative]) return cache[relative];
    const output = cache[relative] = {};
    const code = swc.transformSync(fs.readFileSync(path.join(root, relative), 'utf8'), {
      filename: relative, jsc: {parser: {syntax: 'typescript'}, target: 'es2022'}, module: {type: 'commonjs'},
    }).code;
    vm.runInContext('(function(exports, require){' + code + '\n})', context)(output, id => {
      if (id === './payment-recovery-heartbeat') return load('src/lib/payment-recovery-heartbeat.ts');
      if (id === '@/lib/booking-authorisation-provider') return mocks['./booking-authorisation-provider'];
      if (id === '@/lib/booking-authorisation-recovery') return {...worker, claimPaymentRecoveryRun: async () => ({id: 'current', created: true})};
      if (id in mocks) return mocks[id];
      throw Error('Unlisted dependency (network denied): ' + id);
    });
    return output;
  }
  worker = load('src/lib/booking-authorisation-recovery.ts');
  return {worker, heartbeat: load('src/lib/payment-recovery-heartbeat.ts'), route: load('src/app/api/cron/booking-authorisations/route.ts'),
    events, requests, logs, callbacks, writes, backlog, isLocked: () => lockHeld};
}

const pass = message => console.log('PASS: ' + message);
(async () => {
  for (const env of [
    {DRIVEDROP_PAYMENT_HEALTHCHECK_ENABLED: undefined}, {DRIVEDROP_PAYMENT_HEALTHCHECK_ENABLED: 'false'},
    {DRIVEDROP_PAYMENT_HEALTHCHECK_ENABLED: 'TRUE'}, {VERCEL_ENV: 'preview'}, {VERCEL_ENV: 'development'},
  ]) {
    const f = fixture({env});
    if (env.VERCEL_ENV === 'development') await assert.rejects(f.worker.completePaymentRecoveryRun('current'), /configured deployment/);
    else await f.worker.completePaymentRecoveryRun('current');
    assert.equal(f.requests.length, 0); assert(!f.events.includes('lock'));
  }
  assert.equal(fixture({env: {VERCEL_ENV: undefined, NODE_ENV: 'production'}}).heartbeat.paymentRecoveryHeartbeatTarget(), null);
  pass('Disabled and non-production deployments do no monitoring queries or networking');

  const pending = barrier(), f = fixture({persistBarrier: pending});
  const completion = f.worker.completePaymentRecoveryRun('current');
  await new Promise(resolve => setImmediate(resolve));
  assert(f.events.includes('persist-start')); assert(!f.events.includes('lock')); assert.equal(f.requests.length, 0);
  pending.release(); await completion;
  assert.deepEqual(f.events, ['authorisations','payouts','refunds','persist-start','persisted','lock','health-runs','health-backlog','request','unlock']);
  assert.equal(f.requests[0].url, fakeUrl);
  assert.equal(f.requests[0].settings.method, 'POST');
  assert.deepEqual(JSON.parse(JSON.stringify(f.requests[0].settings.headers)), {'Content-Length': '0'});
  assert.equal(f.requests[0].settings.agent, false); assert.equal(f.logs.length, 0);
  pass('Only committed current completion plus a fresh aggregate health read sends an empty success signal');

  const route = fixture();
  const accepted = await route.route.GET(new Request('https://offline.invalid/api/cron/booking-authorisations', {headers: {authorization: 'Bearer offline-only'}}));
  assert.equal(accepted.status, 202); assert.equal(route.requests.length, 0); assert.equal(route.writes.length, 0);
  await route.callbacks[0](); assert.equal(route.requests.length, 1);
  const denied = fixture(); assert.equal((await denied.route.GET(new Request('https://offline.invalid/api/cron/booking-authorisations'))).status, 403);
  assert.equal(denied.callbacks.length, 0); assert.equal(denied.requests.length, 0);
  pass('HTTP acceptance and unauthenticated dispatch cannot emit a heartbeat');

  for (const options of [{completed: 0}, {busy: true}, {noRuns: true},
    {latest: {id: 'current', status: 'succeeded', finished_at: null, failed: 0}},
    {latest: {id: 'replacement', status: 'succeeded', finished_at: new Date(instant), failed: 0}},
    ...['running','interrupted'].map(status => ({latest: {id: 'current', status, finished_at: new Date(instant), failed: 0}})),
    ...[instant - 60000, instant + 1].map(time => ({latest: {id: 'current', status: 'succeeded', finished_at: new Date(time), failed: 0}})),
  ]) {
    const x = fixture(options); await x.worker.completePaymentRecoveryRun('current'); assert.equal(x.requests.length, 0);
  }
  const competing = fixture({compete: true}); await competing.worker.completePaymentRecoveryRun('current');
  assert.equal(competing.requests.length, 1); assert.equal(competing.isLocked(), false);
  pass('Duplicate, superseded, old, future and unfinished completions stay silent; claim cannot overtake an in-flight heartbeat');

  for (const options of [{stageError: true}, {itemFailure: true},
    ...[{review: 1}, {expired_leases: 1}, {pending: 1, oldest: new Date(instant - 16 * 60000)}].map(values =>
      ({backlog: [{queue: 'refunds', pending: 0, review: 0, expired_leases: 0, reserved: 1, ...values}]})),
  ]) {
    const x = fixture(options), original = JSON.stringify(x.backlog);
    await x.worker.completePaymentRecoveryRun('current');
    assert.equal(x.requests[0].url, fakeUrl + '/fail'); assert(x.events.includes('refunds'));
    assert.equal(JSON.stringify(x.backlog), original); assert.equal(x.writes.length, 1);
  }
  pass('Failed work and existing review/backlog/lease warnings send failure without modifying financial evidence');

  for (const url of ['', 'http:' + fakeUrl.slice(6), fakeUrl + '?x=1', fakeUrl + '#x', fakeUrl + '/fail',
    fakeUrl.replace('hc-ping.com', 'hc-ping.com.attacker.invalid'), fakeUrl.replace('hc-ping.com', 'hc-ping.com:443'),
    fakeUrl.replace('hc-ping.com', 'user@hc-ping.com'), ' ' + fakeUrl, fakeUrl + '\n', fakeUrl + '/',
    fakeUrl.replace('/00000000', '/%300000000')]) {
    const x = fixture({env: {DRIVEDROP_PAYMENT_HEALTHCHECK_URL: url}});
    await x.worker.completePaymentRecoveryRun('current'); assert.equal(x.requests.length, 0);
    assert(x.logs.some(line => line.includes('configuration')));
  }
  pass('Only the exact HTTPS Healthchecks UUID endpoint is accepted; invalid configuration stays private');

  for (const options of [{networkError: true}, {aborted: true}, {httpStatus: 302}, {httpStatus: 503},
    {body: 'OK (not found)'}, {body: 'OK (rate limited)'}, {body: 'x'.repeat(100)}, {chunks: ['é'.repeat(10), 'é'.repeat(10)]},
    {healthError: true}, {transactionError: true}, {healthDelay: 4000}]) {
    const x = fixture(options); await x.worker.completePaymentRecoveryRun('current');
    assert.equal(x.writes.length, 1); assert.equal(x.writes[0].status, 'succeeded');
    assert.deepEqual(x.events.filter(event => ['authorisations','payouts','refunds'].includes(event)), ['authorisations','payouts','refunds']);
    assert(x.logs.some(line => line.includes('heartbeat failed'))); assert(!x.logs.join('').includes(fakeUrl));
    assert(!x.logs.join('').includes('Sensitive')); assert.equal(x.isLocked(), false);
    if (options.chunks) assert(x.events.includes('destroy'), 'The response limit counts bytes across UTF-8 chunks');
  }
  const timeout = fixture({hang: true}), start = Date.now();
  const keepAlive = setTimeout(() => {}, 2500);
  try {await timeout.worker.completePaymentRecoveryRun('current');} finally {clearTimeout(keepAlive);}
  assert(Date.now() - start >= 1900 && Date.now() - start < 2400);
  assert.equal(timeout.writes[0].status, 'succeeded'); assert.equal(timeout.requests.length, 1);
  assert(timeout.logs.some(line => line.includes('delivery'))); assert.equal(timeout.isLocked(), false);
  pass('Transport/body/DB errors and a real timeout preserve the committed result, release the lock, log no secrets and never retry work');

  const failedSave = fixture({persistError: true});
  await assert.rejects(failedSave.worker.completePaymentRecoveryRun('current'), /persistence failure/);
  assert.equal(failedSave.requests.length, 0); assert(!failedSave.events.includes('lock'));
  const health = fixture({healthOnly: true}); const publicHealth = await health.worker.paymentRecoveryHealth();
  assert.equal(publicHealth.healthy, true); assert(!('id' in publicHealth.runs[0])); assert.equal(health.requests.length, 0);
  pass('Failed persistence cannot ping; read-only health response shape and behavior are retained');
  console.log('All heartbeat checks passed offline. No network, live database, Stripe or email used.');
})().catch(error => {console.error(error); process.exitCode = 1;});
