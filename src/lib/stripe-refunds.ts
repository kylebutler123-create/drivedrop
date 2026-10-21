import {randomUUID} from 'node:crypto';
import type Stripe from 'stripe';
import type {Prisma, StripeRefund} from '@prisma/client';
import {prisma} from './prisma';
import {paymentEnvironment} from './booking-authorisation-provider';
import {ConnectError, connectEnabled, connectFailureCode, verifiedConnectClient} from './stripe-connect-provider';
import {assertCapturedSource, assertTransferMatches} from './stripe-payout-policy';
import {planStripeRefund, assertStripeRefundMatches, refundCreateRetrySafe, refundIdempotencyKey} from './stripe-refund-policy';
import {restoreRefundFines} from './stripe-refund-fines';
import {failedRefundAmounts, LATE_REFUND_FAILED, LATE_REFUND_REVIEW} from './stripe-refund-failure-policy';
import {adminPayoutApproved, payoutApprovalMarker} from './payout-policy';
import {stripeRefundedTotal} from './alternative-refund-policy';

export const refundSummarySelect = {id: true, status: true, recoveryStatus: true, amountPence: true,
  recoveryAmountPence: true, failureCode: true, recoveryFailureCode: true, activePaymentId: true,
  ledgerAppliedAt: true, createdAt: true} satisfies Prisma.StripeRefundSelect;
export function stripeRefundsEnabled() {return connectEnabled() && process.env.STRIPE_REFUNDS_ENABLED === 'true';}
function requireEnabled() {if (!stripeRefundsEnabled()) throw new ConnectError('Stripe sandbox refunds are not enabled yet.', 'REFUNDS_DISABLED');}
const done = (r: StripeRefund) => r.status === 'SUCCEEDED' && ['NOT_REQUIRED', 'RECOVERED'].includes(r.recoveryStatus);
const paymentInclude = {stripePayout: true, alternativeRefund: {select: {amountPence: true, stripeRefundedPence: true}}, booking: {include: {disputes: true}}, events: {where: {type: 'PAYOUT_READY' as const}}};
type Payment = Prisma.BookingPaymentGetPayload<{include: typeof paymentInclude}>;
type RefundInput = {paymentId: string; amountPence: number; expectedRefundedPence: number; actorId: string;
  disputeId?: string; resolution?: 'REFUND_CUSTOMER' | 'PARTIAL_REFUND'; resolutionNote?: string; approvedProceedsPence?: number};
const review = (message: string): never => {throw new ConnectError(message, 'REFUND_REVIEW');};

const lateFailure = (row: StripeRefund) => [LATE_REFUND_FAILED, LATE_REFUND_REVIEW].includes(row.failureCode || '');

async function listAll<T extends {id: string}>(page: (cursor?: string) => Promise<{data: T[]; has_more: boolean}>) {
  const rows: T[] = []; let cursor: string | undefined;
  for (let n = 0; n < 20; n++) {
    const next = await page(cursor); rows.push(...next.data);
    if (!next.has_more) return rows;
    const last = next.data.at(-1)?.id;
    if (!last || last === cursor) break;
    cursor = last;
  }
  return review('Stripe history is too large or incomplete for automatic reconciliation.');
}

// Reads Stripe only. This must keep working with new refunds switched off: a
// bank can reject an earlier successful refund after its reservation was freed.
// The booking lock also fences in-flight refund/reversal workers. No replacement
// refund, transfer or fine application is created by this path.
export async function reconcileStripeRefundFailure(id: string) {
  if (!connectEnabled()) return false;
  const original = await prisma.stripeRefund.findUniqueOrThrow({where: {id}, include: {payment: {select: {bookingId: true}}}});
  if (original.environment !== paymentEnvironment()) return review('Refund environment mismatch.');
  if (!original.ledgerAppliedAt || original.failureCode === LATE_REFUND_FAILED) return false;
  const stripe = await verifiedConnectClient();
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Booking" WHERE id=${original.payment.bookingId} FOR UPDATE`;
    const row = await tx.stripeRefund.findUniqueOrThrow({where: {id}});
    if (!row.ledgerAppliedAt || row.failureCode === LATE_REFUND_FAILED) return false;
    const payment = await tx.bookingPayment.findUniqueOrThrow({where: {id: row.paymentId}, include: paymentInclude});
    const request = await tx.availabilityRequest.findFirst({where: {bookingId: payment.bookingId,
      paymentIntentId: row.paymentIntentId, paymentProvider: 'STRIPE', paymentEnvironment: paymentEnvironment()}});
    if (!request) return review('The captured sandbox payment could not be matched.');
    const intent = await stripe.paymentIntents.retrieve(row.paymentIntentId, {expand: ['latest_charge']});
    const charge = intent.latest_charge as Stripe.Charge | null;
    // A charge dispute forbids new money movement, but does not invalidate a
    // canonical failed-refund correction. This read-only path always holds release.
    const chargeId = assertCapturedSource(intent, {...payment, environment: paymentEnvironment(), refundedPence: charge?.amount_refunded}, request, {allowDisputed: true});
    if (chargeId !== row.sourceChargeId || payment.providerReference !== row.paymentIntentId) return review('Refund source changed.');
    const refunds = await listAll(cursor => stripe.refunds.list({charge: chargeId, limit: 100, ...(cursor ? {starting_after: cursor} : {})}));
    const own = refunds.filter(r => r.id === row.stripeRefundId || r.metadata?.driveDropRefundId === row.id);
    if (own.length !== 1) return review('The recorded refund could not be uniquely matched.');
    const result = assertStripeRefundMatches(own[0], row);
    if (!result.failed) {
      // Round-robin recovery scans completed instructions, including missed events.
      await tx.stripeRefund.update({where: {id}, data: {updatedAt: new Date()}});
      return false;
    }
    const known = await tx.stripeRefund.findMany({where: {paymentId: row.paymentId, environment: paymentEnvironment()}, orderBy: [{createdAt: 'asc'}, {id: 'asc'}]});
    let correction: ReturnType<typeof failedRefundAmounts> | null = null;
    try {
      let succeeded = 0, unsettled = 0;
      for (const refund of refunds) {
        const instruction = known.find(k => k.stripeRefundId === refund.id || refund.metadata?.driveDropRefundId === k.id);
        if (!instruction) return review('An external refund needs reconciliation.');
        const state = assertStripeRefundMatches(refund, instruction);
        if (state.confirmed) succeeded += refund.amount;
        else if (!state.failed) unsettled += refund.amount;
      }
      if (known.some(k => k.ledgerAppliedAt && !refunds.some(r => r.id === k.stripeRefundId)) ||
          (charge!.amount_refunded !== succeeded && charge!.amount_refunded !== succeeded + unsettled)) return review('Stripe refund history does not balance.');
      const recorded = (known[0]?.priorRefundedPence || 0) + known.filter(k => k.ledgerAppliedAt && k.failureCode !== LATE_REFUND_FAILED).reduce((n, k) => n + k.amountPence, 0);
      correction = failedRefundAmounts(payment, {amountPence: row.amountPence, paidPence: row.paidPence,
        priorPlatformFeePence: row.priorPlatformFeePence, platformFeePence: row.platformFeePence,
        priorRefundedPence: row.priorRefundedPence, priorProceedsPence: row.priorProceedsPence,
        priorDeductionPence: row.priorDeductionPence, transporterProceedsPence: row.transporterProceedsPence,
        cancellationDeductionPence: row.cancellationDeductionPence}, recorded);
    } catch (error) {
      if (!(error instanceof ConnectError) || !['REFUND_REVIEW', 'REFUND_MISMATCH'].includes(error.code)) throw error;
      // A confirmed failure must not keep a success label even if other ledger
      // changes prevent safe compensation. Preserve evidence and the release hold.
    }
    for (const other of known.filter(k => k.id !== id && k.activePaymentId)) {
      await tx.stripeRefund.update({where: {id: other.id}, data: {activePaymentId: null, leaseToken: null, leaseUntil: null, retryAfter: null,
        ...(other.ledgerAppliedAt ? {recoveryStatus: 'REVIEW', recoveryFailureCode: 'PRIOR_REFUND_FAILED'} : {status: 'REVIEW', failureCode: 'PRIOR_REFUND_FAILED'})}});
    }
    await tx.stripeRefund.update({where: {id}, data: {status: correction ? 'FAILED' : 'REVIEW',
      failureCode: correction ? LATE_REFUND_FAILED : LATE_REFUND_REVIEW, activePaymentId: row.paymentId,
      leaseToken: null, leaseUntil: null, retryAfter: null,
      ...(['PENDING', 'RETRY'].includes(row.recoveryStatus) ? {recoveryStatus: 'REVIEW', recoveryFailureCode: 'CUSTOMER_REFUND_FAILED'} : {})}});
    await tx.bookingPayment.update({where: {id: payment.id}, data: correction || {payoutStatus: 'HELD'}});
    if (correction) await tx.financeEvent.create({data: {paymentId: payment.id, actorId: row.actorId,
      type: 'REFUND_CREATED', amountPence: -row.amountPence,
      note: `STRIPE_REFUND_FAILURE_CONFIRMED:${row.id}:${own[0].id}`}});
    if (row.disputeId) await tx.dispute.updateMany({where: {id: row.disputeId, bookingId: payment.bookingId,
      status: 'RESOLVED', resolution: row.resolution as 'REFUND_CUSTOMER' | 'PARTIAL_REFUND',
      resolutionNote: row.resolutionNote, reviewerId: row.actorId, reviewedAt: {lte: row.ledgerAppliedAt}},
      data: {status: 'UNDER_REVIEW', resolution: null, resolutionNote: null, reviewedAt: null}});
    for (const [userId, href] of [[payment.booking.customerId, '/customer?view=bookings'], [payment.booking.transporterId, '/transporter/proceeds']]) {
      const notificationId = `refund-failed-${row.id}-${correction ? 'corrected' : 'review'}-${userId}`;
      const body = `The earlier £${(row.amountPence / 100).toFixed(2)} refund confirmation no longer applies: Stripe reported that the refund failed. ${correction ? 'This amount has been removed from the refunded total.' : 'The payment amounts need review.'} Please contact support. The transporter payout remains on hold.`;
      await tx.$executeRaw`INSERT INTO "Notification" ("id","userId","type","title","body","href","createdAt") VALUES (${notificationId},${userId},'PAYMENT','Customer refund failed',${body},${href},NOW()) ON CONFLICT ("id") DO NOTHING`;
    }
    return true;
  }, {timeout: 35_000, maxWait: 5_000});
}

// Read canonical parent state: Refund objects do not expose livemode. Unknown
// pending/external refunds or a charge dispute require explicit reconciliation.
async function sourceState(stripe: Stripe, payment: Payment, row?: StripeRefund) {
  const request = await prisma.availabilityRequest.findFirst({where: {bookingId: payment.bookingId,
    paymentIntentId: payment.providerReference, paymentProvider: 'STRIPE', paymentEnvironment: paymentEnvironment()}});
  if (!request?.paymentIntentId) return review('The captured sandbox payment could not be matched.');
  const intent = await stripe.paymentIntents.retrieve(request.paymentIntentId, {expand: ['latest_charge']});
  const charge = intent.latest_charge as Stripe.Charge | null;
  const chargeId = assertCapturedSource(intent, {...payment, environment: paymentEnvironment(), refundedPence: charge?.amount_refunded}, request);
  if (row && (row.sourceChargeId !== chargeId || row.paymentIntentId !== intent.id)) return review('Refund source changed.');
  const refunds = await listAll(cursor => stripe.refunds.list({charge: chargeId, limit: 100, ...(cursor ? {starting_after: cursor} : {})}));
  const known = await prisma.stripeRefund.findMany({where: {paymentId: payment.id, ledgerAppliedAt: {not: null}}});
  let own: Stripe.Refund | null = null;
  for (const refund of refunds) {
    if (row && (refund.id === row.stripeRefundId || refund.metadata?.driveDropRefundId === row.id)) {
      if (own) return review('Multiple Stripe refunds match this instruction.');
      assertStripeRefundMatches(refund, row); own = refund; continue;
    }
    if (['failed', 'canceled'].includes(refund.status || '')) continue;
    const prior = known.find(k => k.stripeRefundId === refund.id);
    if (!prior || !assertStripeRefundMatches(refund, prior).confirmed) return review('An external or pending refund needs reconciliation.');
  }
  for (const prior of known) if (!refunds.some(r => r.id === prior.stripeRefundId)) return review('A recorded refund is missing from Stripe.');
  if (row?.stripeRefundId && !own) return review('The recorded refund could not be found.');
  // A pending refund can already be included in the charge's refunded amount.
  const stripeTotal = stripeRefundedTotal(payment);
  const baseline = row?.ledgerAppliedAt ? stripeTotal : row?.priorRefundedPence ?? stripeTotal;
  const extra = own && !row?.ledgerAppliedAt && !['failed', 'canceled'].includes(own.status || '') ? own.amount : 0;
  const expected = baseline + extra;
  if (charge!.amount_refunded !== expected && !(own?.status === 'pending' && charge!.amount_refunded === baseline)) return review('Stripe and the booking refund balances differ.');
  return {chargeId, intentId: intent.id, refund: own};
}

function sameRequest(row: StripeRefund, input: RefundInput) {
  if (row.amountPence !== input.amountPence || row.disputeId !== (input.disputeId || null) || row.resolution !== (input.resolution || null)) {
    throw new ConnectError('A different refund already exists for this payment balance. Refresh before continuing.', 'REFUND_CONFLICT');
  }
  return row;
}

export async function prepareStripeRefund(input: RefundInput) {
  requireEnabled();
  const previous = await prisma.stripeRefund.findUnique({where: {paymentId_priorRefundedPence: {paymentId: input.paymentId, priorRefundedPence: input.expectedRefundedPence}}});
  if (previous) {
    if (previous.environment !== paymentEnvironment()) return review('Refund environment mismatch.');
    return sameRequest(previous, input);
  }
  const stripe = await verifiedConnectClient();
  const payment = await prisma.bookingPayment.findUniqueOrThrow({where: {id: input.paymentId}, include: paymentInclude});
  const source = await sourceState(stripe, payment);
  if (payment.stripePayout?.stripeTransferId) {
    const transfer = await stripe.transfers.retrieve(payment.stripePayout.stripeTransferId);
    assertTransferMatches(transfer, payment.stripePayout);
    if (transfer.amount_reversed !== payment.stripePayout.reversedPence) return review('Reconcile the transfer before requesting a refund.');
  }
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Booking" WHERE id=${payment.bookingId} FOR UPDATE`;
    const prior = await tx.stripeRefund.findUnique({where: {paymentId_priorRefundedPence: {paymentId: input.paymentId, priorRefundedPence: input.expectedRefundedPence}}});
    if (prior) return sameRequest(prior, input);
    if (await tx.stripeRefund.findUnique({where: {activePaymentId: input.paymentId}})) return review('Finish or review the existing refund first.');
    const fresh = await tx.bookingPayment.findUniqueOrThrow({where: {id: input.paymentId}, include: paymentInclude});
    if (fresh.paidPence !== payment.paidPence || fresh.providerReference !== source.intentId || fresh.refundedPence !== payment.refundedPence ||
        fresh.stripePayout?.reversedPence !== payment.stripePayout?.reversedPence) return review('Payment changed during refund preparation.');
    const plan = planStripeRefund(fresh, {...input, environment: paymentEnvironment()}, fresh.stripePayout);
    if (input.disputeId) {
      const dispute = fresh.booking.disputes.find(d => d.id === input.disputeId);
      if (!dispute || !['OPEN', 'UNDER_REVIEW'].includes(dispute.status) || !input.resolutionNote?.trim()) return review('An open dispute and review reason are required.');
      if (input.resolution === 'REFUND_CUSTOMER' ? !plan.fullyRefunded : input.resolution !== 'PARTIAL_REFUND' || plan.fullyRefunded || fresh.booking.status !== 'DELIVERED' || input.approvedProceedsPence !== plan.transporterProceedsPence) {
        return review('Review the refund and remaining transporter proceeds before resolving.');
      }
      await tx.dispute.update({where: {id: dispute.id}, data: {status: 'UNDER_REVIEW', reviewerId: input.actorId, reviewedAt: new Date()}});
    }
    const row = await tx.stripeRefund.create({data: {
      paymentId: fresh.id, activePaymentId: fresh.id, environment: paymentEnvironment(), paymentIntentId: source.intentId, sourceChargeId: source.chargeId,
      paidPence: fresh.paidPence, amountPence: plan.amountPence, priorRefundedPence: plan.priorRefundedPence,
      priorPlatformFeePence: fresh.platformFeePence, priorProceedsPence: fresh.transporterProceedsPence, priorDeductionPence: fresh.cancellationDeductionPence, priorPayoutStatus: fresh.payoutStatus,
      platformFeePence: plan.platformFeePence, transporterProceedsPence: plan.transporterProceedsPence, cancellationDeductionPence: plan.cancellationDeductionPence,
      fineRestorePence: plan.fineRestorePence, payoutId: fresh.stripePayout?.id, stripeTransferId: fresh.stripePayout?.stripeTransferId,
      requiredReversedPence: plan.requiredReversedPence, baselineReversedPence: fresh.stripePayout?.reversedPence || 0,
      recoveryAmountPence: plan.recoveryPence, recoveryStatus: plan.recoveryStatus,
      actorId: input.actorId, disputeId: input.disputeId, resolution: input.resolution, resolutionNote: input.resolutionNote?.trim(),
    }});
    await tx.bookingPayment.update({where: {id: fresh.id}, data: {payoutStatus: 'HELD'}});
    return row;
  }, {timeout: 20_000});
}

function assertLedgerUnchanged(payment: Payment, row: StripeRefund) {
  if (payment.providerReference !== row.paymentIntentId || payment.paidPence !== row.paidPence || payment.refundedPence !== row.priorRefundedPence ||
      payment.platformFeePence !== row.priorPlatformFeePence || payment.transporterProceedsPence !== row.priorProceedsPence ||
      payment.cancellationDeductionPence !== row.priorDeductionPence) return review('Payment ledger changed while the refund was pending.');
}

async function settlePayment(tx: Prisma.TransactionClient, row: StripeRefund, payment: Payment) {
  // A full refund with completed recovery is cancelled; an open recovery always
  // remains held. Released funds never become eligible for another transfer.
  const activeDisputes = await tx.dispute.count({where: {bookingId: payment.bookingId, status: {in: ['OPEN', 'UNDER_REVIEW']}}});
  const full = row.priorRefundedPence + row.amountPence === row.paidPence;
  const eligible = payment.booking.status === 'DELIVERED' && (!!payment.booking.customerConfirmedAt || !!row.disputeId || adminPayoutApproved(payment.booking.disputes, payment.events));
  const payoutStatus = !done(row) ? 'HELD' : full ? 'CANCELLED' : activeDisputes ? 'HELD' : row.payoutId ? 'PAID' :
    !row.disputeId && row.priorPayoutStatus === 'HELD' ? 'HELD' : eligible ? 'READY' : 'NOT_READY';
  await tx.bookingPayment.update({where: {id: payment.id}, data: {payoutStatus}});
  if (done(row) && !lateFailure(row)) await tx.stripeRefund.update({where: {id: row.id}, data: {activePaymentId: null}});
}

async function finishRefund(tx: Prisma.TransactionClient, row: StripeRefund, refund: Stripe.Refund) {
  const result = assertStripeRefundMatches(refund, row);
  if (row.ledgerAppliedAt) {
    if (!result.confirmed) return review('A confirmed refund has changed status.');
    return row;
  }
  const payment = await tx.bookingPayment.findUniqueOrThrow({where: {id: row.paymentId}, include: paymentInclude});
  assertLedgerUnchanged(payment, row);
  if (!result.confirmed) return tx.stripeRefund.update({where: {id: row.id}, data: {stripeRefundId: refund.id,
    status: result.failed ? 'FAILED' : result.status === 'requires_action' ? 'REVIEW' : 'PENDING_STRIPE',
    failureCode: result.failed ? 'STRIPE_REFUND_FAILED' : result.status === 'requires_action' ? 'REQUIRES_ACTION' : null,
    retryAfter: result.failed || result.status === 'requires_action' ? null : new Date(Date.now() + 60_000)}});
  await restoreRefundFines(tx, row, payment.booking.transporterId);
  const full = row.priorRefundedPence + row.amountPence === row.paidPence;
  await tx.bookingPayment.update({where: {id: payment.id}, data: {refundedPence: row.priorRefundedPence + row.amountPence,
    platformFeePence: row.platformFeePence, transporterProceedsPence: row.transporterProceedsPence,
    cancellationDeductionPence: row.cancellationDeductionPence, status: full ? 'REFUNDED' : 'PARTIALLY_REFUNDED'}});
  await tx.financeEvent.create({data: {paymentId: row.paymentId, actorId: row.actorId, type: 'REFUND_CREATED', amountPence: row.amountPence, note: `STRIPE_REFUND_CONFIRMED:${row.id}:${refund.id}`}});
  if (row.disputeId) {
    const changed = await tx.dispute.updateMany({where: {id: row.disputeId, bookingId: payment.bookingId, status: {in: ['OPEN', 'UNDER_REVIEW']}}, data: {
      status: 'RESOLVED', resolution: row.resolution as 'REFUND_CUSTOMER' | 'PARTIAL_REFUND', resolutionNote: row.resolutionNote, reviewerId: row.actorId, reviewedAt: new Date()}});
    if (!changed.count) return review('The reserved dispute was changed before refund confirmation.');
    if (!full) await tx.financeEvent.create({data: {paymentId: row.paymentId, type: 'PAYOUT_READY', amountPence: row.transporterProceedsPence, actorId: row.actorId, note: payoutApprovalMarker(row.disputeId)}});
  }
  // Durable, once-only in-app notifications are committed with the ledger.
  for (const [userId, href] of [[payment.booking.customerId, '/customer?view=bookings'], [payment.booking.transporterId, '/transporter/proceeds']]) {
    const body = `Stripe confirmed a customer refund of £${(row.amountPence / 100).toFixed(2)}. ${row.disputeId ? `The dispute is resolved. ${row.resolutionNote || ''}` : 'The payment breakdown has been updated.'}`;
    await tx.$executeRaw`INSERT INTO "Notification" ("id","userId","type","title","body","href","createdAt") VALUES (${randomUUID()},${userId},'PAYMENT','Customer refund confirmed',${body},${href},NOW())`;
  }
  const updated = await tx.stripeRefund.update({where: {id: row.id}, data: {stripeRefundId: refund.id, status: 'SUCCEEDED', ledgerAppliedAt: new Date(), failureCode: null, retryAfter: null}});
  await settlePayment(tx, updated, payment);
  return updated;
}

function assertReversal(reversal: Stripe.TransferReversal, row: StripeRefund) {
  const transferId = typeof reversal.transfer === 'string' ? reversal.transfer : reversal.transfer?.id;
  if (transferId !== row.stripeTransferId || reversal.currency !== 'gbp' || reversal.amount !== row.recoveryAmountPence ||
      reversal.metadata?.driveDropRefundId !== row.id || reversal.metadata?.environment !== row.environment || reversal.metadata?.paymentId !== row.paymentId) return review('The reversal does not match this refund.');
}

async function recoverTransfer(stripe: Stripe, original: StripeRefund, token: string, bookingId: string) {
  if (!original.payoutId || !original.stripeTransferId || ['NOT_REQUIRED', 'RECOVERED'].includes(original.recoveryStatus)) return;
  const payout = await prisma.stripePayout.findUniqueOrThrow({where: {id: original.payoutId}});
  if (payout.paymentId !== original.paymentId || payout.stripeTransferId !== original.stripeTransferId) return review('The release instruction changed.');
  const transfer = await stripe.transfers.retrieve(original.stripeTransferId);
  assertTransferMatches(transfer, payout);
  const reversals = await listAll(cursor => stripe.transfers.listReversals(transfer.id, {limit: 100, ...(cursor ? {starting_after: cursor} : {})}));
  const matches = reversals.filter(r => r.id === original.stripeReversalId || r.metadata?.driveDropRefundId === original.id);
  if (matches.length > 1 || (original.stripeReversalId && !matches.length)) return review('Reversal history needs review.');
  let reversal = matches[0] || null;
  if (reversal) assertReversal(reversal, original);
  if (transfer.amount_reversed > original.requiredReversedPence) return review('More funds were reversed than required; manual review is needed.');
  if (!reversal && transfer.amount_reversed < original.requiredReversedPence) {
    if (transfer.amount_reversed !== original.baselineReversedPence) return review('An external reversal changed the recovery amount.');
    if (!refundCreateRetrySafe(original.recoveryFirstAttemptAt)) return review('An old recovery attempt needs manual reconciliation.');
    await prisma.stripeRefund.updateMany({where: {id: original.id, leaseToken: token, recoveryFirstAttemptAt: null}, data: {recoveryFirstAttemptAt: new Date()}});
  }
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Booking" WHERE id=${bookingId} FOR UPDATE`;
    const row = await tx.stripeRefund.findUniqueOrThrow({where: {id: original.id}});
    if (row.leaseToken !== token || !row.ledgerAppliedAt || done(row) || lateFailure(row) || row.recoveryFailureCode === 'PRIOR_REFUND_FAILED') return;
    if (!reversal && transfer.amount_reversed < row.requiredReversedPence) {
      if (!refundCreateRetrySafe(row.recoveryFirstAttemptAt)) return review('Recovery retry expired.');
      reversal = await stripe.transfers.createReversal(transfer.id, {amount: row.recoveryAmountPence,
        metadata: {driveDropRefundId: row.id, paymentId: row.paymentId, environment: row.environment}},
        {idempotencyKey: `dd-refund-reversal-${row.environment}-${row.id}`});
      assertReversal(reversal, row);
    }
    const canonical = await stripe.transfers.retrieve(transfer.id);
    assertTransferMatches(canonical, payout);
    if (canonical.amount_reversed !== row.requiredReversedPence) return review('Transfer recovery is not balanced.');
    await tx.stripePayout.update({where: {id: payout.id}, data: {reversedPence: canonical.amount_reversed,
      status: canonical.amount_reversed ? 'REVERSED' : 'TRANSFERRED', failureCode: canonical.amount_reversed ? 'REVERSED' : null}});
    const updated = await tx.stripeRefund.update({where: {id: row.id}, data: {recoveryStatus: 'RECOVERED', stripeReversalId: reversal?.id, recoveryFailureCode: null, retryAfter: null}});
    await tx.financeEvent.create({data: {paymentId: row.paymentId, actorId: row.actorId, type: 'PAYMENT_CREATED', amountPence: row.recoveryAmountPence,
      note: `STRIPE_REFUND_RECOVERED:${row.id}:${reversal?.id || 'canonical-transfer'}`}});
    const payment = await tx.bookingPayment.findUniqueOrThrow({where: {id: row.paymentId}, include: paymentInclude});
    await settlePayment(tx, updated, payment);
  }, {timeout: 35_000, maxWait: 5_000});
}

export async function reconcileStripeRefund(id: string) {
  if (!connectEnabled()) requireEnabled();
  await reconcileStripeRefundFailure(id);
  const original = await prisma.stripeRefund.findUniqueOrThrow({where: {id}, include: {payment: {select: {bookingId: true}}}});
  if (original.environment !== paymentEnvironment()) return review('Refund environment mismatch.');
  if (lateFailure(original) || done(original) || original.status === 'FAILED' || original.failureCode === 'PRIOR_REFUND_FAILED' || original.recoveryFailureCode === 'PRIOR_REFUND_FAILED') return original;
  requireEnabled();
  const token = randomUUID();
  const claimed = await prisma.stripeRefund.updateMany({where: {id, OR: [{leaseUntil: null}, {leaseUntil: {lt: new Date()}}]},
    data: {leaseUntil: new Date(Date.now() + 180_000), leaseToken: token, attemptCount: {increment: 1}}});
  if (!claimed.count) return original;
  try {
    const stripe = await verifiedConnectClient();
    const payment = await prisma.bookingPayment.findUniqueOrThrow({where: {id: original.paymentId}, include: paymentInclude});
    const source = await sourceState(stripe, payment, original);
    if (!source.refund && original.ledgerAppliedAt) return review('A confirmed Stripe refund is missing.');
    if (!source.refund) {
      if (!refundCreateRetrySafe(original.firstAttemptAt)) return review('An old refund attempt needs manual reconciliation.');
      await prisma.stripeRefund.updateMany({where: {id, leaseToken: token, firstAttemptAt: null}, data: {firstAttemptAt: new Date()}});
    }
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Booking" WHERE id=${original.payment.bookingId} FOR UPDATE`;
      const row = await tx.stripeRefund.findUniqueOrThrow({where: {id}});
      if (row.leaseToken !== token || lateFailure(row) || row.failureCode === 'PRIOR_REFUND_FAILED' || row.recoveryFailureCode === 'PRIOR_REFUND_FAILED') return;
      if (source.refund) {await finishRefund(tx, row, source.refund); return;}
      const fresh = await tx.bookingPayment.findUniqueOrThrow({where: {id: row.paymentId}, include: paymentInclude});
      assertLedgerUnchanged(fresh, row);
      if (!refundCreateRetrySafe(row.firstAttemptAt)) return review('Refund retry expired.');
      const refund = await stripe.refunds.create({charge: row.sourceChargeId, amount: row.amountPence,
        metadata: {driveDropRefundId: row.id, paymentId: row.paymentId, environment: row.environment}}, {idempotencyKey: refundIdempotencyKey(row)});
      await finishRefund(tx, row, refund);
    }, {timeout: 30_000, maxWait: 5_000});
    const fresh = await prisma.stripeRefund.findUniqueOrThrow({where: {id}});
    if (fresh.leaseToken === token && fresh.ledgerAppliedAt) await recoverTransfer(stripe, fresh, token, original.payment.bookingId);
  } catch (error) {
    const code = connectFailureCode(error);
    const needsReview = !['RETRY_PENDING'].includes(code);
    const fresh = await prisma.stripeRefund.findUniqueOrThrow({where: {id}});
    if (fresh.leaseToken === token && !done(fresh)) await prisma.stripeRefund.updateMany({where: {id, leaseToken: token}, data: {
      ...(fresh.ledgerAppliedAt ? {recoveryStatus: needsReview ? 'REVIEW' : 'RETRY', recoveryFailureCode: code} : {status: needsReview ? 'REVIEW' : 'RETRY', failureCode: code}),
      retryAfter: needsReview ? null : new Date(Date.now() + 60_000),
    }});
    console.error('Stripe refund reconciliation deferred', {refundId: id, code});
  } finally {
    await prisma.stripeRefund.updateMany({where: {id, leaseToken: token}, data: {leaseUntil: null, leaseToken: null}});
  }
  return prisma.stripeRefund.findUniqueOrThrow({where: {id}});
}

export async function recoverStripeRefunds() {
  if (!connectEnabled()) return {checked: 0, failed: 0};
  const completed = await prisma.stripeRefund.findMany({where: {environment: paymentEnvironment(), ledgerAppliedAt: {not: null},
    OR: [{status: 'SUCCEEDED'}, {failureCode: LATE_REFUND_REVIEW}]}, orderBy: {updatedAt: 'asc'}, take: 1});
  let checked = completed.length, failed = 0;
  for (const row of completed) {
    try {await reconcileStripeRefundFailure(row.id);}
    catch (error) {
      failed++;
      // Rotate a transient read failure so one account cannot starve the scan.
      await prisma.stripeRefund.update({where: {id: row.id}, data: {updatedAt: new Date()}});
      console.error('Stripe refund outcome check deferred', {refundId: row.id, code: connectFailureCode(error)});
    }
  }
  if (!stripeRefundsEnabled()) return {checked, failed};
  const rows = await prisma.stripeRefund.findMany({where: {environment: paymentEnvironment(), activePaymentId: {not: null},
    OR: [{status: {in: ['PENDING', 'RETRY', 'PENDING_STRIPE']}}, {status: 'SUCCEEDED', recoveryStatus: {in: ['PENDING', 'RETRY']}}],
    AND: [{OR: [{retryAfter: null}, {retryAfter: {lte: new Date()}}]}, {OR: [{leaseUntil: null}, {leaseUntil: {lt: new Date()}}]}]}, orderBy: {updatedAt: 'asc'}, take: 1});
  checked += rows.length;
  for (const row of rows) if (!done(await reconcileStripeRefund(row.id))) failed++;
  return {checked, failed};
}

export async function handleStripeRefundEvent(event: any) {
  if (!connectEnabled() || event.account || event.livemode !== false) return;
  const object = event.data?.object;
  const chargeId = event.type.startsWith('charge.dispute.') ? (typeof object?.charge === 'string' ? object.charge : object?.charge?.id) : event.type === 'charge.refunded' ? object?.id : object?.charge;
  if (typeof chargeId !== 'string') return;
  const completed = await prisma.stripeRefund.findMany({where: {sourceChargeId: chargeId, environment: paymentEnvironment(), ledgerAppliedAt: {not: null}}});
  for (const row of completed) await reconcileStripeRefundFailure(row.id);
  const rows = await prisma.stripeRefund.findMany({where: {sourceChargeId: chargeId, environment: paymentEnvironment(), activePaymentId: {not: null}}});
  // The creation flag gates money movement, not canonical safety checks. Stripe
  // can dispute an existing charge while new refunds are switched off.
  if (stripeRefundsEnabled()) for (const row of rows) await reconcileStripeRefund(row.id);
  // External refunds/disputes on a booking with no active instruction must also
  // hold future release. Never mirror event amounts into the accounting ledger.
  const intentId = typeof object?.payment_intent === 'string' ? object.payment_intent : object?.payment_intent?.id;
  if (!intentId) return;
  const payment = await prisma.bookingPayment.findFirst({where: {provider: 'STRIPE', providerReference: intentId}, include: paymentInclude});
  if (!payment || rows.length) return;
  try {await sourceState(await verifiedConnectClient(), payment);}
  catch (error) {
    if (!(error instanceof ConnectError) || !['PAYMENT_MISMATCH', 'REFUND_REVIEW', 'ALTERNATIVE_REFUND_REVIEW'].includes(error.code)) throw error;
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Booking" WHERE id=${payment.bookingId} FOR UPDATE`;
      await tx.bookingPayment.update({where: {id: payment.id}, data: {payoutStatus: 'HELD'}});
      // The event signals review only; a canonical read blocked the operation.
    });
  }
}
