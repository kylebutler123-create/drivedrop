import {Prisma} from '@prisma/client';
import {prisma} from '@/lib/prisma';
import type {OutstandingPayoutFine} from '@/lib/payout-fine-preview';

/** Admin-only caller; one parameterised, read-only query for both fine sources. */
export async function outstandingPayoutFines(transporterIds:string[]):Promise<OutstandingPayoutFine[]>{
 if(!transporterIds.length)return [];
 return prisma.$queryRaw<OutstandingPayoutFine[]>(Prisma.sql`
  SELECT "transporterId", ("amountPence"-"appliedPence")::integer AS "outstandingPence", "createdAt"
  FROM "TransporterCancellationFee"
  WHERE "transporterId" IN (${Prisma.join(transporterIds)})
   AND "status" IN ('PENDING','PARTIALLY_APPLIED') AND "appliedPence"<"amountPence"
  UNION ALL
  SELECT b."transporterId", GREATEST(0,fine."amountPence"-COALESCE((
   SELECT SUM(applied."amountPence") FROM "FinanceEvent" applied
   WHERE applied."note"='ADMIN_DISPUTE_FINE_APPLIED:' || substring(fine."note" from length('ADMIN_DISPUTE_FINE:')+1)
  ),0))::integer AS "outstandingPence", fine."createdAt"
  FROM "FinanceEvent" fine
  INNER JOIN "BookingPayment" p ON p."id"=fine."paymentId"
  INNER JOIN "Booking" b ON b."id"=p."bookingId"
  WHERE b."transporterId" IN (${Prisma.join(transporterIds)})
   AND fine."note" LIKE 'ADMIN_DISPUTE_FINE:%'
   AND length(fine."note")>length('ADMIN_DISPUTE_FINE:')
 `);
}
