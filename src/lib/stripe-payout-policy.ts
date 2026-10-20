import {adminPayoutApproved, capturedPayment, payoutWindowOpen} from './payout-policy';
import {ConnectError, CONNECT_RETRY_WINDOW_MS} from './stripe-connect-provider';

export function assertPayoutEligible(payment: any, reserved = false) {
  const booking = payment.booking;
  if (payment.provider !== 'STRIPE' || payment.currency.toUpperCase() !== 'GBP') throw new ConnectError('This payment is not a GBP Stripe booking.', 'PAYMENT_MISMATCH');
  if (booking.status !== 'DELIVERED') throw new ConnectError('Delivery must be completed first.', 'PAYOUT_HELD');
  if (!booking.customerConfirmedAt && !adminPayoutApproved(booking.disputes, payment.events)) throw new ConnectError('Customer confirmation or an approved dispute resolution is required.', 'PAYOUT_HELD');
  if (!payoutWindowOpen({...booking, payment}, payment.events)) throw new ConnectError('The payout is protected by the 24-hour review window or an active dispute.', 'PAYOUT_HELD');
  if (!capturedPayment(payment.status)) throw new ConnectError('Customer payment is not captured.', 'PAYMENT_MISMATCH');
  if (!reserved && payment.payoutStatus !== 'READY') throw new ConnectError('Payout is not ready for release.', 'PAYOUT_HELD');
  const deduction = reserved ? payment.cancellationDeductionPence : 0;
  if (payment.transporterProceedsPence < 0 || payment.transporterProceedsPence + deduction + payment.platformFeePence !== payment.paidPence - payment.refundedPence) {
    throw new ConnectError('Payment amounts need an administrator review.', 'PAYMENT_MISMATCH');
  }
}

export function assertCapturedSource(intent: any, payment: any, request: any, options: {allowDisputed?: boolean} = {}) {
  const charge = intent.latest_charge;
  if (request.paymentProvider !== 'STRIPE' || request.paymentEnvironment !== payment.environment ||
      request.status !== 'BOOKED' || request.authorisedAmountPence !== payment.paidPence || request.bookingId !== payment.bookingId || request.paymentIntentId !== intent.id ||
      intent.livemode !== false || intent.capture_method !== 'manual' || intent.status !== 'succeeded' || intent.currency !== 'gbp' ||
      intent.amount_received !== payment.paidPence || intent.amount !== payment.paidPence ||
      intent.metadata?.availabilityRequestId !== request.id || intent.metadata?.environment !== payment.environment ||
      !charge || typeof charge === 'string' || charge.livemode !== false || !charge.paid || !charge.captured ||
      (!options.allowDisputed && charge.disputed) || charge.amount_refunded !== payment.refundedPence || charge.currency !== 'gbp' ||
      charge.amount !== payment.paidPence || charge.payment_intent !== intent.id) {
    throw new ConnectError('The captured Stripe payment needs review before release.', 'PAYMENT_MISMATCH');
  }
  return charge.id as string;
}

export function assertTransferMatches(transfer: any, payout: any) {
  const destination = typeof transfer.destination === 'string' ? transfer.destination : transfer.destination?.id;
  const source = typeof transfer.source_transaction === 'string' ? transfer.source_transaction : transfer.source_transaction?.id;
  if (transfer.livemode !== false || transfer.amount !== payout.amountPence || transfer.currency !== 'gbp' ||
      destination !== payout.destinationAccountId || source !== payout.sourceChargeId ||
      transfer.transfer_group !== `dd_payout_${payout.id}` ||
      transfer.metadata?.driveDropPayoutId !== payout.id || transfer.metadata?.environment !== payout.environment) {
    throw new ConnectError('The Stripe transfer does not match this payout.', 'TRANSFER_MISMATCH');
  }
}

export function payoutRetrySafe(firstAttemptAt: Date | null, now = Date.now()) {
  return !firstAttemptAt || now - firstAttemptAt.getTime() < CONNECT_RETRY_WINDOW_MS;
}
