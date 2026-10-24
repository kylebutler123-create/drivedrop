import {after,NextResponse} from 'next/server';
import {prepareStripePayout,reconcileStripePayout} from '@/lib/stripe-payouts';
import {deferPayoutRecoveryProbe} from '@/lib/stripe-payout-recovery-probe';
import {connectErrorMessage,connectFailureCode,connectOrigin,connectReconciliationEnabled} from '@/lib/stripe-connect-provider';
import {paymentEnvironment,productionPaymentsEnabled} from '@/lib/payment-runtime';
export const maxDuration=180;
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';
import {createNotificationSafely} from '@/lib/notifications';
import {applyCancellationFeesToPayout} from '@/lib/cancellation-fees';
import {z} from 'zod';
import {capturedPayment,adminPayoutApproved,payoutWindowOpen} from '@/lib/payout-policy';

const S=z.object({paymentId:z.string()});
const money=(pence:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(pence/100);

function testFinanceDisabled(){
 const isVercelProduction=process.env.VERCEL_ENV==='production';
 const isLocalProduction=!process.env.VERCEL_ENV&&process.env.NODE_ENV==='production';
 return isVercelProduction||isLocalProduction;
}

export async function POST(r:Request){
 if(testFinanceDisabled()&&!productionPaymentsEnabled())return NextResponse.json({error:'Production payments are disabled'},{status:403});
 const u=await currentUser();
 if(!u||u.role!=='ADMIN'||u.accountStatus!=='ACTIVE')return NextResponse.json({error:'Admin required'},{status:403});
 const parsed=S.safeParse(await r.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Invalid payout request'},{status:400});
 const{paymentId}=parsed.data;
 const provider=await prisma.bookingPayment.findUnique({where:{id:paymentId},select:{provider:true}});
 if(provider?.provider==='STRIPE'){
  try{
   if((paymentEnvironment()==='production'||r.headers.get('origin'))&&r.headers.get('origin')!==connectOrigin())return NextResponse.json({error:'Invalid request origin'},{status:403});
   const payout=await prepareStripePayout(paymentId,u.id);
   if(!['TRANSFERRED','DEDUCTED','REVERSED'].includes(payout.status)&&!await deferPayoutRecoveryProbe(payout,r))after(()=>reconcileStripePayout(payout.id));
   return NextResponse.json({accepted:true,payoutStatus:['TRANSFERRED','DEDUCTED'].includes(payout.status)?'PAID':payout.status==='REVERSED'?'HELD':'PROCESSING',payoutId:payout.id},{status:202});
  }catch(error){
   console.error('Stripe payout preparation deferred',{paymentId,code:connectFailureCode(error)});
   return NextResponse.json({error:connectErrorMessage(error)},{status:400});
  }
 }
 if(testFinanceDisabled())return NextResponse.json({error:'Test finance is permanently disabled in production'},{status:403});
 try{
  const result=await prisma.$transaction(async(tx:any)=>{
   const ref=await tx.bookingPayment.findUniqueOrThrow({where:{id:paymentId},select:{bookingId:true}});await tx.$queryRaw`SELECT id FROM "Booking" WHERE id=${ref.bookingId} FOR UPDATE`;
   const old=await tx.bookingPayment.findUniqueOrThrow({
    where:{id:paymentId},
    include:{events:{where:{type:'PAYOUT_READY'}},booking:{include:{
     disputes:{select:{id:true,status:true,resolution:true}},
     trackingEvents:{where:{status:'DELIVERED'},select:{createdAt:true},orderBy:{createdAt:'desc'},take:1},
     job:{select:{vehicleMake:true,vehicleModel:true,registration:true}}
    }}}
   });
   if(old.provider!=='TEST')throw new Error('This simulated payout endpoint cannot release Stripe payments');
   const activeDisputes=old.booking.disputes.filter((dispute:any)=>['OPEN','UNDER_REVIEW'].includes(dispute.status));
   const adminReleaseOverride=adminPayoutApproved(old.booking.disputes,old.events);
   if(activeDisputes.length)throw new Error('Payout is held while an active dispute is under review');
   if(old.booking.status!=='DELIVERED')throw new Error('Delivery must be completed first');
   if(!old.booking.customerConfirmedAt&&!adminReleaseOverride)throw new Error('Customer confirmation or an approved admin dispute resolution is required');
   if(!payoutWindowOpen({...old.booking,payment:old},old.events))throw new Error('The 24-hour customer dispute window is still open. Only an approved admin dispute resolution permits earlier release.');
   if(!capturedPayment(old.status))throw new Error('Customer payment not recorded');
   if(old.payoutStatus!=='READY')throw new Error('Payout is not ready for release');
   if(old.transporterProceedsPence<=0||old.transporterProceedsPence+old.platformFeePence!==old.paidPence-old.refundedPence)throw Error('Remaining payment amounts require review before release');
   const details=await tx.$queryRaw<any[]>`SELECT "id" FROM "TransporterPayoutDetails" WHERE "userId"=${old.booking.transporterId} LIMIT 1`;
   if(!details.length)throw new Error('Transporter payout details are not complete');
   const feeResult=await applyCancellationFeesToPayout({
    tx,
    transporterId:old.booking.transporterId,
    paymentId,
    completedAt:old.booking.customerConfirmedAt||old.booking.trackingEvents[0]?.createdAt||new Date(),
    proceedsPence:old.transporterProceedsPence,
   });
   const payment=await tx.bookingPayment.update({where:{id:paymentId},data:{
    payoutStatus:'PAID',
    transporterProceedsPence:feeResult.netProceedsPence,
    cancellationDeductionPence:{increment:feeResult.deductedPence},
   }});
   await tx.financeEvent.create({data:{paymentId,type:'PAYOUT_PAID',amountPence:payment.transporterProceedsPence,actorId:u.id,note:feeResult.deductedPence>0?`Sandbox/test payout — £${(feeResult.deductedPence/100).toFixed(2)} fine deducted`:'Sandbox/test payout — payout details verified'}});
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
   body:result.cancellationDeductionPence>0?`DriveDrop released your test payout of ${money(result.payment.transporterProceedsPence)} for the ${vehicle}${reference} delivery after automatically deducting a ${money(result.cancellationDeductionPence)} fine.`:`DriveDrop released your test payout of ${money(result.payment.transporterProceedsPence)} for the ${vehicle}${reference} delivery.`,
   href:`/transporter?view=completed&bookingId=${encodeURIComponent(result.bookingId)}`
  });
  return NextResponse.json(result.payment);
 }catch(e:any){
  return NextResponse.json({error:e.message||'Unable to release payout'},{status:400});
 }
}

// Reconcile only an existing administrator-approved instruction while creation
// is paused. This route cannot reserve or create a new payout instruction.
export async function PATCH(request:Request){
 const user=await currentUser();
 if(!user||user.role!=='ADMIN'||user.accountStatus!=='ACTIVE')return NextResponse.json({error:'Admin required'},{status:403});
 if(!connectReconciliationEnabled())return NextResponse.json({error:'Stripe recovery is disabled'},{status:403});
 try{
  if((paymentEnvironment()==='production'||request.headers.get('origin'))&&request.headers.get('origin')!==connectOrigin())return NextResponse.json({error:'Invalid request origin'},{status:403});
  const parsed=z.object({payoutId:z.string().min(1)}).safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:'Invalid payout record'},{status:400});
  const row=await prisma.stripePayout.findFirst({where:{id:parsed.data.payoutId,environment:paymentEnvironment()},select:{id:true}});
  if(!row)return NextResponse.json({error:'Payout not found'},{status:404});
  after(()=>reconcileStripePayout(row.id));
  return NextResponse.json({accepted:true,payoutId:row.id},{status:202});
 }catch(error){return NextResponse.json({error:connectErrorMessage(error)},{status:400});}
}

