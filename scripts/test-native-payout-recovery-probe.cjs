// Real PostgreSQL and real route/preparation/recovery/accounting code, with an
// explicitly offline Stripe boundary. This is not hosted Stripe or browser proof.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const {execFileSync} = require('node:child_process');
const {PrismaClient} = require('@prisma/client');
const {nativeDatabaseUrl} = require('./native-payment-rehearsal.cjs');
const {loadApplication, configurePreview, origin} = require('./test-payout-recovery-probe.cjs');
const url = nativeDatabaseUrl(); // validates loopback, explicit port and disposable name BEFORE connecting
const root = path.resolve(__dirname, '..');
const clients = [0, 1].map(() => new PrismaClient({datasources: {db: {url: url + '?connection_limit=1'}}}));
const [a, b] = clients;
configurePreview();
process.env.CRON_SECRET = 'qa23-offline-only';
process.env.TRANSACTIONAL_EMAILS_ENABLED = 'false';
const callbacks = [], traces = [], intents = new Map(), transfers = [], transferKeys = [], passed = [];
let actor = null, refundScans = 0;
const pass = name => {passed.push(name); console.log('PASS: ' + name);};
const stripe = {
  paymentIntents: {retrieve: async id => {assert(intents.has(id)); return structuredClone(intents.get(id));}},
  transfers: {
    list: async ({transfer_group, limit}) => {
      const rows = transfers.filter(t => t.transfer_group === transfer_group);
      return {data: structuredClone(rows.slice(0, limit)), has_more: rows.length > limit};
    },
    retrieve: async id => {const row = transfers.find(t => t.id === id); assert(row); return structuredClone(row);},
    create: async (data, {idempotencyKey}) => {
      transferKeys.push(idempotencyKey);
      let row = transfers.find(t => t.key === idempotencyKey);
      if (!row) {row = {id: `tr_QA23Offline${transfers.length}`, livemode: false, amount_reversed: 0, ...data, key: idempotencyKey}; transfers.push(row);}
      return structuredClone(row);
    },
  },
};
const actualProvider = loadApplication({})('src/lib/stripe-connect-provider.ts');
function application(db) {
  return loadApplication({
    'next/server': {NextResponse: {json: Response.json}, after: fn => callbacks.push(fn)},
    [path.join(root, 'src/lib/prisma.ts')]: {prisma: db},
    [path.join(root, 'src/lib/auth.ts')]: {currentUser: async () => actor},
    [path.join(root, 'src/lib/stripe-connect-provider.ts')]: {...actualProvider, verifiedConnectClient: async () => stripe},
    [path.join(root, 'src/lib/stripe-connect-accounts.ts')]: {syncConnectAccount: async id => db.stripeConnectAccount.findUniqueOrThrow({where: {id}})},
    [path.join(root, 'src/lib/booking-authorisation.ts')]: {reconcileRequest: async () => {throw Error('Unexpected authorization fixture');}},
    [path.join(root, 'src/lib/availability-notifications.ts')]: {notifyAvailability: async () => {throw Error('No external notification allowed');}},
    [path.join(root, 'src/lib/notifications.ts')]: {createNotificationSafely: async () => {throw Error('No notification expected');}},
    [path.join(root, 'src/lib/stripe-refunds.ts')]: {recoverStripeRefunds: async () => {refundScans++; return {checked: 0, failed: 0};}},
  }, {info: (...args) => traces.push(args), error: (...args) => traces.push(args)});
}
const [appA, appB] = clients.map(application);
const routes = [appA, appB].map(load => load('src/app/api/admin/payments/payout/route.ts'));
const cron = appA('src/app/api/cron/booking-authorisations/route.ts');
const request = (paymentId, requestOrigin = origin) => new Request(origin + '/api/admin/payments/payout', {
  method: 'POST', headers: {'content-type': 'application/json', origin: requestOrigin}, body: JSON.stringify({paymentId}),
});
async function fixture(label) {
  const customer = await a.user.create({data: {name: 'Offline customer', email: `${label}-customer@example.invalid`, role: 'CUSTOMER', passwordHash: 'not-a-password'}});
  const transporter = await a.user.create({data: {name: 'Offline transporter', email: `${label}-transporter@example.invalid`, role: 'TRANSPORTER', passwordHash: 'not-a-password'}});
  const job = await a.transportJob.create({data: {customerId: customer.id, collection: 'Synthetic collection', delivery: 'Synthetic delivery',
    vehicleMake: 'QA23', vehicleModel: 'OFFLINE ONLY', collectionDate: new Date(), status: 'BOOKED'}});
  const quote = await a.quote.create({data: {jobId: job.id, transporterId: transporter.id, pricePence: 1000, status: 'ACCEPTED'}});
  // Local fixture time only. Hosted QA23 must wait through the real 24-hour hold.
  const booking = await a.booking.create({data: {jobId: job.id, quoteId: quote.id, customerId: customer.id,
    transporterId: transporter.id, agreedPricePence: 1100, status: 'DELIVERED', customerConfirmedAt: new Date(Date.now() - 25 * 3600_000)}});
  const intentId = `pi_QA23${label}`, chargeId = `ch_QA23${label}`;
  const payment = await a.bookingPayment.create({data: {bookingId: booking.id, provider: 'STRIPE', providerReference: intentId,
    currency: 'GBP', transportValuePence: 1000, depositPence: 1100, platformFeePence: 100, transporterProceedsPence: 1000,
    remainingBalancePence: 0, paidPence: 1100, status: 'PAID', payoutStatus: 'READY'}});
  const auth = await a.availabilityRequest.create({data: {jobId: job.id, quoteId: quote.id, customerId: customer.id, transporterId: transporter.id,
    bookingId: booking.id, status: 'BOOKED', pricePence: 1100, collectionDate: new Date(), respondBy: new Date(),
    paymentProvider: 'STRIPE', paymentState: 'CAPTURED', paymentEnvironment: 'preview', paymentIntentId: intentId, authorisedAmountPence: 1100}});
  const account = await a.stripeConnectAccount.create({data: {userId: transporter.id, environment: 'preview', stripeAccountId: `acct_QA23${label}`,
    status: 'READY', transfersEnabled: true, payoutsEnabled: true, requirementsDue: false, creationEmail: transporter.email, creationName: transporter.name}});
  intents.set(intentId, {id: intentId, livemode: false, capture_method: 'manual', status: 'succeeded', currency: 'gbp', amount: 1100, amount_received: 1100,
    metadata: {availabilityRequestId: auth.id, environment: 'preview'}, latest_charge: {id: chargeId, payment_intent: intentId,
      livemode: false, paid: true, captured: true, disputed: false, amount_refunded: 0, currency: 'gbp', amount: 1100}});
  return {booking, payment, account, intentId, chargeId};
}
async function dispatch() {
  const before = callbacks.length;
  const response = await cron.GET(new Request(origin + '/api/cron/booking-authorisations?dispatch=1', {headers: {authorization: 'Bearer qa23-offline-only'}}));
  assert.equal(response.status, 202);
  const body = await response.json(); assert.equal(body.reused, false);
  assert.equal(callbacks.length, before + 1);
  await callbacks.pop()();
  const [row] = await a.$queryRaw`SELECT * FROM drivedrop_preview_ops.booking_authorisation_runs WHERE id=${body.runId}`;
  return row;
}
(async () => {
  const [{version}] = await a.$queryRaw`SELECT version()`;
  assert(version.startsWith('PostgreSQL 17.11 '));
  const pids = await Promise.all(clients.map(db => db.$queryRaw`SELECT pg_backend_pid() AS pid`));
  assert.notEqual(pids[0][0].pid, pids[1][0].pid);
  assert.equal(await a.user.count(), 0, 'The QA23 database must be empty');
  execFileSync('psql', ['-X', '-v', 'ON_ERROR_STOP=1', url], {encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], input:
    `CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA drivedrop_preview_ops;\n` +
    fs.readFileSync(path.join(root, 'scripts/sql/preview-payment-recovery-runs.sql'), 'utf8')});
  pass('Two native PostgreSQL 17.11 connections and the real preview run table in a disposable loopback database');
  const normal = await fixture('Normal');
  assert.equal((await routes[0].POST(request(normal.payment.id))).status, 403);
  actor = {id: 'offline_transporter', role: 'TRANSPORTER', accountStatus: 'ACTIVE'};
  assert.equal((await routes[0].POST(request(normal.payment.id))).status, 403);
  actor = await a.user.create({data: {name: 'Offline admin', email: 'qa23-admin@example.invalid', role: 'ADMIN', passwordHash: 'not-a-password'}});
  assert.equal((await routes[0].POST(request(normal.payment.id, 'https://wrong.invalid'))).status, 403);
  await a.booking.update({where: {id: normal.booking.id}, data: {customerConfirmedAt: new Date()}});
  assert.equal((await routes[0].POST(request(normal.payment.id))).status, 400);
  assert.equal(await a.stripePayout.count(), 0); assert.equal(callbacks.length, 0); assert.equal(transfers.length, 0);
  pass('Real administrator/origin/24-hour eligibility checks reject before an instruction or transfer exists');
  await a.booking.update({where: {id: normal.booking.id}, data: {customerConfirmedAt: normal.booking.customerConfirmedAt}});
  assert.equal((await routes[0].POST(request(normal.payment.id))).status, 202);
  assert.equal(callbacks.length, 1); assert.equal(transfers.length, 0);
  await callbacks.pop()();
  assert.equal((await a.bookingPayment.findUniqueOrThrow({where: {id: normal.payment.id}})).payoutStatus, 'PAID');
  assert.equal(transfers.length, 1); assert.equal(await a.financeEvent.count({where: {paymentId: normal.payment.id, type: 'PAYOUT_PAID'}}), 1);
  pass('Default-off real admin route retains its immediate task and completes normal payout accounting');

  const target = await fixture('Pending');
  const armedAt = new Date(Date.now() - 1000), expiresAt = new Date(+armedAt + 600_000);
  process.env.DRIVEDROP_QA23_PAYOUT_RECOVERY = JSON.stringify({case: 'QA23', platformAccountId: 'acct_1US4BzLAzgkvCvrI',
    bookingId: target.booking.id, paymentId: target.payment.id, destinationAccountId: target.account.stripeAccountId,
    paymentIntentId: target.intentId, sourceChargeId: target.chargeId, armedAt: armedAt.toISOString(), expiresAt: expiresAt.toISOString()});
  const responses = await Promise.all(routes.map(route => route.POST(request(target.payment.id))));
  assert(responses.every(r => r.status === 202));
  const bodies = await Promise.all(responses.map(r => r.json()));
  assert.equal(bodies[0].payoutId, bodies[1].payoutId); assert.equal(callbacks.length, 0);
  const pending = await a.stripePayout.findUniqueOrThrow({where: {paymentId: target.payment.id}});
  assert.equal(pending.status, 'PENDING'); assert.equal(pending.attemptCount, 0); assert.equal(pending.stripeTransferId, null);
  assert.equal(pending.amountPence, 1000); assert.equal(pending.finePence, 0);
  assert.equal(await a.stripePayout.count({where: {paymentId: target.payment.id}}), 1);
  assert.equal((await a.bookingPayment.findUniqueOrThrow({where: {id: target.payment.id}})).payoutStatus, 'PROCESSING');
  assert.equal(await a.financeEvent.count({where: {paymentId: target.payment.id, type: 'PAYOUT_PAID'}}), 0);
  assert.equal(transfers.length, 1); // only the independent default-off case above
  assert(traces.some(([, row]) => row?.event === 'foreground_deferred' && row.payoutId === pending.id));
  pass('Concurrent admin submissions create one real pending instruction and omit both immediate tasks for the exact armed case');

  const run = await dispatch();
  assert.equal(run.status, 'succeeded'); assert.equal(run.checked, 1); assert.equal(run.failed, 0); assert(run.finished_at);
  const completed = await a.stripePayout.findUniqueOrThrow({where: {id: pending.id}});
  assert.equal(completed.status, 'TRANSFERRED'); assert.equal(completed.amountPence, 1000);
  assert.equal((await a.bookingPayment.findUniqueOrThrow({where: {id: target.payment.id}})).payoutStatus, 'PAID');
  const events = await a.financeEvent.findMany({where: {paymentId: target.payment.id, type: 'PAYOUT_PAID'}});
  assert.equal(events.length, 1); assert.equal(events[0].amountPence, 1000);
  const targetTransfers = transfers.filter(t => t.transfer_group === `dd_payout_${pending.id}`);
  assert.equal(targetTransfers.length, 1); assert.equal(targetTransfers[0].amount, 1000);
  assert.equal(targetTransfers[0].destination, target.account.stripeAccountId);
  assert.equal(targetTransfers[0].source_transaction, target.chargeId); assert.equal(targetTransfers[0].livemode, false);
  const runTrace = traces.filter(([, row]) => row?.runId === run.id).map(([, row]) => row);
  assert.deepEqual(runTrace.map(row => [row.event, row.payoutId, row.status]), [
    ['worker_selected', pending.id, 'PENDING'], ['worker_claimed', pending.id, 'PENDING'],
    ['worker_transfer_submitted', pending.id, 'PENDING'], ['worker_transfer_returned', pending.id, 'PENDING'],
    ['worker_finished', pending.id, 'TRANSFERRED']]);
  pass('Actual local cron dispatch and worker recover the instruction, link its run ID, and record exactly one offline transfer and ledger event');
  await appB('src/lib/stripe-payouts.ts').reconcileStripePayout(pending.id); // canonical webhook replay from another connection
  for (let i = 0; i < 2; i++) {const idle = await dispatch(); assert.equal(idle.status, 'succeeded'); assert.equal(idle.checked, 0);}
  assert.equal(transferKeys.filter(key => key === `dd-payout-${pending.id}`).length, 1);
  assert.equal(await a.financeEvent.count({where: {paymentId: target.payment.id, type: 'PAYOUT_PAID'}}), 1);
  assert.equal(refundScans, 3);
  pass('Canonical replay and two later worker scans preserve one financial effect and continue the other recovery stages');
  delete process.env.DRIVEDROP_QA23_PAYOUT_RECOVERY;
  const report = {checkedAt: new Date().toISOString(), sourceCommit: process.env.GITHUB_SHA || null, version, passed,
    fixtureTransferPence: 1000, targetTransferCount: targetTransfers.length, targetPayoutEventCount: events.length,
    runId: run.id, limits: ['Loopback PostgreSQL and synthetic records only; Stripe, readiness and auth are offline fixtures.',
      'No hosted financial operation, email, real 24-hour wait, provider response loss or insufficient-balance reversal is established.']};
  fs.writeFileSync(process.env.NATIVE_QA23_REPORT || '/tmp/drivedrop-native-qa23.json', JSON.stringify(report, null, 2) + '\n');
})().catch(error => {console.error(error); process.exitCode = 1;}).finally(() => Promise.all(clients.map(db => db.$disconnect())));
