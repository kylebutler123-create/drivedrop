const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const swc = require('next/dist/build/swc');
const root = path.resolve(__dirname, '..');
process.env.VERCEL_ENV = 'preview';
process.env.STRIPE_CONNECT_ENABLED = 'true';
const clone = value => structuredClone(value);
function loader(mocks = {}) {
  const cache = {};
  function load(file) {
    file = path.resolve(root, file);
    if (mocks[file]) return mocks[file];
    if (cache[file]) return cache[file];
    const exports = cache[file] = {};
    const code = swc.transformSync(fs.readFileSync(file, 'utf8'), {filename: file,
      jsc: {parser: {syntax: 'typescript', tsx: file.endsWith('tsx')}, target: 'es2022'}, module: {type: 'commonjs'}}).code;
    new Function('exports', 'require', 'console', code)(exports, name => {
      if (name.startsWith('.') || name.startsWith('@/')) {
        const target = name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : path.resolve(path.dirname(file), name);
        return load(target + '.ts');
      }
      return mocks[name] || require(name);
    }, {error() {}});
    return exports;
  }
  return load;
}
const basic = loader();
const policy = basic('src/lib/stripe-payout-policy.ts');
const provider = basic('src/lib/stripe-connect-provider.ts');
const at = new Date(Date.now() - 25 * 3600000);
function fixture() {
  return {id: 'pay_test', bookingId: 'book_test', provider: 'STRIPE', providerReference: 'pi_test', currency: 'GBP',
    status: 'PAID', payoutStatus: 'READY', paidPence: 11000, refundedPence: 0, platformFeePence: 1000,
    transporterProceedsPence: 10000, cancellationDeductionPence: 0, events: [],
    booking: {id: 'book_test', status: 'DELIVERED', transporterId: 'transporter_test', customerConfirmedAt: at,
      disputes: [], trackingEvents: [{createdAt: at}]}};
}
function context(options = {}) {
  let state = {payment: fixture(), payout: null, events: [], reservations: 0};
  const external = [], keys = [], attempts = [];
  let transactionTail = Promise.resolve(), loseCommit = !!options.loseCommit, timeoutOnce = !!options.timeoutOnce, failOnce = !!options.failOnce;
  const request = {id: 'request_test', bookingId: 'book_test', paymentIntentId: 'pi_test', paymentProvider: 'STRIPE', paymentEnvironment: 'preview', authorisedAmountPence:11000, status: 'BOOKED'};
  const intent = {id: 'pi_test', livemode: false, capture_method:'manual', status: 'succeeded', currency: 'gbp', amount: 11000, amount_received: 11000,
    metadata: {availabilityRequestId: 'request_test', environment: 'preview'}, latest_charge: {id: 'ch_test', payment_intent: 'pi_test', livemode: false, paid: true, captured: true, disputed: false, amount: 11000, amount_refunded: 0, currency: 'gbp'}};
  const account = {id: 'connect_test', stripeAccountId: 'acct_test', environment: 'preview', transfersEnabled: true, payoutsEnabled: true};
  const update = (row, data) => {
    for (const [key, value] of Object.entries(data)) row[key] = value && typeof value === 'object' && 'increment' in value ? row[key] + value.increment : value;
    row.updatedAt = new Date(); return clone(row);
  };
  const getPayout = args => state.payout ? {...clone(state.payout), ...(args?.include ? {payment: {bookingId: 'book_test'}} : {})} : null;
  const db = {
    $queryRaw: async () => [],
    bookingPayment: {findUniqueOrThrow: async () => clone(state.payment), update: async ({data}) => update(state.payment, data)},
    availabilityRequest: {findFirst: async () => clone(request)},
    stripeConnectAccount: {findUnique: async () => clone(account)},
    stripePayout: {
      findUnique: async args => getPayout(args), findUniqueOrThrow: async args => {assert(state.payout); return getPayout(args);},
      findMany: async () => state.payout ? [clone(state.payout)] : [],
      create: async ({data}) => {assert.equal(state.payout, null); state.payout = {id: 'release_test', ...data, status: 'PENDING', firstAttemptAt: null, stripeTransferId: null, transferredAt: null, leaseUntil: null, attemptCount: 0, createdAt: new Date(), updatedAt: new Date()}; return clone(state.payout);},
      update: async ({data}) => update(state.payout, data),
      updateMany: async ({where, data}) => {
        if (where.firstAttemptAt === null && state.payout.firstAttemptAt) return {count: 0};
        if (where.OR && state.payout.leaseUntil && state.payout.leaseUntil >= new Date()) return {count: 0};
        update(state.payout, data); return {count: 1};
      },
    },
    financeEvent: {create: async ({data}) => {state.events.push(data); return data;}},
  };
  db.$transaction = async fn => {
    let unlock; const previous = transactionTail; transactionTail = new Promise(resolve => unlock = resolve); await previous;
    const snapshot = clone(state);
    try { const result = await fn(db); if (loseCommit && state.payout?.status === 'TRANSFERRED') {loseCommit = false; throw new Error('DB connection lost at commit');} return result; }
    catch (e) {state = snapshot; throw e;} finally {unlock();}
  };
  const stripe = {paymentIntents: {retrieve: async () => clone(intent)}, transfers: {
    list: async () => ({data: clone(external), has_more: false}),
    retrieve: async id => clone(external.find(t => t.id === id)),
    create: async (params, opts) => {
      attempts.push(clone(params)); keys.push(opts.idempotencyKey);
      if (failOnce) {failOnce = false; throw new Error('Network unavailable');}
      let transfer = external.find(t => t._key === opts.idempotencyKey);
      if (!transfer) {transfer = {id: 'tr_test', livemode: false, amount_reversed: 0, ...clone(params), _key: opts.idempotencyKey}; external.push(transfer);}
      if (timeoutOnce) {timeoutOnce = false; throw new Error('Response lost after Stripe commit');}
      return clone(transfer);
    },
  }};
  const mocks = {
    [path.join(root, 'src/lib/prisma.ts')]: {prisma: db},
    [path.join(root, 'src/lib/stripe-connect-provider.ts')]: {...provider, verifiedConnectClient: async () => stripe},
    [path.join(root, 'src/lib/stripe-connect-accounts.ts')]: {syncConnectAccount: async () => clone(account)},
    [path.join(root, 'src/lib/cancellation-fees.ts')]: {applyCancellationFeesToPayout: async ({proceedsPence}) => {
      state.reservations++; const deductedPence = options.fine ?? 2500;
      return {deductedPence, netProceedsPence: proceedsPence - deductedPence};
    }},
  };
  return {engine: loader(mocks)('src/lib/stripe-payouts.ts'), state: () => state, external, keys, attempts, intent, request, account, db};
}
(async () => {
  const p = fixture();
  policy.assertPayoutEligible(p);
  for (const mutate of [p => p.booking.customerConfirmedAt = new Date(), p => p.booking.status = 'IN_TRANSIT', p => p.booking.disputes.push({id: 'd', status: 'OPEN'}), p => p.transporterProceedsPence++, p => p.status = 'PENDING', p => p.currency = 'USD']) {
    const bad = clone(p); mutate(bad); assert.throws(() => policy.assertPayoutEligible(bad));
  }
  const override = clone(p); override.booking.customerConfirmedAt = null; override.booking.disputes.push({id: 'd', status: 'RESOLVED', resolution: 'RELEASE_PAYOUT'}); policy.assertPayoutEligible(override);
  override.booking.disputes.push({id: 'second', status: 'UNDER_REVIEW'}); assert.throws(() => policy.assertPayoutEligible(override));
  assert.equal(policy.payoutRetrySafe(new Date(Date.now() - 24 * 3600000)), false);
  let c = context();
  const release = await Promise.all([c.engine.prepareStripePayout('pay_test', 'admin'), c.engine.prepareStripePayout('pay_test', 'admin')]);
  assert.equal(release[0].id, release[1].id); assert.equal(c.state().reservations, 1);
  assert.equal(c.state().payment.payoutStatus, 'PROCESSING'); assert.equal(c.state().payment.transporterProceedsPence, 7500);
  await Promise.all([c.engine.reconcileStripePayout(release[0].id), c.engine.reconcileStripePayout(release[0].id)]);
  assert.equal(c.external.length, 1); assert.equal(c.external[0].amount, 7500); assert.equal(c.external[0].source_transaction, 'ch_test');
  assert.equal(c.state().payment.payoutStatus, 'PAID'); assert.equal(c.state().events.length, 1);
  await c.engine.reconcileStripePayout(release[0].id); assert.equal(c.state().events.length, 1); assert.equal(c.external.length, 1);
  for (const failure of ['timeoutOnce', 'loseCommit', 'failOnce']) {
    c = context({[failure]: true}); const row = await c.engine.prepareStripePayout('pay_test', 'admin');
    await c.engine.reconcileStripePayout(row.id); assert.equal(c.state().payment.payoutStatus, 'FAILED'); assert.equal(c.state().events.length, 0);
    await c.engine.reconcileStripePayout(row.id); assert.equal(c.state().payment.payoutStatus, 'PAID');
    assert.equal(c.external.length, 1); assert.equal(c.state().reservations, 1); assert.equal(c.state().events.length, 1); assert.equal(new Set(c.keys).size, 1);
  }
  c = context({fine: 10000}); await c.engine.prepareStripePayout('pay_test', 'admin'); await c.engine.reconcileStripePayout('release_test');
  assert.equal(c.external.length, 0); assert.equal(c.state().payout.status, 'DEDUCTED'); assert.equal(c.state().events[0].amountPence, 0);
  c = context(); await c.engine.prepareStripePayout('pay_test', 'admin'); c.state().payment.booking.disputes.push({id: 'new', status: 'OPEN'}); await c.engine.reconcileStripePayout('release_test');
  assert.equal(c.external.length, 0); assert.equal(c.state().payment.payoutStatus, 'HELD'); assert.equal(c.state().payout.status, 'BLOCKED');
  c = context(); await c.engine.prepareStripePayout('pay_test', 'admin'); c.state().payout.firstAttemptAt = new Date(Date.now() - 24 * 3600000); await c.engine.reconcileStripePayout('release_test');
  assert.equal(c.attempts.length, 0); assert.equal(c.state().payout.status, 'REVIEW'); assert.equal(c.state().payout.failureCode, 'STALE_ATTEMPT');
  for (const mutate of [i => i.livemode = true, i => i.latest_charge.disputed = true, i => i.latest_charge.amount_refunded = 100, i => i.metadata.environment = 'production', i => i.amount_received--]) {
    c = context(); mutate(c.intent); await assert.rejects(() => c.engine.prepareStripePayout('pay_test', 'admin')); assert.equal(c.state().payout, null); assert.equal(c.state().reservations, 0);
  }
  c = context(); c.account.payoutsEnabled = false; await assert.rejects(() => c.engine.prepareStripePayout('pay_test', 'admin')); assert.equal(c.state().reservations, 0);
  c = context(); await c.engine.prepareStripePayout('pay_test', 'admin'); await c.engine.reconcileStripePayout('release_test'); c.external[0].amount_reversed = 7500; await c.engine.reconcileStripePayout('release_test');
  assert.equal(c.state().payout.status, 'REVERSED'); assert.equal(c.state().payment.payoutStatus, 'HELD'); assert.equal(c.state().events.length, 1); assert.equal(c.external.length, 1);
  for (const env of ['production', 'preview']) { process.env.VERCEL_ENV = env; assert.equal(provider.connectEnabled(), env === 'preview'); }
  process.env.STRIPE_CONNECT_SECRET_KEY = 'sk_test_disallowed'; assert.throws(() => provider.connectClient(), /restricted/);
  process.env.STRIPE_CONNECT_SECRET_KEY = 'rk_live_disallowed'; assert.throws(() => provider.connectClient(), /restricted/);
  assert.throws(() => provider.safeStripeRedirect('https://evil.example/stripe')); assert.throws(() => provider.safeStripeRedirect('http://connect.stripe.com/'));
  assert.equal(provider.safeStripeRedirect('https://connect.stripe.com/setup/test'), 'https://connect.stripe.com/setup/test');
  const readiness = loader({[path.join(root, 'src/lib/prisma.ts')]: {prisma: {}}})('src/lib/stripe-connect-accounts.ts').accountReadiness;
  const readyAccount = {livemode:false,closed:false,dashboard:'express',metadata:{driveDropUserId:'user',environment:'preview'},defaults:{responsibilities:{fees_collector:'application',losses_collector:'application'}},configuration:{recipient:{capabilities:{stripe_balance:{stripe_transfers:{status:'active'},payouts:{status:'active'}}}}},requirements:{entries:[]}};
  assert.equal(readiness(readyAccount,'user').status,'READY');
  const restricted=clone(readyAccount);restricted.configuration.recipient.capabilities.stripe_balance.payouts.status='restricted';assert.equal(readiness(restricted,'user').payoutsEnabled,false);
  assert.throws(()=>readiness(readyAccount,'another-user')); assert.throws(()=>readiness({...readyAccount,livemode:true},'user')); assert.throws(()=>readiness({...readyAccount,closed:true},'user'));
  let actor=null, callbacks=[], prepared=0;
  const payoutRoute=loader({
    'next/server':{NextResponse:{json:Response.json},after:fn=>callbacks.push(fn)},
    [path.join(root,'src/lib/auth.ts')]:{currentUser:async()=>actor},
    [path.join(root,'src/lib/prisma.ts')]:{prisma:{bookingPayment:{findUnique:async()=>({provider:'STRIPE'})}}},
    [path.join(root,'src/lib/stripe-payouts.ts')]:{prepareStripePayout:async()=>{prepared++;return{id:'release',status:'PENDING'}},reconcileStripePayout:async()=>{}},
    [path.join(root,'src/lib/notifications.ts')]:{},
  })('src/app/api/admin/payments/payout/route.ts');
  const releaseRequest=()=>new Request('https://preview.example/api/admin/payments/payout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({paymentId:'pay'})});
  assert.equal((await payoutRoute.POST(releaseRequest())).status,403);
  actor={role:'TRANSPORTER',id:'user'};assert.equal((await payoutRoute.POST(releaseRequest())).status,403);assert.equal(prepared,0);
  actor={role:'ADMIN',id:'admin',accountStatus:'ACTIVE'};const accepted=await payoutRoute.POST(releaseRequest());assert.equal(accepted.status,202);assert.equal((await accepted.json()).payoutStatus,'PROCESSING');assert.equal(callbacks.length,1);
  process.env.VERCEL_ENV='production';assert.equal((await payoutRoute.POST(releaseRequest())).status,403);process.env.VERCEL_ENV='preview';
  const hook=loader({'next/server':{NextResponse:{json:Response.json}},[path.join(root,'src/lib/stripe-connect-provider.ts')]:{connectEnabled:()=>true,connectClient:()=>({webhooks:{constructEvent:()=>{throw Error('unsigned')}}})},[path.join(root,'src/lib/stripe-connect-events.ts')]:{handleConnectSnapshot:()=>{throw Error('must not process')}}})('src/app/api/stripe/connect/webhook/route.ts');
  assert.equal((await hook.POST(new Request('https://preview.example/webhook',{method:'POST',body:'{}'}))).status,400);
  let bankWrite, syncs=0;
  const bankEvents=loader({[path.join(root,'src/lib/prisma.ts')]:{prisma:{stripeConnectAccount:{findFirst:async()=>({id:'connect',stripeAccountId:'acct_test'}),updateMany:async args=>{bankWrite=args;return{count:1}}}}},[path.join(root,'src/lib/stripe-connect-provider.ts')]:{...provider,connectClient:()=>({payouts:{retrieve:async()=>({id:'po_test',livemode:false,status:'failed',created:100})}})},[path.join(root,'src/lib/stripe-connect-accounts.ts')]:{syncConnectAccount:async()=>{syncs++}},[path.join(root,'src/lib/stripe-payouts.ts')]:{reconcileStripePayout:async()=>{throw Error('bank failure must not send a second booking transfer')}}})('src/lib/stripe-connect-events.ts');
  await bankEvents.handleConnectSnapshot({livemode:false,type:'payout.paid',account:'acct_test',data:{object:{id:'po_test',status:'paid'}}});
  assert.equal(bankWrite.data.lastBankPayoutStatus,'failed');assert.equal(syncs,1); // canonical status wins over stale webhook
  await assert.rejects(()=>bankEvents.handleConnectSnapshot({livemode:true,type:'payout.failed'}));
  console.log('PASS: Connect release gates, concurrency, fixed fine reservation, single transfer, network/commit recovery, zero-net payout, new dispute, stale retry, canonical source checks, account readiness, reversal, environment and redirect guards');
})().catch(error => {console.error(error); process.exitCode = 1;});
