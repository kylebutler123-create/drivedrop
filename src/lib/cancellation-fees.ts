import {randomUUID} from 'crypto';

export const CANCELLATION_FEE_PENCE=2500;

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

 return {deductedPence,netProceedsPence:Math.max(0,input.proceedsPence-deductedPence)};
}
