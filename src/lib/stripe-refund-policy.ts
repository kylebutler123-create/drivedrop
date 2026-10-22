import {ConnectError, CONNECT_RETRY_WINDOW_MS} from './stripe-connect-provider';
import {supportedPaymentEnvironment} from './payment-runtime';

// Planning only: callers must persist the instruction under the shared booking
// lock before contacting Stripe. This module never sends money or edits a ledger.
export type RefundPayment = {
  id: string; provider: string; providerReference: string | null; currency: string;
  status: string; payoutStatus: string; paidPence: number; refundedPence: number;
  platformFeePence: number; transporterProceedsPence: number; cancellationDeductionPence: number;
};
export type RefundRelease = {
  paymentId: string; environment: string; paymentIntentId: string; status: string;
  amountPence: number; finePence: number; reversedPence: number; stripeTransferId: string | null;
};
export type RefundInstructionIdentity = {
  id: string; paymentId: string; environment: string; paymentIntentId: string;
  sourceChargeId: string; amountPence: number;
};
const fail = (message: string, code = 'REFUND_REVIEW'): never => {throw new ConnectError(message, code);};
const pence = (value: number) => Number.isInteger(value) && value >= 0 && value <= 2_147_483_647;
const supportedEnvironment = supportedPaymentEnvironment;

export function planStripeRefund(payment: RefundPayment, input: {
  amountPence: number; expectedRefundedPence: number; environment: string;
}, release: RefundRelease | null = null) {
  if (!supportedEnvironment(input.environment)) fail('Unsupported refund environment.');
  if (payment.provider !== 'STRIPE' || payment.currency.toUpperCase() !== 'GBP' ||
      !payment.providerReference?.startsWith('pi_')) fail('This is not a GBP Stripe booking.');
  if (![payment.paidPence, payment.refundedPence, payment.platformFeePence,
    payment.transporterProceedsPence, payment.cancellationDeductionPence,
    input.amountPence, input.expectedRefundedPence].every(pence)) fail('Payment amounts need review.');
  if (input.expectedRefundedPence !== payment.refundedPence) fail('The refund balance changed. Refresh before continuing.', 'REFUND_CONFLICT');
  if (!['PAID', 'PARTIALLY_REFUNDED'].includes(payment.status)) fail('A captured customer payment is required.');
  const balance = payment.paidPence - payment.refundedPence;
  if (balance <= 0 || input.amountPence <= 0 || input.amountPence > balance) fail('Refund exceeds the remaining paid balance.');
  if (payment.platformFeePence + payment.transporterProceedsPence + payment.cancellationDeductionPence !== balance) {
    fail('The payment ledger does not balance.');
  }
  if (release) {
    if (release.paymentId !== payment.id || release.environment !== input.environment ||
        release.paymentIntentId !== payment.providerReference ||
        ![release.amountPence, release.finePence, release.reversedPence].every(pence) ||
        release.reversedPence > release.amountPence || release.finePence < payment.cancellationDeductionPence ||
        release.amountPence + release.finePence > payment.paidPence) {
      fail('The recorded release does not match this payment.');
    }
    if (!['TRANSFERRED', 'REVERSED', 'DEDUCTED'].includes(release.status)) {
      fail('Reconcile the existing payout before refunding.', 'PAYOUT_RECONCILIATION_REQUIRED');
    }
    if (release.status === 'DEDUCTED' ? release.amountPence !== 0 || !!release.stripeTransferId :
        release.amountPence <= 0 || !release.stripeTransferId?.startsWith('tr_')) fail('The recorded transfer needs review.');
    if ((release.status === 'REVERSED') !== (release.reversedPence > 0)) fail('Reconcile the transfer reversal before refunding.');
    if (release.amountPence - release.reversedPence < payment.transporterProceedsPence && release.status !== 'REVERSED') {
      fail('The released amount does not match the current proceeds.');
    }
  } else if (payment.cancellationDeductionPence || ['PAID', 'PROCESSING', 'FAILED'].includes(payment.payoutStatus)) {
    fail('Reconcile the existing payout before refunding.', 'PAYOUT_RECONCILIATION_REQUIRED');
  }
  const remainingPence = balance - input.amountPence;
  // Preserve the recorded fee proportion. Integer arithmetic also avoids losing
  // pennies when multiplying values near the database integer limit.
  const two = BigInt(2);
  const platformFeePence = Number((two * BigInt(payment.platformFeePence) * BigInt(remainingPence) + BigInt(balance)) / (two * BigInt(balance)));
  const grossProceedsPence = remainingPence - platformFeePence;
  const cancellationDeductionPence = Math.min(payment.cancellationDeductionPence, grossProceedsPence);
  const fineRestorePence = payment.cancellationDeductionPence - cancellationDeductionPence;
  const transporterProceedsPence = grossProceedsPence - cancellationDeductionPence;
  // Refunds do not reverse separate transfers. Recover only the excess already
  // sent; manual over-reversals need review, never an automatic new transfer.
  const requiredReversedPence = release ? Math.max(0, release.amountPence - transporterProceedsPence) : 0;
  const recoveryPence = release ? Math.max(0, requiredReversedPence - release.reversedPence) : 0;
  const excessReversedPence = release ? Math.max(0, release.reversedPence - requiredReversedPence) : 0;
  return {
    amountPence: input.amountPence, priorRefundedPence: payment.refundedPence,
    refundedPence: payment.refundedPence + input.amountPence, remainingPence,
    platformFeePence, transporterProceedsPence, cancellationDeductionPence,
    fineRestorePence, requiredReversedPence, recoveryPence, excessReversedPence,
    fullyRefunded: remainingPence === 0,
    recoveryStatus: excessReversedPence ? 'REVIEW' : recoveryPence ? 'PENDING' : 'NOT_REQUIRED',
  } as const;
}

export function refundIdempotencyKey(instruction: RefundInstructionIdentity) {
  if (!supportedEnvironment(instruction.environment) || !/^[a-zA-Z0-9_-]{1,100}$/.test(instruction.id)) fail('Invalid refund instruction.');
  return `dd-refund-${instruction.environment}-${instruction.id}`;
}

export function refundCreateRetrySafe(firstAttemptAt: Date | null, now = Date.now()) {
  if (!firstAttemptAt) return true;
  const age = now - firstAttemptAt.getTime();
  return Number.isFinite(age) && age >= 0 && age < CONNECT_RETRY_WINDOW_MS;
}

// The caller must retrieve and verify the parent charge in the configured
// environment. A v1 Refund does not itself expose a livemode property.
export function assertStripeRefundMatches(refund: {
  id: string; amount: number; currency: string; status?: string | null;
  charge: string | {id: string} | null; payment_intent: string | {id: string} | null;
  metadata?: Record<string, string> | null;
}, instruction: RefundInstructionIdentity) {
  const charge = typeof refund.charge === 'string' ? refund.charge : refund.charge?.id;
  const intent = typeof refund.payment_intent === 'string' ? refund.payment_intent : refund.payment_intent?.id;
  if (!supportedEnvironment(instruction.environment) || !refund.id.startsWith('re_') ||
      refund.amount !== instruction.amountPence || refund.currency !== 'gbp' ||
      charge !== instruction.sourceChargeId || intent !== instruction.paymentIntentId ||
      refund.metadata?.driveDropRefundId !== instruction.id || refund.metadata?.paymentId !== instruction.paymentId ||
      refund.metadata?.environment !== instruction.environment) fail('The Stripe refund does not match this instruction.', 'REFUND_MISMATCH');
  if (!['pending', 'requires_action', 'succeeded', 'failed', 'canceled'].includes(refund.status || '')) {
    fail('The Stripe refund status needs review.', 'REFUND_MISMATCH');
  }
  return {confirmed: refund.status === 'succeeded', failed: ['failed', 'canceled'].includes(refund.status!), status: refund.status!};
}
