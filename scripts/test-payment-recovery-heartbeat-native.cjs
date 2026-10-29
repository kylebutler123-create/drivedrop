// Native monitoring-only rehearsal. Real localhost PostgreSQL transactions;
// strict loaders replace every financial stage, notification and HTTPS call.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const {randomUUID, createHash} = require('node:crypto');
const {EventEmitter} = require('node:events');
const {execFileSync} = require('node:child_process');
const {PrismaClient, Prisma} = require('@prisma/client');
const swc = require('next/dist/build/swc');
const {nativeDatabaseUrl} = require('./native-payment-rehearsal.cjs');
const root = path.resolve(__dirname, '..');
const url = nativeDatabaseUrl(); // Reject hosted hosts, unnamed DBs and URL overrides before connecting.
const clients = Array.from({length: 4}, () => new PrismaClient({datasources: {db: {url: url + '?connection_limit=1'}}}));
const [a, b, observer, blocker] = clients;
const fakeUrl = 'https://hc-ping.com/00000000-0000-4000-8000-000000000000';
const passed = [], failures = [], measurements = {};
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const barrier = () => {let release; const promise = new Promise(resolve => {release = resolve;}); return {promise, release};};
async function bounded(promise, ms, label) {
  let timer;
  try {return await Promise.race([promise, new Promise((_, reject) => {timer = setTimeout(() => reject(Error(label)), ms);})]);}
  finally {clearTimeout(timer);}
}
async function until(test, label) {
  const end = Date.now() + 3000;
  while (Date.now() < end) {if (await test()) return; await new Promise(resolve => setTimeout(resolve, 20));}
  throw Error(label);
}

function fixture(db, options = {}) {
  const requests = [], logs = [], stages = {authorisations: 0, payouts: 0, refunds: 0};
  let monitoringTransactions = 0, persistedAt;
  const env = {VERCEL_ENV: 'production', DRIVEDROP_PAYMENT_HEALTHCHECK_ENABLED: 'true',
    DRIVEDROP_PAYMENT_HEALTHCHECK_URL: fakeUrl, ...options.env};
  const prisma = {
    availabilityRequest: {
      findMany: async () => {stages.authorisations++; return [];},
      updateMany: async () => {throw Error('Financial mutation forbidden');},
    },
    $queryRaw: (...args) => db.$queryRaw(...args),
    $executeRaw: async (...args) => {
      const result = await db.$executeRaw(...args);
      if (args[0].join('?').includes('set status =') && result === 1) {
        persistedAt = Date.now();
        if (options.afterCompletion) await options.afterCompletion();
      }
      return result;
    },
    $transaction: (fn, settings) => {
      if (settings) monitoringTransactions++;
      return db.$transaction(async tx => {
        if (!options.slowHealth) return fn(tx);
        // Inject real server-side work into a health read. No fake clock or
        // simulated timeout: PostgreSQL must cancel the sleeping statement.
        return fn({
          $executeRaw: (...args) => tx.$executeRaw(...args),
          $queryRaw: async (...args) => {
            if (args[0].join('?').includes('select id, status')) await tx.$queryRaw`SELECT pg_sleep(3)::text`;
            return tx.$queryRaw(...args);
          },
        });
      }, settings);
    },
  };
  const mocks = {
    'node:crypto': {randomUUID}, '@prisma/client': {Prisma}, './prisma': {prisma},
    './booking-authorisation-provider': {paymentEnvironment: () => 'production'},
    './payment-runtime': {assertProductionPaymentConfiguration() {}},
    './booking-authorisation': {reconcileRequest: async () => {throw Error('Financial provider forbidden');}},
    './availability-notifications': {notifyAvailability: async () => {throw Error('Email forbidden');}},
    './stripe-payouts': {recoverStripePayouts: async () => {stages.payouts++; return {checked: 0, failed: options.stageFailure ? 1 : 0};}},
    './stripe-refunds': {recoverStripeRefunds: async () => {stages.refunds++; return {checked: 0, failed: 0};}},
    'node:https': {request: (target, settings, onResponse) => {
      assert([fakeUrl, fakeUrl + '/fail'].includes(target));
      assert.equal(settings.method, 'POST');
      assert.deepEqual(JSON.parse(JSON.stringify(settings.headers)), {'Content-Length': '0'});
      const entry = {healthy: target === fakeUrl, at: Date.now()};
      requests.push(entry);
      const req = new EventEmitter();
      let ended = false;
      const abort = () => req.destroy(Error('Synthetic private transport failure ' + fakeUrl));
      req.destroy = error => {
        if (ended) return;
        ended = true; settings.signal.removeEventListener('abort', abort);
        req.emit('error', error);
      };
      settings.signal.addEventListener('abort', abort, {once: true});
      req.end = () => queueMicrotask(() => {
        if (options.requested) options.requested.release();
        if (options.hang) return;
        const respond = () => {
          if (ended) return;
          ended = true; settings.signal.removeEventListener('abort', abort);
          const res = new EventEmitter(); res.statusCode = 200;
          onResponse(res); res.emit('data', Buffer.from('OK')); res.emit('end');
        };
        if (options.respond) options.respond.promise.then(respond); else respond();
      });
      return req;
    }},
  };
  const context = vm.createContext({process: {env}, console: {error: (...args) => logs.push(JSON.stringify(args))},
    Date, Buffer, AbortSignal});
  const cache = {};
  function load(file) {
    if (cache[file]) return cache[file];
    const output = cache[file] = {};
    const code = swc.transformSync(read(file), {filename: file,
      jsc: {parser: {syntax: 'typescript'}, target: 'es2022'}, module: {type: 'commonjs'}}).code;
    vm.runInContext('(function(exports, require){' + code + '\n})', context)(output, id => {
      if (id === './payment-recovery-heartbeat') return load('src/lib/payment-recovery-heartbeat.ts');
      if (Object.hasOwn(mocks, id)) return mocks[id];
      throw Error('Unlisted dependency; external access denied: ' + id);
    });
    return output;
  }
  return {worker: load('src/lib/booking-authorisation-recovery.ts'), requests, logs, stages,
    get persistedAt() {return persistedAt;}, get monitoringTransactions() {return monitoringTransactions;}};
}

const run = async id => (await observer.$queryRaw`
  SELECT id, status, finished_at, failed FROM drivedrop_production_ops.booking_authorisation_runs WHERE id=${id}`)[0];
const insertRun = async () => {
  const id = randomUUID();
  await observer.$executeRaw`INSERT INTO drivedrop_production_ops.booking_authorisation_runs(id) VALUES (${id})`;
  return id;
};
async function lockAvailable() {
  return b.$transaction(async tx => (await tx.$queryRaw`
    SELECT pg_try_advisory_xact_lock(hashtext('drivedrop-production-payment-recovery')) AS locked`)[0].locked);
}
function assertOnce(f) {
  assert.deepEqual(f.stages, {authorisations: 1, payouts: 1, refunds: 1});
  assert(!f.logs.join('').includes(fakeUrl), 'Private target must not enter logs');
}
async function check(name, fn) {
  await observer.$executeRawUnsafe('TRUNCATE drivedrop_production_ops.booking_authorisation_runs, public."AvailabilityRequest", public."StripePayout", public."StripeRefund"');
  try {await fn(); passed.push(name); console.log('PASS: ' + name);}
  catch (error) {failures.push({name, message: error.message}); console.error('FAIL: ' + name + ': ' + error.message);}
}

(async () => {
  const [{version}] = await a.$queryRaw`SELECT version()`;
  assert(version.startsWith('PostgreSQL 17.11 '), 'Native PostgreSQL 17.11 is required');
  const [{n}] = await a.$queryRaw`SELECT count(*)::int AS n FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')`;
  assert.equal(n, 0, 'A new empty disposable database is required');
  const pids = (await Promise.all(clients.map(db => db.$queryRaw`SELECT pg_backend_pid() AS pid`))).map(rows => rows[0].pid);
  assert.equal(new Set(pids).size, 4, 'Four separate native connections are required');
  const statementTimeout = async () => (await a.$queryRaw`SELECT current_setting('statement_timeout') AS value`)[0].value;
  const initialStatementTimeout = await statementTimeout();

  // Reuse the reviewed operational table/index DDL verbatim. Minimal backlog
  // tables support the actual aggregate SQL; this is not a migration/RLS test.
  const migration = read('scripts/production-database/supabase/migrations/20261021193022_production_payment_schema.sql');
  const begin = migration.indexOf('CREATE TABLE drivedrop_production_ops.booking_authorisation_runs (');
  const end = migration.indexOf('ALTER TABLE drivedrop_production_ops.booking_authorisation_runs ENABLE ROW LEVEL SECURITY;');
  assert(begin > 0 && end > begin);
  const ops = migration.slice(begin, end).split(';').map(sql => sql.trim()).filter(Boolean);
  assert.equal(ops.length, 2);
  await a.$executeRawUnsafe('CREATE SCHEMA drivedrop_production_ops');
  for (const sql of ops) await a.$executeRawUnsafe(sql);
  for (const sql of [
    'CREATE TABLE public."AvailabilityRequest" (id text PRIMARY KEY, "paymentEnvironment" text, status text, "paymentState" text, "confirmedAt" timestamptz, "respondBy" timestamptz, "createdAt" timestamptz DEFAULT now())',
    'CREATE TABLE public."StripePayout" (id text PRIMARY KEY, environment text, status text, "createdAt" timestamptz DEFAULT now(), "leaseUntil" timestamptz)',
    'CREATE TABLE public."StripeRefund" (id text PRIMARY KEY, environment text, status text, "recoveryStatus" text, "activePaymentId" text, "createdAt" timestamptz DEFAULT now(), "leaseUntil" timestamptz)',
  ]) await a.$executeRawUnsafe(sql);
  passed.push('Four native PostgreSQL 17.11 connections; reviewed operational DDL and empty local health fixtures');

  await check('Completion is visible to another connection before signaling; the dispatch lock remains held through delivery', async () => {
    const requested = barrier(), respond = barrier(), f = fixture(a, {requested, respond});
    const id = await insertRun(), completion = f.worker.completePaymentRecoveryRun(id);
    try {
      await bounded(Promise.race([requested.promise, completion.then(() => {throw Error('No request observed');})]), 3000, 'Request did not start');
      const row = await run(id); assert.equal(row.status, 'succeeded'); assert(row.finished_at);
      assert.equal(await lockAvailable(), false);
      assert.equal(await fixture(b).worker.claimPaymentRecoveryRun(), null);
    } finally {respond.release(); await completion;}
    assert.equal(f.requests.length, 1); assert.equal(f.requests[0].healthy, true); assertOnce(f);
    assert.equal(await lockAvailable(), true);
    assert.equal(await statementTimeout(), initialStatementTimeout, 'Timeout must not leak after commit');
    assert((await fixture(b).worker.claimPaymentRecoveryRun()).created);
  });

  await check('A replacement claimed after completion suppresses the old run signal', async () => {
    let replacement;
    const f = fixture(a, {afterCompletion: async () => {replacement = await fixture(b).worker.claimPaymentRecoveryRun();}});
    const id = await insertRun(); await f.worker.completePaymentRecoveryRun(id);
    assert(replacement.created); assert.notEqual(replacement.id, id);
    assert.equal((await run(id)).status, 'succeeded'); assert.equal((await run(replacement.id)).status, 'running');
    assert.equal(f.requests.length, 0); assertOnce(f);
  });

  await check('A busy native dispatch lock skips signaling without undoing completion', async () => {
    const entered = barrier(), release = barrier();
    const holding = blocker.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('drivedrop-production-payment-recovery'))::text`;
      entered.release(); await release.promise;
    }, {timeout: 10000});
    const f = fixture(a), id = await insertRun();
    try {await Promise.race([entered.promise, holding]); await f.worker.completePaymentRecoveryRun(id);
      assert.equal(f.requests.length, 0); assert.equal((await run(id)).status, 'succeeded'); assertOnce(f);
    } finally {release.release(); await holding;}
    assert.equal(await lockAvailable(), true);
  });

  await check('Concurrent duplicate completions send at most one signal; interrupted records stay untouched', async () => {
    const id = await insertRun(), first = fixture(a), second = fixture(b);
    await Promise.all([first.worker.completePaymentRecoveryRun(id), second.worker.completePaymentRecoveryRun(id)]);
    assert.equal(first.requests.length + second.requests.length, 1);
    assert.equal((await run(id)).status, 'succeeded');
    const old = await insertRun();
    await observer.$executeRaw`UPDATE drivedrop_production_ops.booking_authorisation_runs SET status='interrupted', finished_at=now() WHERE id=${old}`;
    const late = fixture(a); await late.worker.completePaymentRecoveryRun(old);
    assert.equal(late.requests.length, 0); assert.equal((await run(old)).status, 'interrupted');
  });

  await check('Actual review backlog sends failure and leaves the review evidence intact', async () => {
    await observer.$executeRaw`INSERT INTO public."StripeRefund" (id,environment,status,"activePaymentId") VALUES ('review-fixture','production','FAILED','reserved-fixture')`;
    const before = await observer.$queryRaw`SELECT * FROM public."StripeRefund"`;
    const f = fixture(a), id = await insertRun(); await f.worker.completePaymentRecoveryRun(id);
    assert.equal(f.requests.length, 1); assert.equal(f.requests[0].healthy, false);
    assert.deepEqual(await observer.$queryRaw`SELECT * FROM public."StripeRefund"`, before);
    assert.equal((await run(id)).status, 'succeeded'); assertOnce(f);
  });

  await check('A hung simulated HTTPS request times out and releases the native lock without retrying stages', async () => {
    const f = fixture(a, {hang: true}), id = await insertRun();
    await bounded(f.worker.completePaymentRecoveryRun(id), 4500, 'HTTPS timeout did not settle');
    measurements.httpsTimeoutMs = Date.now() - f.persistedAt;
    assert(measurements.httpsTimeoutMs >= 1700 && measurements.httpsTimeoutMs < 4000);
    assert.equal(f.requests.length, 1); assert(f.logs.some(line => line.includes('delivery')));
    assert.equal((await run(id)).status, 'succeeded'); assertOnce(f); assert.equal(await lockAvailable(), true);
  });

  await check('A saturated native connection pool respects maxWait and preserves completion', async () => {
    const entered = barrier(), release = barrier(); let holding;
    const f = fixture(a, {afterCompletion: async () => {
      holding = a.$transaction(async () => {entered.release(); await release.promise;}, {timeout: 10000});
      await Promise.race([entered.promise, holding]);
    }});
    const id = await insertRun();
    try {await bounded(f.worker.completePaymentRecoveryRun(id), 4000, 'Connection acquisition exceeded its bound');
      measurements.poolWaitMs = Date.now() - f.persistedAt;
      assert(measurements.poolWaitMs >= 750 && measurements.poolWaitMs < 3000);
      assert.equal(f.requests.length, 0); assert(f.logs.some(line => line.includes('health_unavailable')));
      assert.equal((await run(id)).status, 'succeeded'); assertOnce(f);
    } finally {release.release(); if (holding) await holding;}
    assert.equal(await lockAvailable(), true);
  });

  await check('A blocked health SQL read is bounded and releases the native advisory lock while the blocker remains', async () => {
    const entered = barrier(), release = barrier();
    const holding = blocker.$transaction(async tx => {
      await tx.$executeRawUnsafe('LOCK TABLE public."StripeRefund" IN ACCESS EXCLUSIVE MODE');
      entered.release(); await release.promise;
    }, {timeout: 12000});
    const f = fixture(a), id = await insertRun(); let completion;
    try {
      await Promise.race([entered.promise, holding]);
      completion = f.worker.completePaymentRecoveryRun(id);
      await until(async () => (await observer.$queryRaw`
        SELECT count(*)::int AS n FROM pg_stat_activity WHERE pid=${pids[0]} AND wait_event_type='Lock'`)[0].n === 1,
      'Expected real PostgreSQL lock wait was not observed');
      await bounded(completion, 6500, 'Blocked SQL outlived the five-second monitoring transaction budget');
      measurements.blockedSqlMs = Date.now() - f.persistedAt;
      assert(measurements.blockedSqlMs >= 750 && measurements.blockedSqlMs < 3000,
        'PostgreSQL must bound the blocked statement to one second plus scheduling tolerance');
      assert.equal(f.requests.length, 0); assert(f.logs.some(line => line.includes('health_unavailable')));
      assert.equal((await run(id)).status, 'succeeded'); assertOnce(f);
      assert.equal(await lockAvailable(), true, 'Timed-out monitoring must release its lock before the blocker is removed');
      assert.equal(await statementTimeout(), initialStatementTimeout, 'Timeout must not leak after rollback');
    } finally {release.release(); await holding; if (completion) await completion;}
  });

  await check('A slow native SQL statement is cancelled without signaling or leaking its timeout setting', async () => {
    const f = fixture(a, {slowHealth: true}), id = await insertRun();
    await bounded(f.worker.completePaymentRecoveryRun(id), 4000, 'Slow health SQL was not cancelled');
    measurements.slowSqlMs = Date.now() - f.persistedAt;
    assert(measurements.slowSqlMs >= 750 && measurements.slowSqlMs < 3000);
    assert.equal(f.requests.length, 0); assert(f.logs.some(line => line.includes('health_unavailable')));
    assert.equal((await run(id)).status, 'succeeded'); assertOnce(f);
    assert.equal(await lockAvailable(), true); assert.equal(await statementTimeout(), initialStatementTimeout);
  });

  await check('The disabled path uses no monitoring transaction or network fixture', async () => {
    const f = fixture(a, {env: {DRIVEDROP_PAYMENT_HEALTHCHECK_ENABLED: 'false'}}), id = await insertRun();
    await f.worker.completePaymentRecoveryRun(id);
    assert.equal(f.requests.length, 0); assert.equal(f.monitoringTransactions, 0);
    assert.equal((await run(id)).status, 'succeeded'); assertOnce(f);
  });

  const paths = ['src/lib/booking-authorisation-recovery.ts', 'src/lib/payment-recovery-heartbeat.ts',
    'scripts/test-payment-recovery-heartbeat-native.cjs'];
  const report = {checkedAt: new Date().toISOString(), version, native1711Verified: true,
    testedCommit: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim(),
    sourceHashes: Object.fromEntries(paths.map(file => [file, createHash('sha256').update(read(file)).digest('hex')])),
    passed, failures, measurements,
    limits: ['Disposable localhost database only; financial stages, email, HTTPS and runtime credential guard are fixtures.',
      'Minimal health tables and reviewed operational DDL test monitoring behavior, not production migration, RLS, provider delivery or hosted scheduling.',
      'No distributed atomicity or behavior during host termination/network partition is established.']};
  fs.writeFileSync(process.env.NATIVE_HEARTBEAT_REPORT || '/tmp/drivedrop-native-heartbeat.json', JSON.stringify(report, null, 2) + '\n');
  console.log('NATIVE_HEARTBEAT_EVIDENCE_BEGIN\n' + JSON.stringify(report, null, 2) + '\nNATIVE_HEARTBEAT_EVIDENCE_END');
  if (failures.length) process.exitCode = 1;
})().catch(error => {console.error(error); process.exitCode = 1;}).finally(() => Promise.all(clients.map(db => db.$disconnect())));
