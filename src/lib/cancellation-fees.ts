import {randomUUID} from 'crypto';

export const CANCELLATION_FEE_PENCE=5000;
export const DISPUTE_FINE_PENCE=5000;

export const disputeFineMarker=(disputeId:string)=>`ADMIN_DISPUTE_FINE:${disputeId}`;
const disputeFineAppliedMarker=(disputeId:string)=>`ADMIN_DISPUTE_FINE_APPLIED:${disputeId}`;

type TransactionClient={
 $queryRaw:<T=unknown>(strings:TemplateStringsArray,...values:any[])=>Promise<T>;
 $executeRaw:(strings:TemplateStringsArray,...values:any[])=>Promise<number>;
};

type PendingFee={
 id:string;
 amountPence:number;
 appliedPence:number;
 createdAt:Date;
};

type PendingDisputeFine={
 id:string;
 note:string;
 createdAt:Date;
};

export async function recordTransporterCancellationFee(
 tx:TransactionClient,
 transporterId:string,
 bookingId:string,
){
 return tx.$executeRaw`
  INSERT INTO "TransporterCancellationFee"
   ("id","transporterId","cancelledBookingId","amountPence","appliedPence","status","createdAt")
  VALUES
   (${randomUUID()},${transporterId},${bookingId},${CANCELLATION_FEE_PENCE},0,'PENDING',NOW())
  ON CONFLICT ("cancelledBookingId") DO NOTHING
 `;
}

export async function recordTransporterDisputeFine(input:{
 tx:TransactionClient;
 disputeId:string;
 paymentId:string;
 actorId:string;
}){
 const {tx,disputeId,paymentId,actorId}=input;
 const marker=disputeFineMarker(disputeId);

 // Serialise requests for one dispute so repeated taps cannot add the fine twice.
 await tx.$queryRaw<Array<{id:string}>>`
  SELECT "id" FROM "Dispute" WHERE "id"=${disputeId} FOR UPDATE
 `;
 const existing=await tx.$queryRaw<Array<{id:string}>>`
  SELECT "id"
  FROM "FinanceEvent"
  WHERE "paymentId"=${paymentId} AND "note"=${marker}
  LIMIT 1
 `;
 if(existing.length)return false;

 await tx.$executeRaw`
  INSERT INTO "FinanceEvent"
   ("id","paymentId","type","amountPence","note","actorId","createdAt")
  VALUES
   (${randomUUID()},${paymentId},'PAYMENT_CREATED',${DISPUTE_FINE_PENCE},${marker},${actorId},NOW())
 `;
 return true;
}

export async function applyCancellationFeesToPayout(input:{
 tx:TransactionClient;
 transporterId:string;
 paymentId:string;
 completedAt:Date;
 proceedsPence:number;
}){
 const {tx,transporterId,paymentId,completedAt}=input;
 let availablePence=Math.max(0,input.proceedsPence);
 let deductedPence=0;
 const fees=await tx.$queryRaw<PendingFee[]>`
  SELECT "id","amountPence","appliedPence","createdAt"
  FROM "TransporterCancellationFee"
  WHERE "transporterId"=${transporterId}
   AND "status" IN ('PENDING','PARTIALLY_APPLIED')
   AND "appliedPence"<"amountPence"
   AND "createdAt"<=${completedAt}
  ORDER BY "createdAt" ASC,"id" ASC
  FOR UPDATE
 `;

 for(const fee of fees){
  if(availablePence<=0)break;
  const earlier=await tx.$queryRaw<Array<{exists:boolean}>>`
   SELECT EXISTS(
    SELECT 1
    FROM "BookingPayment" earlier_payment
    INNER JOIN "Booking" earlier_booking ON earlier_booking."id"=earlier_payment."bookingId"
    WHERE earlier_payment."id"<>${paymentId}
     AND earlier_booking."transporterId"=${transporterId}
     AND earlier_booking."status"='DELIVERED'
     AND earlier_booking."customerConfirmedAt" IS NOT NULL
     AND earlier_booking."customerConfirmedAt">=${fee.createdAt}
     AND earlier_booking."customerConfirmedAt"<${completedAt}
     AND earlier_payment."payoutStatus" IN ('READY','HELD')
   ) AS "exists"
  `;
  if(earlier[0]?.exists)continue;

  const outstandingPence=fee.amountPence-fee.appliedPence;
  const amountPence=Math.min(outstandingPence,availablePence);
  if(amountPence<=0)continue;
  const nextAppliedPence=fee.appliedPence+amountPence;
  const fullyApplied=nextAppliedPence>=fee.amountPence;

  await tx.$executeRaw`
   INSERT INTO "TransporterCancellationDeduction"
    ("id","feeId","paymentId","amountPence","createdAt")
   VALUES
    (${randomUUID()},${fee.id},${paymentId},${amountPence},NOW())
   ON CONFLICT ("feeId","paymentId")
   DO UPDATE SET "amountPence"="TransporterCancellationDeduction"."amountPence"+EXCLUDED."amountPence"
  `;
  await tx.$executeRaw`
   UPDATE "TransporterCancellationFee"
   SET "appliedPence"=${nextAppliedPence},
       "status"=${fullyApplied?'APPLIED':'PARTIALLY_APPLIED'},
       "appliedAt"=${fullyApplied?new Date():null}
   WHERE "id"=${fee.id}
  `;
  availablePence-=amountPence;
  deductedPence+=amountPence;
 }

 const disputeFines=await tx.$queryRaw<PendingDisputeFine[]>`
  SELECT fine."id",fine."note",fine."createdAt"
  FROM "FinanceEvent" fine
  INNER JOIN "BookingPayment" source_payment ON source_payment."id"=fine."paymentId"
  INNER JOIN "Booking" source_booking ON source_booking."id"=source_payment."bookingId"
  WHERE source_booking."transporterId"=${transporterId}
   AND fine."note" LIKE 'ADMIN_DISPUTE_FINE:%'
   AND fine."createdAt"<=${completedAt}
  ORDER BY fine."createdAt" ASC,fine."id" ASC
  FOR UPDATE OF fine
 `;

 for(const fine of disputeFines){
  if(availablePence<=0)break;
  const disputeId=fine.note.slice('ADMIN_DISPUTE_FINE:'.length);
  if(!disputeId)continue;
  const earlier=await tx.$queryRaw<Array<{exists:boolean}>>`
   SELECT EXISTS(
    SELECT 1
    FROM "BookingPayment" earlier_payment
    INNER JOIN "Booking" earlier_booking ON earlier_booking."id"=earlier_payment."bookingId"
    WHERE earlier_payment."id"<>${paymentId}
     AND earlier_booking."transporterId"=${transporterId}
     AND earlier_booking."status"='DELIVERED'
     AND earlier_booking."customerConfirmedAt" IS NOT NULL
     AND earlier_booking."customerConfirmedAt">=${fine.createdAt}
     AND earlier_booking."customerConfirmedAt"<${completedAt}
     AND earlier_payment."payoutStatus" IN ('READY','HELD')
   ) AS "exists"
  `;
  if(earlier[0]?.exists)continue;
  const appliedMarker=disputeFineAppliedMarker(disputeId);
  const applied=await tx.$queryRaw<Array<{amountPence:bigint}>>`
   SELECT COALESCE(SUM("amountPence"),0)::bigint AS "amountPence"
   FROM "FinanceEvent"
   WHERE "note"=${appliedMarker}
  `;
  const appliedPence=Number(applied[0]?.amountPence||0);
  const outstandingPence=Math.max(0,DISPUTE_FINE_PENCE-appliedPence);
  const amountPence=Math.min(outstandingPence,availablePence);
  if(amountPence<=0)continue;
  await tx.$executeRaw`
   INSERT INTO "FinanceEvent"
    ("id","paymentId","type","amountPence","note","createdAt")
   VALUES
    (${randomUUID()},${paymentId},'PAYMENT_CREATED',${amountPence},${appliedMarker},NOW())
  `;
  availablePence-=amountPence;
  deductedPence+=amountPence;
 }

 return {deductedPence,netProceedsPence:Math.max(0,input.proceedsPence-deductedPence)};
}
