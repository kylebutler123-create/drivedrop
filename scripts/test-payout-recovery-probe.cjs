// Offline behavioral checks. Every dependency that could access a provider or DB
// is replaced; this script never reads .env files or makes a network request.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const swc = require('next/dist/build/swc');
const root = path.resolve(__dirname, '..');
function loadApplication(mocks, logger = {info() {}, error() {}}) {
  const cache = {};
  function load(file) {
    file = path.resolve(root, file);
    if (file in mocks) return mocks[file];
    if (file in cache) return cache[file];
    const out = cache[file] = {};
    const code = swc.transformSync(fs.readFileSync(file, 'utf8'), {filename: file,
      jsc: {parser: {syntax: 'typescript'}, target: 'es2022'}, module: {type: 'commonjs'}}).code;
    new Function('exports', 'require', 'console', code)(out, name => {
      if (name in mocks) return mocks[name];
      if (name.startsWith('@/')) return load(path.join(root, 'src', name.slice(2) + '.ts'));
      if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name + '.ts'));
      return require(name);
    }, logger);
    return out;
  }
  return load;
}
const origin = 'https://drivedrop-git-feature-ui-polish-future-9f39.vercel.app';
function configurePreview() {
  Object.assign(process.env, {VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'feature/ui-polish',
    STRIPE_CHECKOUT_ORIGIN: origin, STRIPE_CONNECT_ENABLED: 'true', STRIPE_REFUNDS_ENABLED: 'false'});
  delete process.env.DRIVEDROP_QA23_PAYOUT_RECOVERY;
  global.fetch = async () => {throw Error('Network is forbidden in the offline QA23 test');};
}
module.exports = {loadApplication, configurePreview, origin};

if (require.main === module) (async () => {
  configurePreview();
  const now = Date.now(), logs = [];
  const manifest = {case: 'QA23', platformAccountId: 'acct_1US4BzLAzgkvCvrI', bookingId: 'book_qa23_offline',
    paymentId: 'pay_qa23_offline', destinationAccountId: 'acct_QA23Offline', paymentIntentId: 'pi_QA23Offline',
    sourceChargeId: 'ch_QA23Offline', armedAt: new Date(now - 1000).toISOString(), expiresAt: new Date(now + 540_000).toISOString()};
  const payout = {id: 'payout_qa23_offline', environment: 'preview', paymentId: manifest.paymentId,
    destinationAccountId: manifest.destinationAccountId, paymentIntentId: manifest.paymentIntentId, sourceChargeId: manifest.sourceChargeId,
    paidPence: 1100, grossPence: 1000, amountPence: 1000, finePence: 0, refundedPence: 0, status: 'PENDING',
    attemptCount: 0, firstAttemptAt: null, stripeTransferId: null, transferredAt: null, leaseUntil: null, retryAfter: null, createdAt: new Date(now)};
  const payment = {id: payout.paymentId, bookingId: manifest.bookingId, provider: 'STRIPE', providerReference: manifest.paymentIntentId,
    currency: 'GBP', status: 'PAID', payoutStatus: 'PROCESSING', paidPence: 1100, platformFeePence: 100,
    transporterProceedsPence: 1000, refundedPence: 0, cancellationDeductionPence: 0,
    booking: {status: 'DELIVERED', customerConfirmedAt: new Date(now - 25 * 3600_000), disputes: []}};
  const authorisation = {id: 'request_qa23_offline', bookingId: manifest.bookingId, paymentProvider: 'STRIPE',
    paymentEnvironment: 'preview', status: 'BOOKED', authorisedAmountPence: 1100, paymentIntentId: manifest.paymentIntentId};
  const intent = {id: manifest.paymentIntentId, livemode: false, capture_method: 'manual', status: 'succeeded',
    currency: 'gbp', amount: 1100, amount_received: 1100, metadata: {availabilityRequestId: authorisation.id, environment: 'preview'},
    latest_charge: {id: manifest.sourceChargeId, payment_intent: manifest.paymentIntentId, livemode: false, paid: true,
      captured: true, disputed: false, amount_refunded: 0, currency: 'gbp', amount: 1100}};
  let reads = 0, providerReads = 0, transferExists = false, providerError = false, workerWon = false;
  let activeRefund = null, eventCount = 0;
  const db = {
    bookingPayment: {findUniqueOrThrow: async () => {reads++; return structuredClone(payment);}},
    stripeRefund: {findUnique: async () => activeRefund}, financeEvent: {count: async () => eventCount},
    availabilityRequest: {findFirst: async () => structuredClone(authorisation)},
    stripePayout: {findUniqueOrThrow: async () => ({...payout, attemptCount: workerWon ? 1 : 0})},
  };
  const actualProvider = loadApplication({})('src/lib/stripe-connect-provider.ts');
  const load = loadApplication({
    [path.join(root, 'src/lib/prisma.ts')]: {prisma: db},
    [path.join(root, 'src/lib/stripe-connect-provider.ts')]: {...actualProvider, verifiedConnectClient: async () => {
      providerReads++; if (providerError) throw Error('synthetic provider failure');
      return {paymentIntents: {retrieve: async () => structuredClone(intent)},
        transfers: {list: async () => ({data: transferExists ? [{id: 'tr_offline'}] : [], has_more: false})}};
    }},
  }, {info: (...args) => logs.push(args), error() {}});
  const probe = load('src/lib/stripe-payout-recovery-probe.ts');
  const request = (headers = {origin}, url = origin) => new Request(url + '/api/admin/payments/payout', {method: 'POST', headers});
  const arm = (changes = {}) => {process.env.DRIVEDROP_QA23_PAYOUT_RECOVERY = JSON.stringify({...manifest, ...changes});};
  assert.equal(await probe.deferPayoutRecoveryProbe(payout, request({'x-qa23': JSON.stringify(manifest)})), false);
  assert.equal(reads + providerReads, 0); // no request-controlled activation
  for (const bad of ['', '{}', 'null', '[1]', 'bad-json', 'x'.repeat(2049)]) {
    process.env.DRIVEDROP_QA23_PAYOUT_RECOVERY = bad; assert.equal(probe.payoutRecoveryProbe(now), null);
  }
  for (const changes of [{case: 'QA22'}, {platformAccountId: 'acct_Other'}, {extra: true},
    {paymentId: ''}, {destinationAccountId: 'acct_bad/value'}, {armedAt: '2026-02-30T00:00:00Z'},
    {armedAt: new Date(now + 1000).toISOString()}, {expiresAt: new Date(now).toISOString()},
    {expiresAt: new Date(now + 600_000).toISOString()}, {expiresAt: manifest.armedAt}]) {
    arm(changes); assert.equal(probe.payoutRecoveryProbe(now), null, JSON.stringify(changes));
  }
  arm(); assert(probe.payoutRecoveryProbe(now));
  for (const [name, bad] of [['VERCEL_ENV', 'production'], ['VERCEL_ENV', 'development'], ['VERCEL_ENV', ''],
    ['VERCEL_GIT_COMMIT_REF', 'main'], ['STRIPE_CHECKOUT_ORIGIN', 'https://other.invalid'],
    ['STRIPE_CONNECT_ENABLED', 'false'], ['STRIPE_REFUNDS_ENABLED', 'true']]) {
    const old = process.env[name]; process.env[name] = bad;
    assert.equal(await probe.deferPayoutRecoveryProbe(payout, request()), false); process.env[name] = old;
  }
  assert.equal(reads + providerReads, 0);
  for (const changes of [{paymentId: 'other_payment'}, {environment: 'production'}, {destinationAccountId: 'acct_Other'},
    {paymentIntentId: 'pi_Other'}, {sourceChargeId: 'ch_Other'}, {paidPence: 1101}, {grossPence: 1001}, {amountPence: 1001},
    {finePence: 1}, {refundedPence: 1}, {status: 'RETRY'}, {attemptCount: 1}, {stripeTransferId: 'tr_Other'},
    {createdAt: new Date(now - 2000)}, {firstAttemptAt: new Date()}, {leaseUntil: new Date()}, {retryAfter: new Date()}]) {
    assert.equal(await probe.deferPayoutRecoveryProbe({...payout, ...changes}, request()), false);
  }
  assert.equal(reads + providerReads, 0);
  assert.equal(await probe.deferPayoutRecoveryProbe(payout, request({})), false);
  assert.equal(await probe.deferPayoutRecoveryProbe(payout, request({origin: 'https://wrong.invalid'})), false);
  assert.equal(await probe.deferPayoutRecoveryProbe(payout, request({origin}, 'https://wrong.invalid')), false);
  assert.equal(await probe.deferPayoutRecoveryProbe(payout, request()), true);
  for (const [name, bad] of [['bookingId', 'wrong_booking'], ['provider', 'TEST'], ['status', 'PENDING'],
    ['payoutStatus', 'PAID'], ['currency', 'USD'], ['providerReference', 'pi_Wrong'], ['paidPence', 1101],
    ['platformFeePence', 101], ['transporterProceedsPence', 999], ['refundedPence', 1], ['cancellationDeductionPence', 1]]) {
    const old = payment[name]; payment[name] = bad; assert.equal(await probe.deferPayoutRecoveryProbe(payout, request()), false); payment[name] = old;
  }
  const confirmed = payment.booking.customerConfirmedAt;
  for (const bad of [null, new Date(now - 23 * 3600_000)]) {
    payment.booking.customerConfirmedAt = bad; assert.equal(await probe.deferPayoutRecoveryProbe(payout, request()), false);
  }
  payment.booking.customerConfirmedAt = confirmed;
  payment.booking.disputes = [{id: 'resolved_override_not_permitted'}];
  assert.equal(await probe.deferPayoutRecoveryProbe(payout, request()), false); payment.booking.disputes = [];
  activeRefund = {id: 'reservation'}; assert.equal(await probe.deferPayoutRecoveryProbe(payout, request()), false); activeRefund = null;
  eventCount = 1; assert.equal(await probe.deferPayoutRecoveryProbe(payout, request()), false); eventCount = 0;
  intent.livemode = true; assert.equal(await probe.deferPayoutRecoveryProbe(payout, request()), false); intent.livemode = false;
  intent.latest_charge.livemode = true; assert.equal(await probe.deferPayoutRecoveryProbe(payout, request()), false); intent.latest_charge.livemode = false;
  intent.amount_received = 1099; assert.equal(await probe.deferPayoutRecoveryProbe(payout, request()), false); intent.amount_received = 1100;
  transferExists = true; assert.equal(await probe.deferPayoutRecoveryProbe(payout, request()), false); transferExists = false;
  providerError = true; assert.equal(await probe.deferPayoutRecoveryProbe(payout, request()), false); providerError = false;
  workerWon = true; assert.equal(await probe.deferPayoutRecoveryProbe(payout, request()), false); workerWon = false;
  logs.length = 0;
  probe.tracePayoutRecoveryProbe(payout, 'run-offline', 'worker_selected');
  assert.deepEqual(logs[0], ['QA23 payout recovery', {event: 'worker_selected', payoutId: payout.id, runId: 'run-offline', status: 'PENDING'}]);
  probe.tracePayoutRecoveryProbe({...payout, paymentId: 'another'}, 'run-offline', 'worker_selected');
  probe.tracePayoutRecoveryProbe(payout, undefined, 'worker_selected');
  process.env.VERCEL_ENV = 'production'; probe.tracePayoutRecoveryProbe(payout, 'run-offline', 'worker_selected');
  assert.equal(logs.length, 1);
  console.log('PASS: QA23 default-off, server-only selection, production/branch/origin isolation, strict 10-minute expiry, amount/source/hold/reservation guards, canonical test-mode checks, worker race and scoped trace');
})().catch(error => {console.error(error); process.exitCode = 1;});
