import {randomUUID} from 'node:crypto';
import {Prisma} from '@prisma/client';
import {prisma} from './prisma';
import {reconcileRequest} from './booking-authorisation';
import {paymentEnvironment} from './booking-authorisation-provider';
import {notifyAvailability} from './availability-notifications';
import {recoverStripeRefunds} from './stripe-refunds';
import {recoverStripePayouts} from './stripe-payouts';
import {assertProductionPaymentConfiguration} from './payment-runtime';
import {paymentRecoveryHeartbeatTarget, sendPaymentRecoveryHeartbeat} from './payment-recovery-heartbeat';

function recoveryTable() {
  const environment = paymentEnvironment();
  if (environment === 'production') {
    assertProductionPaymentConfiguration();
    return Prisma.raw('drivedrop_production_ops.booking_authorisation_runs');
  }
  if (environment === 'preview') return Prisma.raw('drivedrop_preview_ops.booking_authorisation_runs');
  throw new Error('Background recovery requires a configured deployment environment');
}

// Payment requests are the durable work queue. Runs record execution, not ownership
// of money: canonical Stripe state and the existing job locks remain authoritative.
export async function reconcileBookingAuthorisations() {
  const started = Date.now();
  const rows = await prisma.availabilityRequest.findMany({
    where: {paymentEnvironment: paymentEnvironment(), OR: [
      {status: 'CAPTURING'}, {paymentState: 'RELEASE_PENDING'},
      {status: {in: ['AWAITING_AUTHORISATION', 'AWAITING_TRANSPORTER']}, respondBy: {lte: new Date()}},
    ]},
    orderBy: {updatedAt: 'asc'}, take: 10,
  });
  let checked = 0, failed = 0;
  for (const row of rows) {
    // Leave time for one in-flight Stripe operation before the platform deadline.
    if (Date.now() - started >= 45_000) break;
    checked++;
    try {
      const next = await reconcileRequest(row.id);
      if (next.status !== row.status) await notifyAvailability(row.id);
    } catch {
      failed++;
      // Rotate failures behind other waiting requests without changing payment state.
      await prisma.availabilityRequest.updateMany({
        where: {id: row.id, updatedAt: row.updatedAt}, data: {updatedAt: new Date()},
      });
      console.error('Booking authorisation recovery deferred', {requestId: row.id});
    }
  }
  return {checked, failed};
}

export async function claimPaymentRecoveryRun() {
  const table = recoveryTable();
  return prisma.$transaction(async tx => {
    const [lock] = await tx.$queryRaw<Array<{locked: boolean}>>`
      select pg_try_advisory_xact_lock(hashtext(${`drivedrop-${paymentEnvironment()}-payment-recovery`})) as locked`;
    if (!lock.locked) return null;
    // A terminated invocation cannot finish its record. Its payment requests remain
    // eligible for the next run after this lease expires (longer than maxDuration).
    await tx.$executeRaw`
      update ${table}
      set status = 'interrupted', finished_at = now()
      where finished_at is null and started_at < now() - interval '4 minutes'`;
    const [active] = await tx.$queryRaw<Array<{id: string}>>`
      select id from ${table} where finished_at is null limit 1`;
    if (active) return {id: active.id, created: false};
    const id = randomUUID();
    await tx.$executeRaw`
      insert into ${table} (id) values (${id})`;
    // Retention is confined to this new operational log, never application records.
    await tx.$executeRaw`
      delete from ${table}
      where finished_at < now() - interval '7 days'`;
    return {id, created: true};
  });
}

export async function completePaymentRecoveryRun(id: string) {
  const table = recoveryTable();
  let result = {checked: 0, failed: 0};
  // A failure in one queue must not prevent the other queues from reconciling.
  for (const worker of [reconcileBookingAuthorisations, recoverStripePayouts, recoverStripeRefunds]) {
    try {
      const outcome = await worker();
      result.checked += outcome.checked;
      result.failed += outcome.failed;
    } catch {
      result.failed++;
      console.error('Payment recovery stage failed', {runId: id});
    }
  }
  const completed = await prisma.$executeRaw`
    update ${table}
    set status = ${result.failed ? 'failed' : 'succeeded'}, finished_at = now(),
        checked = ${result.checked}, failed = ${result.failed}
    where id = ${id} and finished_at is null`;
  // This autocommitted update is the durable completion. A superseded or
  // duplicate callback updates zero rows and must never report a heartbeat.
  if (completed !== 1) return;
  const target = paymentRecoveryHeartbeatTarget();
  if (!target) return;
  try {
    // Reuse the dispatch lock only AFTER completion has committed. A new claim
    // cannot supersede the evidence between the health read and bounded ping.
    // This transaction never writes financial state or changes the run result.
    await prisma.$transaction(async tx => {
      const deadline = Date.now() + 4000;
      // Prisma's transaction deadline alone does not cancel blocked SQL. Bound
      // each monitoring query at PostgreSQL; SET LOCAL cannot affect later work.
      await tx.$executeRaw`SET LOCAL statement_timeout = '1000ms'`;
      const [lock] = await tx.$queryRaw<Array<{locked: boolean}>>`
        select pg_try_advisory_xact_lock(hashtext(${`drivedrop-${paymentEnvironment()}-payment-recovery`})) as locked`;
      if (!lock?.locked) return;
      const health = await readPaymentRecoveryHealth(tx);
      const latest = health.runs[0];
      const age = latest?.finished_at ? Date.now() - +latest.finished_at : NaN;
      if (!latest || latest.id !== id || !['succeeded', 'failed'].includes(latest.status) ||
          !Number.isFinite(age) || age < 0 || age >= 60_000) return;
      const remaining = Math.min(2000, deadline - Date.now());
      if (remaining <= 0) throw new Error('Heartbeat health read exceeded budget');
      await sendPaymentRecoveryHeartbeat(target,
        latest.status === 'succeeded' && latest.failed === 0 && health.healthy, remaining);
    }, {maxWait: 1000, timeout: 5000});
  } catch {
    console.error('Payment recovery heartbeat failed', {reason: 'health_unavailable'});
  }
}

async function readPaymentRecoveryHealth(db: Prisma.TransactionClient) {
  const table = recoveryTable();
  const rows = await db.$queryRaw<Array<{id: string; status: string; started_at: Date; finished_at: Date | null; checked: number; failed: number}>>`
    select id, status, started_at, finished_at, checked, failed from ${table} order by started_at desc limit 5`;
  const successful = rows.find(row => row.status === 'succeeded' && row.finished_at);
  const latest = rows[0];
  const workerHealthy = !!successful && Date.now() - +successful.finished_at! < 5 * 60_000 &&
    !rows.some(row => !row.finished_at && Date.now() - +row.started_at > 4 * 60_000) &&
    !!latest && !['failed', 'interrupted'].includes(latest.status);
  const environment = paymentEnvironment();
  const backlog = await db.$queryRaw<Array<{queue: string; pending: number; oldest: Date | null; review: number; reserved: number; expired_leases: number}>>`
    SELECT 'authorisations' AS queue, count(*)::int AS pending,
      min(coalesce("confirmedAt", "respondBy", "createdAt")) AS oldest,
      0::int AS review, count(*)::int AS reserved, 0::int AS expired_leases
    FROM public."AvailabilityRequest" WHERE "paymentEnvironment" = ${environment} AND
      (status = 'CAPTURING' OR "paymentState" = 'RELEASE_PENDING' OR
        (status IN ('AWAITING_AUTHORISATION','AWAITING_TRANSPORTER') AND "respondBy" <= now()))
    UNION ALL
    SELECT 'transfers', count(*) FILTER (WHERE status IN ('PENDING','RETRY'))::int,
      min("createdAt") FILTER (WHERE status IN ('PENDING','RETRY')),
      count(*) FILTER (WHERE status = 'REVIEW')::int,
      count(*) FILTER (WHERE status IN ('PENDING','RETRY','REVIEW'))::int,
      count(*) FILTER (WHERE status IN ('PENDING','RETRY') AND "leaseUntil" < now() - interval '5 minutes')::int
    FROM public."StripePayout" WHERE environment = ${environment}
    UNION ALL
    SELECT 'refunds', count(*) FILTER (WHERE status IN ('PENDING','RETRY','PENDING_STRIPE') OR "recoveryStatus" IN ('PENDING','RETRY'))::int,
      min("createdAt") FILTER (WHERE status IN ('PENDING','RETRY','PENDING_STRIPE') OR "recoveryStatus" IN ('PENDING','RETRY')),
      count(*) FILTER (WHERE status = 'REVIEW' OR "recoveryStatus" = 'REVIEW' OR (status = 'FAILED' AND "activePaymentId" IS NOT NULL))::int,
      count(*) FILTER (WHERE "activePaymentId" IS NOT NULL)::int,
      count(*) FILTER (WHERE "activePaymentId" IS NOT NULL AND "leaseUntil" < now() - interval '5 minutes')::int
    FROM public."StripeRefund" WHERE environment = ${environment}`;
  const needsReview = backlog.some(queue => queue.review > 0 || queue.expired_leases > 0 ||
    (queue.pending > 0 && queue.oldest && Date.now() - +queue.oldest > 15 * 60_000));
  return {healthy: workerHealthy && !needsReview, workerHealthy, needsReview, environment, runs: rows, backlog};
}

export async function paymentRecoveryHealth() {
  const health = await readPaymentRecoveryHealth(prisma);
  // Keep the authenticated health endpoint's existing response shape.
  return {...health, runs: health.runs.map(({id, ...run}) => run)};
}

// Compatibility for existing preview callers; storage selection is explicit above.
export const claimPreviewRecoveryRun = claimPaymentRecoveryRun;
export const completePreviewRecoveryRun = completePaymentRecoveryRun;
