/** Read-only estimate. Release remains authoritative and recalculates deductions. */
export type OutstandingPayoutFine = {transporterId: string; outstandingPence: number; createdAt: Date | string};
type PreviewPayment = {
  id: string;
  payoutStatus: string;
  transporterProceedsPence: number;
  booking: {transporterId: string; status: string; customerConfirmedAt: Date | string | null; trackingEvents?: {createdAt: Date | string}[]};
};

export function payoutFinePreview(payment: PreviewPayment, payments: PreviewPayment[], fines: OutstandingPayoutFine[], now = new Date()) {
  if (payment.payoutStatus === 'PAID') return null;
  const owner = payment.booking.transporterId;
  const proceeds = Math.max(0, payment.transporterProceedsPence);
  const completedAt = new Date(payment.booking.customerConfirmedAt || payment.booking.trackingEvents?.[0]?.createdAt || now).getTime();
  // A fine belongs to an earlier unpaid completion if that completion happened
  // on or after the fine. Only the most recent such completion is needed.
  let earlierCompletion = -Infinity;
  for (const other of payments) {
    if (other.id === payment.id || other.booking.transporterId !== owner || other.booking.status !== 'DELIVERED' ||
        !other.booking.customerConfirmedAt || !['READY', 'HELD', 'PROCESSING', 'FAILED'].includes(other.payoutStatus)) continue;
    const at = new Date(other.booking.customerConfirmedAt).getTime();
    if (at < completedAt) earlierCompletion = Math.max(earlierCompletion, at);
  }
  let outstandingPence = 0;
  let eligiblePence = 0;
  for (const fine of fines) {
    if (fine.transporterId !== owner) continue;
    const balance = Math.max(0, fine.outstandingPence);
    const issued = new Date(fine.createdAt).getTime();
    outstandingPence += balance;
    if (issued > earlierCompletion && issued <= completedAt) eligiblePence += balance;
  }
  const expectedDeductionPence = Math.min(proceeds, eligiblePence);
  return {outstandingPence, eligiblePence, expectedDeductionPence, netPayoutPence: proceeds - expectedDeductionPence};
}
