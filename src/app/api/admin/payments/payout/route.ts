import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';
import {createNotificationSafely} from '@/lib/notifications';
import {applyCancellationFeesToPayout} from '@/lib/cancellation-fees';
import {z} from 'zod';

const S=z.object({paymentId:z.string()});
const money=(pence:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(pence/100);

function testFinanceDisabled(){
 const isVercelProduction=process.env.VERCEL_ENV==='production';
 const isLocalProduction=!process.env.VERCEL_ENV&&process.env.NODE_ENV==='production';
 return isVercelProduction||isLocalProduction;
}

export async function POST(r:Request){
 if(testFinanceDisabled())return NextResponse.json({error:'Test finance is permanently disabled in production'},{status:403});
 const u=await currentUser();
 if(!u||u.role!=='ADMIN')return NextResponse.json({error:'Admin required'},{status:403});
 const parsed=S.safeParse(await r.json());
 if(!parsed.success)return NextResponse.json({error:'Invalid payout request'},{status:400});
 const{paymentId}=parsed.data;
 try{
  const result=await prisma.$transaction(async(tx:any)=>{
   const old=await tx.bookingPayment.findUniqueOrThrow({
    where:{id:paymentId},
    include:{booking:{include:{
     disputes:{where:{status:{in:['OPEN','UNDER_REVIEW']}}},
     job:{select:{vehicleMake:true,vehicleModel:true,registration:true}}
    }}}
   });
   if(old.booking.disputes.length)throw new Error('Payout is held while an active dispute is under review');
   if(old.booking.status!=='DELIVERED')throw new Error('Delivery must be completed first');
   if(!old.booking.customerConfirmedAt)throw new Error('Customer must confirm delivery first');
   if(old.status!=='PAID')throw new Error('Customer payment not recorded');
   if(old.payoutStatus!=='READY')throw new Error('Payout is not ready for release');
   const details=await tx.$queryRaw<any[]>`SELECT "id" FROM "TransporterPayoutDetails" WHERE "userId"=${old.booking.transporterId} LIMIT 1`;
   if(!details.length)throw new Error('Transporter payout details are not complete');
   const feeResult=await applyCancellationFeesToPayout({
    tx,
    transporterId:old.booking.transporterId,
    paymentId,
    completedAt:old.booking.customerConfirmedAt,
    proceedsPence:old.transporterProceedsPence,
   });
   const payment=await tx.bookingPayment.update({where:{id:paymentId},data:{
    payoutStatus:'PAID',
    transporterProceedsPence:feeResult.netProceedsPence,
    cancellationDeductionPence:{increment:feeResult.deductedPence},
   }});
   await tx.financeEvent.create({data:{paymentId,type:'PAYOUT_PAID',amountPence:payment.transporterProceedsPence,actorId:u.id,note:feeResult.deductedPence>0?`Sandbox/test payout — £${(feeResult.deductedPence/100).toFixed(2)} cancellation fine deducted`:'Sandbox/test payout — payout details verified'}});
   return {
    payment,
    cancellationDeductionPence:feeResult.deductedPence,
    transporterId:old.booking.transporterId,
    bookingId:old.booking.id,
    job:old.booking.job
   };
  });
  const vehicle=`${result.job.vehicleMake} ${result.job.vehicleModel}`;
  const reference=result.job.registration?` (${result.job.registration})`:'';
  await createNotificationSafely({
   userId:result.transporterId,
   type:'PAYMENT',
   title:'Payout released',
   body:result.cancellationDeductionPence>0?`DriveDrop released your test payout of ${money(result.payment.transporterProceedsPence)} for the ${vehicle}${reference} delivery after automatically deducting a ${money(result.cancellationDeductionPence)} cancellation fine.`:`DriveDrop released your test payout of ${money(result.payment.transporterProceedsPence)} for the ${vehicle}${reference} delivery.`,
   href:`/transporter?view=completed&bookingId=${encodeURIComponent(result.bookingId)}`
  });
  return NextResponse.json(result.payment);
 }catch(e:any){
  return NextResponse.json({error:e.message||'Unable to release payout'},{status:400});
 }
}
