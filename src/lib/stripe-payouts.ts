import type Stripe from 'stripe';
import {prisma} from './prisma';
import {paymentEnvironment} from './booking-authorisation-provider';
import {applyCancellationFeesToPayout} from './cancellation-fees';
import {syncConnectAccount} from './stripe-connect-accounts';
import {ConnectError, connectEnabled, connectReconciliationEnabled, connectFailureCode, verifiedConnectClient} from './stripe-connect-provider';
import {assertCapturedSource, assertPayoutEligible, assertTransferMatches, payoutRetrySafe} from './stripe-payout-policy';
import {tracePayoutRecoveryProbe} from './stripe-payout-recovery-probe';

const paymentInclude = {events: {where: {type: 'PAYOUT_READY' as const}}, booking: {include: {
  disputes: {select: {id: true, status: true, resolution: true}},
  trackingEvents: {where: {status: 'DELIVERED' as const}, orderBy: {createdAt: 'desc' as const}, take: 1},
}}};
const terminal = (status: string) => ['TRANSFERRED', 'DEDUCTED', 'REVERSED'].includes(status);

async function capturedSource(stripe: Stripe, payment: any) {
  const request = await prisma.availabilityRequest.findFirst({where: {
    bookingId: payment.bookingId, paymentIntentId: payment.providerReference,
    paymentEnvironment: paymentEnvironment(), paymentProvider: 'STRIPE',
  }});
  if (!request?.paymentIntentId) throw new ConnectError('This booking has no matching Stripe payment authorisation.', 'PAYMENT_MISMATCH');
  const intent = await stripe.paymentIntents.retrieve(request.paymentIntentId, {expand: ['latest_charge']});
  return {chargeId: assertCapturedSource(intent, {...payment, environment: paymentEnvironment()}, request), intentId: intent.id};
}

export async function prepareStripePayout(paymentId: string, actorId: string) {
  if (!connectEnabled()) throw new ConnectError('New Stripe payouts are temporarily paused.');
  const existing = await prisma.stripePayout.findUnique({where: {paymentId}});
  if (existing) {
    if (existing.environment !== paymentEnvironment()) throw new ConnectError('Payout environment mismatch.');
    return existing;
  }
  const stripe = await verifiedConnectClient();
  const payment = await prisma.bookingPayment.findUniqueOrThrow({where: {id: paymentId}, include: paymentInclude});
  assertPayoutEligible(payment);
  const account = await prisma.stripeConnectAccount.findUnique({where: {userId_environment: {
    userId: payment.booking.transporterId, environment: paymentEnvironment(),
  }}});
  if (!account?.stripeAccountId) throw new ConnectError('The transporter must set up their Stripe payout account.', 'ACCOUNT_NOT_READY');
  const ready = await syncConnectAccount(account.id, stripe);
  if (!ready.transfersEnabled || !ready.payoutsEnabled) throw new ConnectError('The transporter must complete Stripe verification before release.', 'ACCOUNT_NOT_READY');
  const source = await capturedSource(stripe, payment);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Booking" WHERE id=${payment.bookingId} FOR UPDATE`;
    const prior = await tx.stripePayout.findUnique({where: {paymentId}});
    if (prior) return prior;
    const fresh = await tx.bookingPayment.findUniqueOrThrow({where: {id: paymentId}, include: paymentInclude});
    if(await tx.stripeRefund.findUnique({where:{activePaymentId:paymentId}}))throw new ConnectError('A refund requires review.','PAYOUT_HELD');
    assertPayoutEligible(fresh);
    if (fresh.paidPence !== payment.paidPence || fresh.refundedPence !== payment.refundedPence || fresh.providerReference !== source.intentId) {
      throw new ConnectError('Payment changed during release. Refresh and retry.', 'PAYMENT_MISMATCH');
    }
    // Serialize fine reservations across different bookings for this transporter.
    // PostgreSQL returns void for this lock; Prisma cannot decode that type.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`dd-payout-fines-${fresh.booking.transporterId}`}))::text`;
    const fees = await applyCancellationFeesToPayout({tx, transporterId: fresh.booking.transporterId,
      paymentId, completedAt: fresh.booking.customerConfirmedAt || fresh.booking.trackingEvents[0]?.createdAt || new Date(),
      proceedsPence: fresh.transporterProceedsPence});
    const payout = await tx.stripePayout.create({data: {
      paymentId, connectAccountId: account.id, environment: paymentEnvironment(), destinationAccountId: account.stripeAccountId!,
      paymentIntentId: source.intentId, sourceChargeId: source.chargeId, grossPence: fresh.transporterProceedsPence,
      finePence: fees.deductedPence, amountPence: fees.netProceedsPence, paidPence: fresh.paidPence,
      refundedPence: fresh.refundedPence, actorId,
    }});
    // Fine deductions are reserved once, even if the Stripe request times out.
    // They remain attached to this immutable release until it is reconciled.
    await tx.bookingPayment.update({where: {id: paymentId}, data: {payoutStatus: 'PROCESSING',
      transporterProceedsPence: fees.netProceedsPence, cancellationDeductionPence: {increment: fees.deductedPence}}});
    return payout;
  }, {timeout: 20_000});
}

async function existingTransfer(stripe: Stripe, payout: any) {
  if (payout.stripeTransferId) return stripe.transfers.retrieve(payout.stripeTransferId);
  const result = await stripe.transfers.list({transfer_group: `dd_payout_${payout.id}`, limit: 2});
  if (result.has_more || result.data.length > 1) throw new ConnectError('Multiple transfers need review.', 'TRANSFER_MISMATCH');
  return result.data[0] || null;
}

async function finishPayout(tx: any, payout: any, transfer: Stripe.Transfer | null) {
  if (transfer) assertTransferMatches(transfer, payout);
  const reversed = transfer?.amount_reversed || 0;
  const status = reversed ? 'REVERSED' : transfer ? 'TRANSFERRED' : 'DEDUCTED';
  const fresh = await tx.stripePayout.findUniqueOrThrow({where: {id: payout.id}});
  const completedBefore = !!fresh.transferredAt;
  await tx.stripePayout.update({where: {id: payout.id}, data: {
    status, stripeTransferId: transfer?.id || null, transferredAt: fresh.transferredAt || new Date(),
    reversedPence: reversed, leaseUntil: null, retryAfter: null, failureCode: reversed ? 'REVERSED' : null,
  }});
  const currentPayment = await tx.bookingPayment.findUniqueOrThrow({where: {id: payout.paymentId}});
  const refundManaged = currentPayment.refundedPence > payout.refundedPence ||
    await tx.stripeRefund.findUnique({where: {activePaymentId: payout.paymentId}});
  // Refund accounting owns this payment after a refund reservation. Late transfer
  // events must never overwrite CANCELLED/HELD or make refunded funds releasable.
  const payment = refundManaged ? (reversed !== fresh.reversedPence ?
    await tx.bookingPayment.update({where: {id: payout.paymentId}, data: {payoutStatus: 'HELD'}}) : currentPayment) :
    await tx.bookingPayment.update({where: {id: payout.paymentId}, data: {payoutStatus: reversed ? 'HELD' : 'PAID'}});
  if (!completedBefore) await tx.financeEvent.create({data: {paymentId: payout.paymentId, type: 'PAYOUT_PAID',
    amountPence: payout.amountPence, actorId: payout.actorId,
    note: transfer ? `Stripe ${payout.environment} transfer ${transfer.id}; credited to transporter Stripe balance, bank payout separate` : `Stripe ${payout.environment} payout fully offset by reserved fines; no bank transfer`,
  }});
  return payment;
}

export async function reconcileStripePayout(id: string, recoveryRunId?: string) {
  if (!connectReconciliationEnabled()) throw new ConnectError('Stripe payout processing is not enabled yet.');
  const original = await prisma.stripePayout.findUniqueOrThrow({where: {id}, include: {payment: {select: {bookingId: true}}}});
  if (original.environment !== paymentEnvironment()) throw new ConnectError('Payout environment mismatch.');
  if (original.status === 'DEDUCTED') return original;
  const claimed = await prisma.stripePayout.updateMany({where: {id,
    OR: [{leaseUntil: null}, {leaseUntil: {lt: new Date()}}]},
    data: {leaseUntil: new Date(Date.now() + 120_000), attemptCount: {increment: 1}}});
  if (!claimed.count) return original;
  tracePayoutRecoveryProbe(original, recoveryRunId, 'worker_claimed');
  try {
    const stripe = await verifiedConnectClient();
    const transfer = await existingTransfer(stripe, original);
    // Always reconcile an existing transfer, even if a dispute arrived later.
    if (transfer) return await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Booking" WHERE id=${original.payment.bookingId} FOR UPDATE`;
      return finishPayout(tx, original, transfer);
    });
    if (terminal(original.status)) throw new ConnectError('The recorded Stripe transfer could not be found.', 'TRANSFER_MISMATCH');
    if (!payoutRetrySafe(original.firstAttemptAt)) throw new ConnectError('An earlier payout attempt needs reconciliation before any new transfer.', 'STALE_ATTEMPT');
    const account = await syncConnectAccount(original.connectAccountId, stripe);
    if (account.stripeAccountId !== original.destinationAccountId || !account.transfersEnabled || !account.payoutsEnabled) {
      throw new ConnectError('The transporter needs to complete Stripe verification.', 'ACCOUNT_NOT_READY');
    }
    const payment = await prisma.bookingPayment.findUniqueOrThrow({where: {id: original.paymentId}, include: paymentInclude});
    const source = await capturedSource(stripe, payment);
    if (source.chargeId !== original.sourceChargeId) throw new ConnectError('Captured charge changed.', 'PAYMENT_MISMATCH');
    // Persist the first-attempt timestamp OUTSIDE the API transaction. If Stripe
    // succeeds but the database commit is lost, the same key remains recoverable.
    await prisma.stripePayout.updateMany({where: {id, firstAttemptAt: null}, data: {firstAttemptAt: new Date()}});
    return await prisma.$transaction(async tx => {
      // The shared booking lock serializes disputes/refunds with the actual release.
      await tx.$queryRaw`SELECT id FROM "Booking" WHERE id=${original.payment.bookingId} FOR UPDATE`;
      const current = await tx.stripePayout.findUniqueOrThrow({where: {id}});
      if (terminal(current.status)) return current;
      const fresh = await tx.bookingPayment.findUniqueOrThrow({where: {id: current.paymentId}, include: paymentInclude});
      if(await tx.stripeRefund.findUnique({where:{activePaymentId:current.paymentId}}))throw new ConnectError('A refund requires review.','PAYOUT_HELD');
      assertPayoutEligible(fresh, true);
      if (fresh.paidPence !== current.paidPence || fresh.refundedPence !== current.refundedPence ||
          fresh.transporterProceedsPence !== current.amountPence || fresh.cancellationDeductionPence !== current.finePence) {
        throw new ConnectError('Reserved payout amounts changed.', 'PAYMENT_MISMATCH');
      }
      if (!current.amountPence) return finishPayout(tx, current, null);
      tracePayoutRecoveryProbe(current, recoveryRunId, 'worker_transfer_submitted');
      const created = await stripe.transfers.create({amount: current.amountPence, currency: 'gbp',
        destination: current.destinationAccountId, source_transaction: current.sourceChargeId,
        transfer_group: `dd_payout_${current.id}`,
        metadata: {driveDropPayoutId: current.id, paymentId: current.paymentId, environment: current.environment},
      }, {idempotencyKey: `dd-payout-${current.id}`});
      tracePayoutRecoveryProbe(current, recoveryRunId, 'worker_transfer_returned');
      return finishPayout(tx, current, created);
    }, {timeout: 25_000, maxWait: 5_000});
  } catch (error) {
    const code = connectFailureCode(error);
    const review = ['PAYMENT_MISMATCH', 'TRANSFER_MISMATCH', 'STALE_ATTEMPT'].includes(code);
    const blocked = ['PAYOUT_HELD', 'ACCOUNT_NOT_READY'].includes(code);
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Booking" WHERE id=${original.payment.bookingId} FOR UPDATE`;
      const row = await tx.stripePayout.findUniqueOrThrow({where: {id}});
      if (terminal(row.status)) { await tx.stripePayout.update({where: {id}, data: {leaseUntil: null}}); return; }
      await tx.stripePayout.update({where: {id}, data: {status: review ? 'REVIEW' : blocked ? 'BLOCKED' : 'RETRY',
        failureCode: code, leaseUntil: null, retryAfter: review || blocked ? null : new Date(Date.now() + 60_000)}});
      await tx.bookingPayment.update({where: {id: row.paymentId}, data: {payoutStatus: blocked && code === 'PAYOUT_HELD' ? 'HELD' : 'FAILED'}});
    });
    console.error('Stripe payout reconciliation deferred', {payoutId: id, code});
  }
  return prisma.stripePayout.findUniqueOrThrow({where: {id}});
}

export async function recoverStripePayouts(runId?: string) {
  if (!connectReconciliationEnabled()) return {checked: 0, failed: 0};
  const rows = await prisma.stripePayout.findMany({where: {environment: paymentEnvironment(), status: {in: ['PENDING', 'RETRY']},
    AND: [{OR: [{retryAfter: null}, {retryAfter: {lte: new Date()}}]}, {OR: [{leaseUntil: null}, {leaseUntil: {lt: new Date()}}]}]},
    orderBy: {updatedAt: 'asc'}, take: 1});
  let failed = 0;
  for (const row of rows) {
    tracePayoutRecoveryProbe(row, runId, 'worker_selected');
    try {
      await reconcileStripePayout(row.id, runId);
      const fresh = await prisma.stripePayout.findUniqueOrThrow({where: {id: row.id}});
      tracePayoutRecoveryProbe(fresh, runId, 'worker_finished');
      if (!terminal(fresh.status)) failed++;
    } catch (error) {
      tracePayoutRecoveryProbe(row, runId, 'worker_threw');
      throw error;
    }
  }
  return {checked: rows.length, failed};
}
