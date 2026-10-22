const assert = require('node:assert/strict');
const fs = require('node:fs');
const swc = require('next/dist/build/swc');

function load(file, mocks) {
  const exports = {};
  const code = swc.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file, jsc: {parser: {syntax: 'typescript'}, target: 'es2022'}, module: {type: 'commonjs'},
  }).code;
  new Function('exports', 'require', 'console', code)(exports,
    name => name in mocks ? mocks[name] : require(name), {error() {}});
  return exports;
}

(async () => {
  const rows = new Map(), emails = [], inserts = [];
  let failedUser = null, emailFailure = false;
  const request = {id: 'request-one', status: 'BOOKED', customerId: 'customer', transporterId: 'transporter',
    collectionDate: new Date('2026-10-25T12:00:00Z'), respondBy: new Date('2026-10-24T12:00:00Z'),
    job: {vehicleMake: 'QA', vehicleModel: 'Van', collection: 'London', delivery: 'Bristol'}};
  const prisma = {
    availabilityRequest: {findUnique: async () => ({...request})},
    user: {findUnique: async ({where: {id}}) => ({id, email: `${id}@example.test`})},
    $executeRaw: async (sql, ...values) => {
      // Model atomic primary-key enforcement, including an asynchronous DB round-trip.
      // The old random-ID INSERT creates four rows in the concurrency case below.
      await new Promise(resolve => setImmediate(resolve));
      if (values[1] === failedUser) throw new Error('temporary insert failure');
      const conflictSafe = sql.join('?').includes('ON CONFLICT ("id") DO NOTHING');
      inserts.push({sql: sql.join('?'), values});
      if (rows.has(values[0])) {
        if (conflictSafe) return 0;
        throw new Error('duplicate key');
      }
      rows.set(values[0], values.slice(1));
      return 1;
    },
  };
  function processInstance() {
    const notifications = load('src/lib/notifications.ts', {'@/lib/prisma': {prisma}});
    return load('src/lib/availability-notifications.ts', {
      './prisma': {prisma}, './notifications': notifications,
      './email': {sendTransactionalEmailSafely: async input => {
        emails.push(input); return emailFailure ? {sent: false, reason: 'error'} : {sent: true};
      }},
    }).notifyAvailability;
  }
  // Separate module instances represent a capture webhook and recovery worker.
  await Promise.all([processInstance()(request.id), processInstance()(request.id)]);
  assert.equal(rows.size, 2, 'one booking notice per recipient under concurrency');
  assert.equal(emails.length, 2, 'one email attempt per recipient under concurrency');
  assert.deepEqual(emails.map(e => e.to).sort(), ['customer@example.test', 'transporter@example.test']);
  assert.equal(emails.find(e => e.to === 'customer@example.test').ctaPath, '/customer?view=bookings', 'captured booking email opens customer bookings');
  assert.equal(emails.find(e => e.to === 'transporter@example.test').ctaPath, '/transporter?view=deliveries', 'transporter confirmation keeps its delivery link');
  assert.ok(inserts.every(i => i.sql.includes('ON CONFLICT ("id") DO NOTHING')));
  const originalRows = [...rows];
  // A later cold instance cannot resend or rewrite the first notification.
  await processInstance()(request.id);
  assert.deepEqual([...rows], originalRows);
  assert.equal(emails.length, 2);

  request.status = 'AWAITING_TRANSPORTER';
  await Promise.all([processInstance()(request.id), processInstance()(request.id)]);
  assert.equal(rows.size, 3, 'a distinct status has its own recipient claim');
  assert.equal(emails.length, 3);
  assert.equal(emails[2].ctaPath, '/transporter?view=quotes', 'uncaptured authorization still opens the confirmation request');
  request.status = 'CAPTURING';
  await processInstance()(request.id);
  assert.equal(rows.size, 3, 'transient capture state sends nothing');

  request.id = 'request-two'; request.status = 'BOOKED'; failedUser = 'customer';
  await processInstance()(request.id);
  assert.equal(rows.size, 4, 'one recipient failure does not suppress the other');
  assert.equal(emails.length, 4, 'failed DB insert must not send an unclaimed email');
  failedUser = null;
  await processInstance()(request.id);
  assert.equal(rows.size, 5);
  assert.equal(emails.length, 5, 'retry sends only the previously missing recipient');

  request.id = 'request-three'; emailFailure = true;
  await processInstance()(request.id);
  await processInstance()(request.id);
  assert.equal(rows.size, 7);
  assert.equal(emails.length, 7, 'best-effort email failure cannot cause duplicate attempts');
  console.log('Availability notification concurrency, replay, recipient isolation and failure checks passed.');
})().catch(error => {console.error(error); process.exitCode = 1;});
