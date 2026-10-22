import type {BookingPayment, StripeRefund} from '@prisma/client';
import {ConnectError} from './stripe-connect-provider';
import {LATE_REFUND_FAILED} from './stripe-refund-failure-policy';
import {supportedPaymentEnvironment} from './payment-runtime';

export const ALTERNATIVE_METHODS = ['BANK_TRANSFER', 'CHEQUE', 'OTHER'] as const;
export function alternativeReview(message: string): never {throw new ConnectError(message, 'ALTERNATIVE_REFUND_REVIEW');}
type Payment = BookingPayment & {
  stripePayout?: unknown; alternativeRefund?: unknown; stripeRefunds: StripeRefund[];
  booking: {disputes: {status: string}[]};
};

// Deliberately narrow first release: one terminal full refund, before any payout,
// deduction or dispute. Other cases require an independently reviewed recovery.
export function assertAlternativeEligible(payment: Payment, failedRefundId: string, amountPence: number, environment: string) {
  const row = payment.stripeRefunds.find(r => r.id === failedRefundId);
  if (!supportedPaymentEnvironment(environment)) alternativeReview('Unsupported alternative refund environment.');
  if (payment.alternativeRefund) alternativeReview('An alternative repayment is already recorded. Refresh this payment.');
  if (!row || payment.stripeRefunds.length !== 1 || row.environment !== environment || row.paymentId !== payment.id ||
      row.status !== 'FAILED' || !['STRIPE_REFUND_FAILED', LATE_REFUND_FAILED].includes(row.failureCode || '') ||
      !row.stripeRefundId || row.activePaymentId !== payment.id || row.leaseToken || row.leaseUntil || row.retryAfter ||
      row.recoveryStatus !== 'NOT_REQUIRED' || row.recoveryAmountPence !== 0 || row.recoveryFailureCode ||
      row.stripeTransferId || row.payoutId || row.stripeReversalId || row.requiredReversedPence || row.baselineReversedPence ||
      row.priorRefundedPence !== 0 || row.priorDeductionPence !== 0 || row.fineRestorePence !== 0 ||
      !['NOT_READY', 'READY'].includes(row.priorPayoutStatus) || row.disputeId ||
      (row.failureCode === LATE_REFUND_FAILED) !== !!row.ledgerAppliedAt) {
    alternativeReview('This failed refund needs separate review before an alternative repayment can be recorded.');
  }
  if (payment.provider !== 'STRIPE' || payment.currency !== 'GBP' || payment.providerReference !== row.paymentIntentId ||
      payment.status !== 'PAID' || payment.payoutStatus !== 'HELD' || payment.refundedPence !== 0 ||
      payment.stripePayout || payment.cancellationDeductionPence !== 0 || payment.booking.disputes.length > 0 ||
      !Number.isSafeInteger(amountPence) || amountPence <= 0 || amountPence !== payment.paidPence ||
      row.amountPence !== amountPence || row.paidPence !== amountPence ||
      payment.platformFeePence < 0 || payment.transporterProceedsPence < 0 ||
      payment.platformFeePence + payment.transporterProceedsPence !== payment.paidPence) {
    alternativeReview('Only a full unpaid refund with no payout, deduction or dispute can be recorded here.');
  }
  return row;
}

export function alternativeRefundAvailable(payment: Payment, environment: string) {
  try {assertAlternativeEligible(payment, payment.stripeRefunds[0]?.id || '', payment.paidPence, environment); return true;}
  catch {return false;}
}

// Canonical Stripe totals exclude repayments made outside Stripe. Ordinary
// customer totals continue to use the combined BookingPayment.refundedPence.
export function stripeRefundedTotal(payment: {refundedPence: number; alternativeRefund?: {amountPence: number; stripeRefundedPence: number} | null}) {
  const external = payment.alternativeRefund;
  const total = payment.refundedPence - (external?.amountPence || 0);
  if (!Number.isSafeInteger(total) || total < 0 || external && total !== external.stripeRefundedPence) {
    alternativeReview('The Stripe and alternative repayment totals need reconciliation.');
  }
  return total;
}
