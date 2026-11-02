import {Prisma} from '@prisma/client';
import {prisma} from '@/lib/prisma';

export type OpenFine = {
  id: string;
  transporterId: string;
  bookingId: string;
  kind: 'Cancellation' | 'Dispute';
  createdAt: Date;
  originalPence: number;
  recoveredPence: number;
  outstandingPence: number;
};

export type FineSummary = {
  outstandingPence: number;
  cancellationCount: number;
  cancellationPence: number;
  disputeCount: number;
  disputePence: number;
};

export type FineBalance = FineSummary & {
  transporterId: string;
  name: string;
  references: string[];
};

type Reader = Pick<Prisma.TransactionClient, '$queryRaw'>;

// Applied dispute entries include signed restorations after refunds. Aggregate
// them by their original dispute, even when recovered on a different booking.
const openFineRows = Prisma.sql`
  SELECT f.*, (f."originalPence" - f."recoveredPence") AS "outstandingPence"
  FROM (
    SELECT c.id, c."transporterId", c."cancelledBookingId" AS "bookingId",
           'Cancellation' AS kind, c."createdAt", c."amountPence" AS "originalPence",
           c."appliedPence" AS "recoveredPence"
    FROM "TransporterCancellationFee" c
    WHERE c.status IN ('PENDING', 'PARTIALLY_APPLIED')
    UNION ALL
    SELECT fine.id, b."transporterId", b.id, 'Dispute', fine."createdAt", fine."amountPence",
           COALESCE(recovery.pence, 0)::integer
    FROM "FinanceEvent" fine
    JOIN "BookingPayment" p ON p.id = fine."paymentId"
    JOIN "Booking" b ON b.id = p."bookingId"
    LEFT JOIN (
      SELECT note, SUM("amountPence") AS pence FROM "FinanceEvent"
      WHERE starts_with(note, 'ADMIN_DISPUTE_FINE_APPLIED:') GROUP BY note
    ) recovery ON recovery.note = 'ADMIN_DISPUTE_FINE_APPLIED:' || substr(fine.note, length('ADMIN_DISPUTE_FINE:') + 1)
    WHERE starts_with(fine.note, 'ADMIN_DISPUTE_FINE:') AND length(fine.note) > length('ADMIN_DISPUTE_FINE:')
  ) f
  WHERE f."originalPence" > f."recoveredPence"
`;

export async function outstandingPayoutFines(transporterIds: string[], db: Reader = prisma): Promise<OpenFine[]> {
  if (!transporterIds.length) return [];
  return db.$queryRaw<OpenFine[]>(Prisma.sql`
    SELECT * FROM (${openFineRows}) f
    WHERE f."transporterId" IN (${Prisma.join(transporterIds)})
    ORDER BY f."createdAt" DESC, f.id
  `);
}

export function adminFineBalances(db: Reader = prisma) {
  return db.$queryRaw<FineBalance[]>(Prisma.sql`
    SELECT u.id AS "transporterId", u.name,
           SUM(f."outstandingPence")::double precision AS "outstandingPence",
           COUNT(*) FILTER (WHERE f.kind = 'Cancellation')::integer AS "cancellationCount",
           SUM(CASE WHEN f.kind = 'Cancellation' THEN f."outstandingPence" ELSE 0 END)::double precision AS "cancellationPence",
           COUNT(*) FILTER (WHERE f.kind = 'Dispute')::integer AS "disputeCount",
           SUM(CASE WHEN f.kind = 'Dispute' THEN f."outstandingPence" ELSE 0 END)::double precision AS "disputePence",
           array_agg(DISTINCT 'DD-' || upper(right(f."bookingId", 8))) AS "references"
    FROM (${openFineRows}) f JOIN "User" u ON u.id = f."transporterId"
    GROUP BY u.id, u.name
    ORDER BY SUM(f."outstandingPence") DESC, u.name, u.id
  `);
}
