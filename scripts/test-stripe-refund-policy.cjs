const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const swc = require('next/dist/build/swc');
const cache = {};
function load(file) {
  file = path.resolve(__dirname, '..', file);
  if (cache[file]) return cache[file];
  const exports = cache[file] = {};
  const code = swc.transformSync(fs.readFileSync(file, 'utf8'), {filename: file,
    jsc: {parser: {syntax: 'typescript'}, target: 'es2022'}, module: {type: 'commonjs'}}).code;
  new Function('exports', 'require', code)(exports, name => name.startsWith('.') ? load(path.resolve(path.dirname(file), name) + '.ts') : require(name));
  return exports;
}
const {planStripeRefund: plan, assertStripeRefundMatches: match, refundCreateRetrySafe: retry, refundIdempotencyKey: key} = load('src/lib/stripe-refund-policy.ts');
const original = {id: 'pay_test', provider: 'STRIPE', providerReference: 'pi_test', currency: 'GBP', status: 'PAID',
  payoutStatus: 'READY', paidPence: 11000, refundedPence: 0, platformFeePence: 1000, transporterProceedsPence: 10000, cancellationDeductionPence: 0};
const request = amountPence => ({amountPence, expectedRefundedPence: 0, environment: 'preview'});
const release = {paymentId: original.id, environment: 'preview', paymentIntentId: 'pi_test', status: 'TRANSFERRED',
  amountPence: 7500, finePence: 2500, reversedPence: 0, stripeTransferId: 'tr_test'};
const fined = {...original, payoutStatus: 'PAID', transporterProceedsPence: 7500, cancellationDeductionPence: 2500};

let result = plan(original, request(5500));
assert.deepEqual([result.platformFeePence, result.transporterProceedsPence, result.recoveryPence], [500, 5000, 0]);
result = plan(original, request(11000));
assert.equal(result.fullyRefunded, true); assert.equal(result.transporterProceedsPence, 0);
result = plan(fined, request(5500), release);
assert.deepEqual([result.platformFeePence, result.transporterProceedsPence, result.cancellationDeductionPence, result.fineRestorePence, result.recoveryPence], [500, 2500, 2500, 0, 5000]);
result = plan(fined, request(9900), release);
assert.deepEqual([result.platformFeePence, result.transporterProceedsPence, result.cancellationDeductionPence, result.fineRestorePence, result.recoveryPence], [100, 0, 1000, 1500, 7500]);
result = plan(fined, request(11000), release);
assert.deepEqual([result.cancellationDeductionPence, result.fineRestorePence, result.recoveryPence], [0, 2500, 7500]);

// A later partial refund only recovers the additional entitlement reduction.
const afterFirst = {...fined, status: 'PARTIALLY_REFUNDED', refundedPence: 5500, platformFeePence: 500, transporterProceedsPence: 2500};
result = plan(afterFirst, {...request(2750), expectedRefundedPence: 5500}, {...release, reversedPence: 5000, status: 'REVERSED'});
assert.deepEqual([result.refundedPence, result.platformFeePence, result.transporterProceedsPence, result.recoveryPence, result.fineRestorePence], [8250, 250, 0, 2500, 0]);
result = plan(fined, request(5500), {...release, status: 'REVERSED', reversedPence: 7500});
assert.equal(result.recoveryPence, 0); assert.equal(result.excessReversedPence, 2500); assert.equal(result.recoveryStatus, 'REVIEW');
result = plan({...fined, transporterProceedsPence: 0, cancellationDeductionPence: 10000}, request(5500),
  {...release, status: 'DEDUCTED', amountPence: 0, finePence: 10000, stripeTransferId: null});
assert.deepEqual([result.recoveryPence, result.fineRestorePence, result.cancellationDeductionPence], [0, 5000, 5000]);

for (const amount of [0, -1, 11001, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER]) assert.throws(() => plan(original, request(amount)));
for (const change of [{provider: 'TEST'}, {currency: 'USD'}, {providerReference: null}, {platformFeePence: 1001},
  {status: 'REFUNDED'}, {payoutStatus: 'PAID'}, {payoutStatus: 'PROCESSING'}, {payoutStatus: 'FAILED'}, {cancellationDeductionPence: 1}]) assert.throws(() => plan({...original, ...change}, request(1)));
assert.throws(() => plan(original, {...request(1), expectedRefundedPence: 1}));
assert.equal(plan(original, {...request(1), environment: 'production'}).amountPence, 1);
assert.throws(() => plan(original, {...request(1), environment: 'staging'}));
for (const change of [{paymentId:'other'}, {environment:'production'}, {paymentIntentId:'pi_other'}, {reversedPence:7501},
  {status:'PENDING'}, {status:'RETRY'}, {status:'BLOCKED'}, {stripeTransferId:null}, {finePence:0}]) assert.throws(() => plan(fined, request(1), {...release, ...change}));

// Conservation and monotonicity across full, partial, small and near-limit values.
for (const paid of [1, 2, 3, 11, 101, 11000, 2147483647]) {
  const fee = Math.floor(paid / 11), gross = paid - fee;
  for (const fine of [0, Math.floor(gross / 2), gross]) {
    const p = {...original, paidPence: paid, platformFeePence: fee, transporterProceedsPence: gross-fine, cancellationDeductionPence: fine, payoutStatus:'PAID'};
    const r = {...release, amountPence:gross-fine, finePence:fine, status:gross===fine?'DEDUCTED':'TRANSFERRED', stripeTransferId:gross===fine?null:'tr_test'};
    for (const amount of [...new Set([1, Math.max(1, Math.floor(paid/2)), paid])]) {
      const n=plan(p,request(amount),r);
      assert.equal(n.platformFeePence+n.transporterProceedsPence+n.cancellationDeductionPence,paid-amount);
      assert.equal(n.cancellationDeductionPence+n.fineRestorePence,fine);
      assert.equal(n.transporterProceedsPence+n.recoveryPence,r.amountPence);
      assert(n.platformFeePence<=fee && n.transporterProceedsPence<=p.transporterProceedsPence);
    }
  }
}
const identity={id:'refund_test',paymentId:'pay_test',environment:'preview',paymentIntentId:'pi_test',sourceChargeId:'ch_test',amountPence:5500};
const refund={id:'re_test',amount:5500,currency:'gbp',status:'succeeded',charge:'ch_test',payment_intent:'pi_test',metadata:{driveDropRefundId:'refund_test',paymentId:'pay_test',environment:'preview'}};
assert.equal(match(refund,identity).confirmed,true);
for(const status of ['pending','requires_action','failed','canceled'])assert.equal(match({...refund,status},identity).confirmed,false);
for(const change of [{amount:5501},{currency:'usd'},{charge:'ch_other'},{payment_intent:'pi_other'},{status:'unknown'},{metadata:{...refund.metadata,environment:'production'}}])assert.throws(()=>match({...refund,...change},identity));
assert.equal(match({...refund,charge:{id:'ch_test'},payment_intent:{id:'pi_test'}},identity).confirmed,true);
assert.equal(key(identity),'dd-refund-preview-refund_test'); assert.equal(key({...identity,environment:'production'}),'dd-refund-production-refund_test'); assert.throws(()=>key({...identity,environment:'staging'}));
const now=Date.now();assert(retry(null,now));assert(retry(new Date(now-22*3600000),now));assert(!retry(new Date(now-23*3600000),now));assert(!retry(new Date(now+1),now));assert(!retry(new Date('invalid'),now));
console.log('Stripe refund policy: amount conservation, fines, sequential recovery, stale requests, canonical matches and retry limits passed.');
