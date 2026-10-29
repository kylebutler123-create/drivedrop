const assert = require('node:assert/strict');
const fs = require('node:fs');
const swc = require('next/dist/build/swc');

function load(file, mocks, clock = Date) {
  const exports = {};
  const code = swc.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file, jsc: {parser: {syntax: 'typescript'}, target: 'es2022'}, module: {type: 'commonjs'},
  }).code;
  new Function('exports', 'require', 'Date', 'console', code)(exports,
    name => name in mocks ? mocks[name] : require(name), clock, {error() {}});
  return exports;
}

(async () => {
  let now = 0, selected, reconciled = [], notified = [], rotated = [];
  const rows = [1, 2, 3].map(id => ({id: String(id), status: 'CAPTURING', updatedAt: new Date(0)}));
  class Clock extends Date {static now() {return now;}}
  const worker = load('src/lib/booking-authorisation-recovery.ts', {
    './payment-recovery-heartbeat': {paymentRecoveryHeartbeatTarget: () => null},
    './payment-runtime': {assertProductionPaymentConfiguration: () => {}},
    './stripe-payouts': {recoverStripePayouts: async () => ({checked:0,failed:0})},
    './stripe-refunds': {recoverStripeRefunds: async () => ({checked:0,failed:0})},
    './prisma': {prisma: {availabilityRequest: {
      findMany: async args => {selected = args; return rows;},
      updateMany: async args => {rotated.push(args);},
    }}},
    './booking-authorisation-provider': {paymentEnvironment: () => 'preview'},
    './booking-authorisation': {reconcileRequest: async id => {
      reconciled.push(id);
      if (id === '1') throw new Error('temporary Stripe failure');
      return {status: 'BOOKED'};
    }},
    './availability-notifications': {notifyAvailability: async id => {notified.push(id); now += 46_000;}},
  }, Clock);
  assert.deepEqual(await worker.reconcileBookingAuthorisations(), {checked: 2, failed: 1});
  assert.equal(selected.where.paymentEnvironment, 'preview');
  assert.equal(selected.take, 10);
  assert.deepEqual(reconciled, ['1', '2']); // failure does not starve other work; time budget leaves row 3
  assert.deepEqual(notified, ['2']);
  assert.equal(rotated[0].where.updatedAt.getTime(), 0); // don't overwrite a concurrent transition

  let callbacks = [], completed = [], claims = 0, created = true, environment = 'preview';
  const route = load('src/app/api/cron/booking-authorisations/route.ts', {
    'next/server': {NextResponse: {json: (body, options) => Response.json(body, options)}, after: fn => callbacks.push(fn)},
    '@/lib/booking-authorisation-provider': {paymentEnvironment: () => environment},
    '@/lib/booking-authorisation-recovery': {
      claimPaymentRecoveryRun: async () => {if(environment==='production')throw Error('disabled');claims++; return {id: 'run-one', created};},
      completePaymentRecoveryRun: async id => completed.push(id),
      reconcileBookingAuthorisations: async () => ({checked: 1, failed: 1}),
    },
  });
  process.env.CRON_SECRET = 'test-only-secret';
  const request = (auth = true, dispatch = true) => new Request('https://preview.example/api/cron/booking-authorisations' + (dispatch ? '?dispatch=1' : ''), {
    headers: auth ? {authorization: 'Bearer test-only-secret'} : {},
  });
  assert.equal((await route.GET(request(false))).status, 403);
  assert.equal(claims, 0);
  environment = 'production';
  assert.equal((await route.GET(request())).status, 503);
  environment = 'preview';
  const accepted = await route.GET(request());
  assert.equal(accepted.status, 202);
  assert.deepEqual(await accepted.json(), {accepted: true, runId: 'run-one', reused: false});
  assert.deepEqual(completed, []); // acknowledgement is sent before payment work
  await callbacks[0]();
  assert.deepEqual(completed, ['run-one']);
  created = false;
  assert.equal((await (await route.GET(request())).json()).reused, true);
  assert.equal(callbacks.length, 1); // an active lease does not schedule another worker
  assert.equal((await route.GET(request(true, false))).status, 503);
  console.log('PASS: recovery authorization, preview isolation, background acknowledgement, lease reuse, failure continuation and time budget');
})().catch(error => {console.error(error); process.exitCode = 1;});
