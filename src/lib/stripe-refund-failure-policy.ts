import {ConnectError} from './stripe-connect-provider';
import type {RefundPayment} from './stripe-refund-policy';

export const LATE_REFUND_FAILED = 'STRIPE_REFUND_FAILED_AFTER_SUCCESS';
export const LATE_REFUND_REVIEW = 'LATE_REFUND_FAILURE_REVIEW';

// Compensate only the failed instruction's original accounting delta. Restoring
// an old payment snapshot would erase later successful refunds. Actual fine
// deductions and transfer reversals stay recorded; release remains held.
export function failedRefundAmounts(payment: RefundPayment, row: {
  amountPence: number; paidPence: number; priorPlatformFeePence: number;
  platformFeePence: number; priorRefundedPence: number;
  priorProceedsPence: number; priorDeductionPence: number;
  transporterProceedsPence: number; cancellationDeductionPence: number;
}, recordedRefundedPence: number) {
  const amounts = [payment.paidPence, payment.refundedPence, payment.platformFeePence,
    payment.transporterProceedsPence, payment.cancellationDeductionPence, recordedRefundedPence,
    ...Object.values(row)];
  const feeReturned = row.priorPlatformFeePence - row.platformFeePence;
  if (amounts.some(n => !Number.isSafeInteger(n) || n < 0 || n > 2_147_483_647) ||
      payment.provider !== 'STRIPE' || payment.currency.toUpperCase() !== 'GBP' ||
      payment.paidPence !== row.paidPence || payment.refundedPence !== recordedRefundedPence ||
      row.amountPence <= 0 || payment.refundedPence < row.amountPence || feeReturned < 0 || feeReturned > row.amountPence ||
      payment.platformFeePence + payment.transporterProceedsPence + payment.cancellationDeductionPence !== payment.paidPence - payment.refundedPence ||
      row.priorPlatformFeePence + row.priorProceedsPence + row.priorDeductionPence !== row.paidPence - row.priorRefundedPence ||
      row.platformFeePence + row.transporterProceedsPence + row.cancellationDeductionPence !== row.paidPence - row.priorRefundedPence - row.amountPence) {
    throw new ConnectError('The failed refund accounting needs reconciliation.', 'REFUND_REVIEW');
  }
  const refundedPence = payment.refundedPence - row.amountPence;
  return {refundedPence, platformFeePence: payment.platformFeePence + feeReturned,
    transporterProceedsPence: payment.transporterProceedsPence + row.amountPence - feeReturned,
    status: refundedPence ? 'PARTIALLY_REFUNDED' as const : 'PAID' as const,
    payoutStatus: 'HELD' as const};
}
