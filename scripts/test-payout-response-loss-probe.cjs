// Offline QA24 evidence. Real stripe-node + real loopback HTTP sockets; the
// provider and database are explicit fixtures. No hosted money or credentials.
const assert = require('node:assert/strict');
const http = require('node:http');
const {Socket} = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const Stripe = require('stripe');
const swc = require('next/dist/build/swc');
const {context} = require('./test-stripe-connect.cjs');
const root = path.resolve(__dirname, '..');
const initialEnv = {...process.env};
const reports = [], traces = [];
let transport, server;
const stripeProxy = new Proxy(Stripe, {
  get(target, name) {return name === 'createNodeHttpClient' ? () => transport : Reflect.get(target, name);},
  construct(target, args) {return new target(args[0], {...args[1], httpClient: args[1]?.httpClient || transport});},
});
function load(mocks = {}) {
  const cache = new Map();
  function read(file) {
    file = path.resolve(root, file);
    if (mocks[file]) return mocks[file];
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const code = swc.transformSync(fs.readFileSync(file, 'utf8'), {filename: file,
      jsc: {parser: {syntax: 'typescript'}, target: 'es2022'}, module: {type: 'commonjs'}}).code;
    new Function('exports', 'require', 'console', code)(exports, name => {
      if (name === 'stripe') return stripeProxy;
      if (name.startsWith('.') || name.startsWith('@/')) return read((name.startsWith('@/') ?
        path.join(root, 'src', name.slice(2)) : path.resolve(path.dirname(file), name)) + '.ts');
      return require(name);
    }, {info: (label, data) => traces.push({label, ...data}), error: () => {}});
    return exports;
  }
  return read;
}
const now = Date.now();
const manifest = {version: 1, platformId: 'acct_1US4BzLAzgkvCvrI', bookingId: 'book_test', paymentId: 'pay_test',
  connectAccountId: 'connect_test', destinationAccountId: 'acct_test', paymentIntentId: 'pi_test', sourceChargeId: 'ch_test',
  armedAt: new Date(now - 2000).toISOString(), expiresAt: new Date(now + 598000).toISOString()};
const env = {VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'feature/ui-polish',
  STRIPE_CHECKOUT_ORIGIN: 'https://drivedrop-git-feature-ui-polish-future-9f39.vercel.app',
  STRIPE_CONNECT_ENABLED: 'true', STRIPE_REFUNDS_ENABLED: 'false',
  STRIPE_CONNECT_SECRET_KEY: 'rk_test_QA24_LOCAL_ONLY_NOT_A_KEY',
  STRIPE_CONNECT_WEBHOOK_SECRET: 'offline-fixture', STRIPE_CONNECT_EVENTS_SECRET: 'offline-fixture', CRON_SECRET: 'offline-fixture',
  DRIVEDROP_QA24_RESPONSE_LOSS: JSON.stringify(manifest)};
function reset() {for (const key of Object.keys(process.env)) delete process.env[key]; Object.assign(process.env, initialEnv, env); traces.length = 0;}
const original = {id: 'release_test', paymentId: 'pay_test', connectAccountId: 'connect_test', environment: 'preview',
  destinationAccountId: 'acct_test', paymentIntentId: 'pi_test', sourceChargeId: 'ch_test', grossPence: 1000,
  finePence: 0, amountPence: 1000, paidPence: 1100, refundedPence: 0, reversedPence: 0, status: 'PENDING', attemptCount: 0,
  createdAt: new Date(now - 1000), firstAttemptAt: null, stripeTransferId: null, transferredAt: null, payment: {bookingId: 'book_test'}};
const current = {...original, attemptCount: 1, firstAttemptAt: new Date(now - 500)};
const payment = {id: 'pay_test', bookingId: 'book_test', provider: 'STRIPE', providerReference: 'pi_test', currency: 'GBP',
  status: 'PAID', payoutStatus: 'PROCESSING', paidPence: 1100, refundedPence: 0, platformFeePence: 100,
  transporterProceedsPence: 1000, cancellationDeductionPence: 0,
  booking: {status: 'DELIVERED', customerConfirmedAt: new Date(now - 25 * 3600000), disputes: []}};
const intent = {id: 'pi_test', livemode: false, status: 'succeeded', capture_method: 'manual', amount: 1100,
  amount_received: 1100, currency: 'gbp', latest_charge: {id: 'ch_test', livemode: false, paid: true,
    captured: true, disputed: false, amount_refunded: 0}};
const body = new URLSearchParams({amount: '1000', currency: 'gbp', destination: 'acct_test', source_transaction: 'ch_test',
  transfer_group: 'dd_payout_release_test', 'metadata[driveDropPayoutId]': 'release_test',
  'metadata[paymentId]': 'pay_test', 'metadata[environment]': 'preview'}).toString();
const args = ['api.stripe.com', '443', '/v1/transfers', 'POST', {'Idempotency-Key': 'dd-payout-release_test'}, body, 'https', 12000];
let forwarded = 0, destroyed = 0, status = 200, responseHeaders;
const unitTransport = {getClientName: () => 'node', async makeRequest() {
  forwarded++;
  const incoming = new http.IncomingMessage(new Socket());
  incoming.destroy = () => {destroyed++; return incoming;};
  return {getStatusCode: () => status, getHeaders: () => responseHeaders || {'request-id': 'req_LocalUnit'},
    getRawResponse: () => incoming, toJSON: async () => ({id: 'tr_local'}), toStream: () => incoming};
}};
function unitReset() {reset(); transport = unitTransport; forwarded = 0; destroyed = 0; status = 200; responseHeaders = null;}
const factory = () => load()('src/lib/stripe-payout-response-loss-probe.ts').createPayoutResponseLossProbe;

(async () => {
  unitReset();
  const disabled = [
    ['missing configuration', () => delete process.env.DRIVEDROP_QA24_RESPONSE_LOSS],
    ['malformed configuration', () => process.env.DRIVEDROP_QA24_RESPONSE_LOSS = '{'],
    ['production', () => process.env.VERCEL_ENV = 'production'],
    ['wrong branch', () => process.env.VERCEL_GIT_COMMIT_REF = 'main'],
    ['wrong origin', () => process.env.STRIPE_CHECKOUT_ORIGIN = 'https://another.example'],
    ['connect paused', () => process.env.STRIPE_CONNECT_ENABLED = 'false'],
    ['refunds enabled', () => process.env.STRIPE_REFUNDS_ENABLED = 'true'],
  ];
  for (const [name, mutate] of disabled) {unitReset(); mutate(); assert.equal(factory()(structuredClone(original)), undefined, name);}
  for (const [name, changes] of [
    ['wrong platform', {platformId: 'acct_wrong'}], ['unknown field', {activate: true}],
    ['expired', {expiresAt: new Date(now - 1).toISOString()}],
    ['future arm', {armedAt: new Date(now + 300000).toISOString()}],
    ['overlong window', {expiresAt: new Date(now + 598001).toISOString()}],
    ['wrong payment', {paymentId: 'pay_another'}], ['wrong booking', {bookingId: 'book_another'}],
    ['wrong destination', {destinationAccountId: 'acct_another'}],
    ['wrong source', {sourceChargeId: 'ch_another'}],
  ]) {unitReset(); process.env.DRIVEDROP_QA24_RESPONSE_LOSS = JSON.stringify({...manifest, ...changes});
    assert.equal(factory()(structuredClone(original)), undefined, name);}
  for (const changes of [{attemptCount: 1}, {firstAttemptAt: new Date()}, {status: 'TRANSFERRED'},
    {amountPence: 999}, {paidPence: 1101}, {finePence: 1}, {refundedPence: 1}, {reversedPence: 1},
    {stripeTransferId: 'tr_old'}, {createdAt: new Date(now - 3000)}]) {
    unitReset(); assert.equal(factory()({...structuredClone(original), ...changes}), undefined);
  }
  reports.push({name: 'Inactive, mismatched, expired and subsequent-attempt guards', pass: true, cases: disabled.length + 9 + 10});
  for (const mutate of [
    p => p.currency = 'USD', p => p.provider = 'TEST', p => p.paidPence = 1200,
    p => p.platformFeePence = 99, p => p.refundedPence = 1, p => p.cancellationDeductionPence = 1,
    p => p.booking.customerConfirmedAt = new Date(), p => p.booking.status = 'IN_TRANSIT',
    p => p.booking.disputes = [{status: 'OPEN'}],
  ]) {
    unitReset(); const probe = factory()(structuredClone(original)); const p = structuredClone(payment); mutate(p);
    probe.arm(structuredClone(current), p, structuredClone(intent)); await probe.httpClient.makeRequest(...args);
    assert.equal(forwarded, 1); assert.equal(destroyed, 0); assert.equal(traces.length, 0);
  }
  unitReset(); let probe = factory()(structuredClone(original));
  probe.arm(structuredClone(current), structuredClone(payment), {...structuredClone(intent), livemode: true});
  await probe.httpClient.makeRequest(...args); assert.equal(destroyed, 0); assert.equal(traces.length, 0);
  reports.push({name: 'Natural hold, delivered state, accounting and canonical sandbox gates', pass: true, cases: 10});
  for (const mutate of [
    a => a[0] = 'another.example', a => a[1] = '80', a => a[2] = '/v1/refunds', a => a[3] = 'GET',
    a => a[4] = {'Idempotency-Key': 'new-key'}, a => a[4] = {...a[4], 'Stripe-Account': 'acct_other'},
    a => a[4] = {...a[4], 'Stripe-Account': 'acct_other', 'stripe-account': 'acct_second'},
    a => a[5] += '&amount=1000', a => a[5] = a[5].replace('amount=1000', 'amount=999'), a => a[6] = 'http',
  ]) {
    unitReset(); probe = factory()(structuredClone(original)); probe.arm(structuredClone(current), structuredClone(payment), structuredClone(intent));
    const a = structuredClone(args); mutate(a); await probe.httpClient.makeRequest(...a);
    assert.equal(forwarded, 1); assert.equal(destroyed, 0); assert.equal(traces.length, 0);
  }
  unitReset(); probe = factory()(structuredClone(original)); probe.arm(structuredClone(current), structuredClone(payment), structuredClone(intent));
  process.env.DRIVEDROP_QA24_RESPONSE_LOSS = ''; await probe.httpClient.makeRequest(...args); assert.equal(destroyed, 0);
  unitReset(); probe = factory()(structuredClone(original)); probe.arm(structuredClone(current), structuredClone(payment), structuredClone(intent));
  status = 500; await probe.httpClient.makeRequest(...args); assert.equal(destroyed, 0);
  unitReset(); probe = factory()(structuredClone(original)); probe.arm(structuredClone(current), structuredClone(payment), structuredClone(intent));
  responseHeaders = {}; await probe.httpClient.makeRequest(...args); assert.equal(destroyed, 0);
  reports.push({name: 'Only the exact authenticated transfer request and accepted response can be discarded', pass: true, cases: 13});
  unitReset(); probe = factory()(structuredClone(original)); probe.arm(structuredClone(current), structuredClone(payment), structuredClone(intent));
  await assert.rejects(probe.httpClient.makeRequest(...args), e => e.code === 'ECONNRESET');
  await probe.httpClient.makeRequest(...args); assert.equal(destroyed, 1); assert.equal(forwarded, 2);
  reports.push({name: 'One response discard per first-attempt client; second response forwarded', pass: true});

  reset();
  function databaseFixture() {
    const c = context({fine: 0});
    Object.assign(c.state().payment, {paidPence: 1100, platformFeePence: 100, transporterProceedsPence: 1000});
    Object.assign(c.intent, {amount: 1100, amount_received: 1100}); c.intent.latest_charge.amount = 1100;
    c.request.authorisedAmountPence = 1100;
    const createRow = c.db.stripePayout.create;
    c.db.stripePayout.create = async arg => {await createRow(arg); c.state().payout.reversedPence = 0; return structuredClone(c.state().payout);};
    return c;
  }
  let c = databaseFixture(), failReplay = false;
  const external = new Map(), posts = [], delivered = [];
  server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let content, replay = false;
    if (req.method === 'GET' && url.pathname === '/v1/account') content = {id: manifest.platformId, object: 'account'};
    else if (req.method === 'GET' && url.pathname === '/v1/payment_intents/pi_test') content = c.intent;
    else if (req.method === 'GET' && url.pathname === '/v1/transfers') content = {object: 'list', data: Array.from(external.values()), has_more: false};
    else if (req.method === 'GET' && url.pathname === '/v1/transfers/tr_QA24Local') content = Array.from(external.values())[0];
    else if (req.method === 'POST' && url.pathname === '/v1/transfers') {
      let data = ''; for await (const chunk of req) data += chunk;
      const idempotencyKey = req.headers['idempotency-key']; const params = new URLSearchParams(data);
      assert.equal(idempotencyKey, 'dd-payout-release_test'); assert.equal(params.get('amount'), '1000');
      assert.equal(params.get('destination'), 'acct_test');
      posts.push({key: idempotencyKey, bodySha256: createHash('sha256').update(data).digest('hex')});
      replay = external.has(idempotencyKey);
      if (!replay) external.set(idempotencyKey, {id: 'tr_QA24Local', object: 'transfer', livemode: false, amount: 1000,
        currency: 'gbp', amount_reversed: 0, destination: 'acct_test', source_transaction: 'ch_test',
        transfer_group: 'dd_payout_release_test', metadata: {driveDropPayoutId: 'release_test', paymentId: 'pay_test', environment: 'preview'}});
      content = external.get(idempotencyKey); // Provider fixture commits BEFORE sending response headers.
    } else {res.writeHead(500); res.end('Unexpected local request'); return;}
    if (req.method === 'POST' && replay && failReplay) {failReplay = false; req.socket.destroy(); return;}
    const data = JSON.stringify(content);
    res.writeHead(200, {'content-type': 'application/json', 'content-length': Buffer.byteLength(data),
      'request-id': `req_QA24Local${posts.length}`, ...(replay ? {'idempotent-replayed': 'true'} : {})});
    res.flushHeaders();
    setTimeout(() => {if (!res.destroyed) {if (req.method === 'POST') delivered.push(posts.length); res.end(data);}}, 15);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const native = Stripe.createNodeHttpClient();
  transport = {getClientName: () => 'node', makeRequest(host, p, route, method, headers, data, protocol, timeout) {
    assert.equal(host, 'api.stripe.com'); assert.equal(String(p), '443'); assert.equal(protocol, 'https');
    return native.makeRequest('127.0.0.1', String(port), route, method, headers, data, 'http', timeout);
  }};
  const engineFor = c => load({[path.join(root, 'src/lib/prisma.ts')]: {prisma: c.db},
    [path.join(root, 'src/lib/stripe-connect-accounts.ts')]: {syncConnectAccount: async () => structuredClone(c.account)},
    [path.join(root, 'src/lib/cancellation-fees.ts')]: {applyCancellationFeesToPayout: async ({proceedsPence}) => {
      c.state().reservations++; return {deductedPence: 0, netProceedsPence: proceedsPence};
    }},
  })('src/lib/stripe-payouts.ts');
  const engine = engineFor(c);
  const prepared = await engine.prepareStripePayout('pay_test', 'admin_fixture');
  await engine.reconcileStripePayout(prepared.id);
  assert.equal(posts.length, 2); assert.equal(new Set(posts.map(p => p.key)).size, 1);
  assert.equal(new Set(posts.map(p => p.bodySha256)).size, 1); assert.equal(external.size, 1);
  assert.equal(traces.filter(t => t.stage === 'response_discarded').length, 1);
  assert.equal(traces.filter(t => t.stage === 'transfer_response_headers' && t.idempotentReplayed).length, 1);
  assert.equal(traces.filter(t => t.stage === 'sdk_transfer_returned').length, 1);
  assert.equal(c.state().payout.status, 'TRANSFERRED'); assert.equal(c.state().payment.payoutStatus, 'PAID');
  assert.equal(c.state().events.length, 1); assert.equal(c.state().events[0].amountPence, 1000);
  assert.equal(c.state().reservations, 1); assert.equal(delivered.length, 1);
  await engine.reconcileStripePayout(prepared.id);
  assert.equal(posts.length, 2); assert.equal(c.state().events.length, 1); assert.equal(external.size, 1);
  reports.push({name: 'Actual SDK + loopback socket: accepted POST, lost first response, same-key replay, one transfer/event',
    pass: true, sdkVersion: Stripe.PACKAGE_VERSION, maxNetworkRetries: 0, posts: posts.length, providerObjects: external.size,
    deliveredBodies: delivered.length, ledgerEvents: c.state().events.length, database: 'explicit in-memory transaction fixture'});
  const happyTraces = [...traces];
  reset(); c = databaseFixture(); external.clear(); posts.length = 0; delivered.length = 0; failReplay = true;
  const retryEngine = engineFor(c);
  const retryPrepared = await retryEngine.prepareStripePayout('pay_test', 'admin_fixture');
  await retryEngine.reconcileStripePayout(retryPrepared.id);
  assert.equal(posts.length, 2); assert.equal(external.size, 1); assert.equal(c.state().events.length, 0);
  assert.equal(c.state().payout.status, 'RETRY'); assert.equal(c.state().payout.failureCode, 'RETRY_PENDING');
  assert(c.state().payout.firstAttemptAt instanceof Date); assert(c.state().payout.retryAfter instanceof Date);
  assert.equal(c.state().payout.leaseUntil, null);
  await retryEngine.reconcileStripePayout(retryPrepared.id);
  assert.equal(posts.length, 2); assert.equal(external.size, 1); assert.equal(c.state().events.length, 1);
  assert.equal(c.state().payout.status, 'TRANSFERRED'); assert.equal(c.state().payment.payoutStatus, 'PAID');
  reports.push({name: 'If the peer also drops the SDK retry, normal RETRY preserves first-attempt time and canonical recovery applies once',
    pass: true, posts: posts.length, providerObjects: external.size, ledgerEvents: c.state().events.length});
  const evidence = {scope: 'Offline proof only; real stripe-node and TCP transport; fake provider and in-memory database. No hosted gate claimed.',
    reports, happyTraces, retryFailureTraces: traces};
  if (process.env.QA24_REPORT) fs.writeFileSync(process.env.QA24_REPORT, JSON.stringify(evidence, null, 2));
  for (const r of reports) console.log(`PASS ${r.name}`);
})().catch(e => {console.error(e); process.exitCode = 1;}).finally(async () => {
  if (server) {server.closeAllConnections(); await new Promise(resolve => server.close(resolve));}
  for (const key of Object.keys(process.env)) delete process.env[key]; Object.assign(process.env, initialEnv);
});
