import type {Prisma, StripeRefund} from '@prisma/client';
import {ConnectError} from './stripe-connect-provider';

// Called under the booking lock, in the same transaction as the confirmed
// customer refund. Reverse the newest deductions first, preserving an audit.
export async function restoreRefundFines(tx: Prisma.TransactionClient, row: StripeRefund, transporterId: string) {
  if (!row.fineRestorePence) return;
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`dd-payout-fines-${transporterId}`}))::text`;
  const cancellations = await tx.transporterCancellationDeduction.findMany({where: {paymentId: row.paymentId}, orderBy: [{createdAt: 'desc'}, {id: 'desc'}]});
  const disputes = await tx.financeEvent.groupBy({by: ['note'], where: {paymentId: row.paymentId, note: {startsWith: 'ADMIN_DISPUTE_FINE_APPLIED:'}}, _sum: {amountPence: true}, orderBy: {note: 'desc'}});
  const total = cancellations.reduce((n, d) => n + d.amountPence, 0) + disputes.reduce((n, d) => n + (d._sum.amountPence || 0), 0);
  if (total !== row.priorDeductionPence) throw new ConnectError('Fine deductions need reconciliation.', 'REFUND_REVIEW');
  let remaining = row.fineRestorePence;
  const audit = (amountPence: number, source: string) => tx.financeEvent.create({data: {
    paymentId: row.paymentId, type: 'PAYMENT_CREATED', actorId: row.actorId, amountPence,
    note: `STRIPE_REFUND_FINE_RESTORED:${row.id}:${source}`,
  }});
  // Dispute fines were applied after cancellation fines, so restore these first.
  for (const fine of disputes) {
    const amount = Math.min(remaining, fine._sum.amountPence || 0);
    if (amount <= 0) continue;
    // A signed counter-entry keeps the original fine/application intact and is
    // included by the existing outstanding-fine sum on future bookings.
    await tx.financeEvent.create({data: {paymentId: row.paymentId, type: 'PAYMENT_CREATED', amountPence: -amount, actorId: row.actorId, note: fine.note}});
    await audit(amount, fine.note!);
    remaining -= amount;
  }
  for (const deduction of cancellations) {
    const amount = Math.min(remaining, deduction.amountPence);
    if (amount <= 0) continue;
    const fee = await tx.transporterCancellationFee.findUniqueOrThrow({where: {id: deduction.feeId}});
    if (fee.transporterId !== transporterId || fee.appliedPence < amount) throw new ConnectError('Fine ownership or balance changed.', 'REFUND_REVIEW');
    await audit(amount, `CANCELLATION:${fee.id}`);
    if (amount === deduction.amountPence) await tx.transporterCancellationDeduction.delete({where: {id: deduction.id}});
    else await tx.transporterCancellationDeduction.update({where: {id: deduction.id}, data: {amountPence: {decrement: amount}}});
    const appliedPence = fee.appliedPence - amount;
    await tx.transporterCancellationFee.update({where: {id: fee.id}, data: {appliedPence, appliedAt: null,
      status: fee.status === 'WAIVED' ? 'WAIVED' : appliedPence ? 'PARTIALLY_APPLIED' : 'PENDING'}});
    remaining -= amount;
  }
  if (remaining) throw new ConnectError('Fine restoration does not balance.', 'REFUND_REVIEW');
}
