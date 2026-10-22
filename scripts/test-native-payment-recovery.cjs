// Real PostgreSQL transactions and separate Prisma connections; provider stages
// are inert fixtures. Run after rehearse-production-database.cjs in an empty CI DB.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const swc = require('next/dist/build/swc');
const {PrismaClient} = require('@prisma/client');
const {nativeDatabaseUrl, configureSyntheticProduction} = require('./native-payment-rehearsal.cjs');
const url = nativeDatabaseUrl();
const clients = [0, 1].map(() => new PrismaClient({datasources: {db: {url: url + '?connection_limit=1'}}}));
configureSyntheticProduction();
const root = path.resolve(__dirname, '..'), passed = [];
let failPayout = false, refundScans = 0;
function worker(prisma) {
  const cache = {};
  const mocks = {
    './prisma': {prisma},
    './booking-authorisation': {reconcileRequest: async () => {throw Error('Unexpected authorisation fixture');}},
    './booking-authorisation-provider': {paymentEnvironment: () => 'production'},
    './availability-notifications': {notifyAvailability: async () => {throw Error('Unexpected notice');}},
    './stripe-payouts': {recoverStripePayouts: async () => {
      if (failPayout) throw Error('Synthetic unavailable provider stage');
      return {checked: 0, failed: 0};
    }},
    './stripe-refunds': {recoverStripeRefunds: async () => {refundScans++; return {checked: 0, failed: 0};}},
  };
  function load(file) {
    file = path.resolve(root, file);
    if (cache[file]) return cache[file];
    const out = cache[file] = {};
    const code = swc.transformSync(fs.readFileSync(file, 'utf8'), {
      filename: file, jsc: {parser: {syntax: 'typescript'}, target: 'es2022'}, module: {type: 'commonjs'},
    }).code;
    new Function('exports', 'require', 'console', code)(out, id => {
      if (id in mocks) return mocks[id];
      if (id.startsWith('.')) return load(path.resolve(path.dirname(file), id + '.ts'));
      return require(id);
    }, {error() {}});
    return out;
  }
  return load('src/lib/booking-authorisation-recovery.ts');
}
const [a, b] = clients, workers = clients.map(worker);
const pass = name => {passed.push(name); console.log('PASS: ' + name);};
const runs = () => a.$queryRaw`SELECT id,status,finished_at,checked,failed FROM drivedrop_production_ops.booking_authorisation_runs ORDER BY started_at`;
(async () => {
  const [{version}] = await a.$queryRaw`SELECT version()`;
  assert(version.startsWith('PostgreSQL 17.11 '), 'Native PostgreSQL 17.11 is required');
  const pids = await Promise.all(clients.map(db => db.$queryRaw`SELECT pg_backend_pid() AS pid`));
  assert.notEqual(pids[0][0].pid, pids[1][0].pid);
  assert.equal(await a.availabilityRequest.count(), 0);
  assert.equal((await runs()).length, 0);
  pass('Two independent native PostgreSQL 17.11 connections are in use');

  let entered, release;
  const locked = new Promise(resolve => {entered = resolve;});
  const unblock = new Promise(resolve => {release = resolve;});
  const holding = a.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('drivedrop-production-payment-recovery'))::text`;
    entered();
    await unblock;
  }, {timeout: 10000});
  // Surface connection/SQL failures instead of waiting for an unreached barrier.
  try {
    await Promise.race([locked, holding]);
    assert.equal(await workers[1].claimPaymentRecoveryRun(), null);
  } finally {release(); await holding;}
  pass('A competing connection cannot claim while the production advisory lock is held');

  const claims = await Promise.all(Array.from({length: 6}, (_, i) => workers[i % 2].claimPaymentRecoveryRun()));
  const created = claims.filter(row => row?.created);
  assert.equal(created.length, 1);
  assert(claims.every(row => !row || row.id === created[0].id));
  assert.equal((await runs()).filter(row => !row.finished_at).length, 1);
  pass('Six competing claims produce one durable active run');

  const old = created[0].id;
  await a.$executeRaw`UPDATE drivedrop_production_ops.booking_authorisation_runs SET started_at = now() - interval '5 minutes' WHERE id=${old}`;
  const replacement = await workers[1].claimPaymentRecoveryRun();
  assert(replacement.created); assert.notEqual(replacement.id, old);
  let rows = await runs();
  assert.equal(rows.find(row => row.id === old).status, 'interrupted');
  assert.equal(rows.filter(row => !row.finished_at).length, 1);
  await workers[0].completePaymentRecoveryRun(old);
  rows = await runs();
  assert.equal(rows.find(row => row.id === old).status, 'interrupted');
  assert.equal(rows.find(row => row.id === replacement.id).status, 'running');
  pass('An expired run is replaced and a late completion cannot overwrite either run record');

  failPayout = true;
  const before = refundScans;
  await workers[1].completePaymentRecoveryRun(replacement.id);
  assert.equal(refundScans, before + 1);
  rows = await runs();
  const failed = rows.find(row => row.id === replacement.id);
  assert.equal(failed.status, 'failed'); assert.equal(failed.failed, 1);
  assert.equal((await workers[0].paymentRecoveryHealth()).healthy, false);
  pass('A failed stage still reaches refund recovery and persists an unhealthy failed run');

  const beforeDenied = rows.length;
  delete process.env.CRON_SECRET;
  await assert.rejects(workers[0].claimPaymentRecoveryRun, /webhooks and recovery/);
  assert.equal((await runs()).length, beforeDenied);
  process.env.CRON_SECRET = 'offline-fixture'; failPayout = false;
  const final = await workers[0].claimPaymentRecoveryRun();
  await workers[0].completePaymentRecoveryRun(final.id);
  assert.equal((await workers[0].paymentRecoveryHealth()).healthy, true);
  assert.equal((await a.$queryRaw`SELECT to_regnamespace('drivedrop_preview_ops')::text AS name`)[0].name, null);
  pass('Invalid configuration cannot claim; paused creation still permits recovery in production-only run storage');

  const report = {checkedAt: new Date().toISOString(), version, native1711Verified: true, passed,
    limitations: ['Provider stages are offline fixtures; this does not verify Stripe responses, hosted scheduling or pending money instructions. The separate booking suite exercises a real pending capture instruction.']};
  fs.writeFileSync(process.env.NATIVE_RECOVERY_REPORT || '/tmp/drivedrop-native-recovery.json', JSON.stringify(report, null, 2) + '\n');
})().catch(error => {console.error(error); process.exitCode = 1;}).finally(() => Promise.all(clients.map(db => db.$disconnect())));
