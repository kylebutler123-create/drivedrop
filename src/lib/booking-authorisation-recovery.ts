import {randomUUID} from 'node:crypto';
import {Prisma} from '@prisma/client';
import {prisma} from './prisma';
import {reconcileRequest} from './booking-authorisation';
import {paymentEnvironment} from './booking-authorisation-provider';
import {notifyAvailability} from './availability-notifications';
import {recoverStripeRefunds} from './stripe-refunds';
import {recoverStripePayouts} from './stripe-payouts';
import {assertProductionPaymentConfiguration} from './payment-runtime';

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
  await prisma.$executeRaw`
    update ${table}
    set status = ${result.failed ? 'failed' : 'succeeded'}, finished_at = now(),
        checked = ${result.checked}, failed = ${result.failed}
    where id = ${id} and finished_at is null`;
}

export async function paymentRecoveryHealth() {
  const table = recoveryTable();
  const rows = await prisma.$queryRaw<Array<{status: string; started_at: Date; finished_at: Date | null; checked: number; failed: number}>>`
    select status, started_at, finished_at, checked, failed from ${table} order by started_at desc limit 5`;
  const successful = rows.find(row => row.status === 'succeeded' && row.finished_at);
  const latest = rows[0];
  const workerHealthy = !!successful && Date.now() - +successful.finished_at! < 5 * 60_000 &&
    !rows.some(row => !row.finished_at && Date.now() - +row.started_at > 4 * 60_000) &&
    !!latest && !['failed', 'interrupted'].includes(latest.status);
  const environment = paymentEnvironment();
  const backlog = await prisma.$queryRaw<Array<{queue: string; pending: number; oldest: Date | null; review: number; reserved: number; expired_leases: number}>>`
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

// Compatibility for existing preview callers; storage selection is explicit above.
export const claimPreviewRecoveryRun = claimPaymentRecoveryRun;
export const completePreviewRecoveryRun = completePaymentRecoveryRun;
