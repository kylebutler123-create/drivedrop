import {randomUUID} from 'node:crypto';
import {prisma} from './prisma';
import {reconcileRequest} from './booking-authorisation';
import {paymentEnvironment} from './booking-authorisation-provider';
import {notifyAvailability} from './availability-notifications';
import {recoverStripePayouts} from './stripe-payouts';

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

export async function claimPreviewRecoveryRun() {
  if (paymentEnvironment() !== 'preview') throw new Error('Background recovery is preview-only');
  return prisma.$transaction(async tx => {
    const [lock] = await tx.$queryRaw<Array<{locked: boolean}>>`
      select pg_try_advisory_xact_lock(hashtext('drivedrop-preview-payment-recovery')) as locked`;
    if (!lock.locked) return null;
    // A terminated invocation cannot finish its record. Its payment requests remain
    // eligible for the next run after this lease expires (longer than maxDuration).
    await tx.$executeRaw`
      update drivedrop_preview_ops.booking_authorisation_runs
      set status = 'interrupted', finished_at = now()
      where finished_at is null and started_at < now() - interval '4 minutes'`;
    const [active] = await tx.$queryRaw<Array<{id: string}>>`
      select id from drivedrop_preview_ops.booking_authorisation_runs where finished_at is null limit 1`;
    if (active) return {id: active.id, created: false};
    const id = randomUUID();
    await tx.$executeRaw`
      insert into drivedrop_preview_ops.booking_authorisation_runs (id) values (${id})`;
    // Retention is confined to this new operational log, never application records.
    await tx.$executeRaw`
      delete from drivedrop_preview_ops.booking_authorisation_runs
      where finished_at < now() - interval '7 days'`;
    return {id, created: true};
  });
}

export async function completePreviewRecoveryRun(id: string) {
  let result = {checked: 0, failed: 0};
  try {
    result = await reconcileBookingAuthorisations();
    const payouts = await recoverStripePayouts();
    result.checked += payouts.checked;
    result.failed += payouts.failed;
  } catch {
    result.failed++;
    console.error('Booking authorisation recovery run failed', {runId: id});
  }
  await prisma.$executeRaw`
    update drivedrop_preview_ops.booking_authorisation_runs
    set status = ${result.failed ? 'failed' : 'succeeded'}, finished_at = now(),
        checked = ${result.checked}, failed = ${result.failed}
    where id = ${id} and finished_at is null`;
}
