import {prepareStripeRefund,reconcileStripeRefund,refundSummarySelect,stripeRefundRecoveryEnabled} from '@/lib/stripe-refunds';
import {paymentEnvironment,productionPaymentsEnabled} from '@/lib/payment-runtime';
import {connectErrorMessage,connectFailureCode,connectOrigin} from '@/lib/stripe-connect-provider';
export const maxDuration=180;
import {refundAmounts} from '@/lib/payout-policy';
import {after,NextResponse} from 'next/server';import {prisma} from '@/lib/prisma';import {currentUser} from '@/lib/auth';import {z} from 'zod';const S=z.object({paymentId:z.string(),amountPence:z.number().int().positive(),expectedRefundedPence:z.number().int().nonnegative().optional()});
function testFinanceDisabled(){const isVercelProduction=process.env.VERCEL_ENV==='production';const isLocalProduction=!process.env.VERCEL_ENV&&process.env.NODE_ENV==='production';return isVercelProduction||isLocalProduction}
export async function POST(r:Request){if(testFinanceDisabled()&&!productionPaymentsEnabled())return NextResponse.json({error:'Production payments are disabled'},{status:403});const u=await currentUser();if(!u||u.role!=='ADMIN'||u.accountStatus!=='ACTIVE')return NextResponse.json({error:'Admin required'},{status:403});const parsed=S.safeParse(await r.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'Invalid refund request'},{status:400});const d=parsed.data;
 const provider=await prisma.bookingPayment.findUnique({where:{id:d.paymentId},select:{provider:true}});
 if(provider?.provider==='STRIPE'){
  try{
   if((paymentEnvironment()==='production'||r.headers.get('origin'))&&r.headers.get('origin')!==connectOrigin())return NextResponse.json({error:'Invalid request origin'},{status:403});
   if(d.expectedRefundedPence===undefined)return NextResponse.json({error:'Refresh the payment before requesting a refund'},{status:409});
   const refund=await prepareStripeRefund({...d,expectedRefundedPence:d.expectedRefundedPence,actorId:u.id});
   after(()=>reconcileStripeRefund(refund.id));
   return NextResponse.json({accepted:true,refundId:refund.id,status:refund.status,recoveryStatus:refund.recoveryStatus},{status:202});
  }catch(error){return NextResponse.json({error:connectErrorMessage(error)},{status:connectFailureCode(error)==='REFUND_CONFLICT'?409:400});}
 }
 if(testFinanceDisabled())return NextResponse.json({error:'Test finance is permanently disabled in production'},{status:403});
 try{const p=await prisma.$transaction(async(tx:any)=>{const ref=await tx.bookingPayment.findUniqueOrThrow({where:{id:d.paymentId},select:{bookingId:true}});await tx.$queryRaw`SELECT id FROM "Booking" WHERE id=${ref.bookingId} FOR UPDATE`;const old=await tx.bookingPayment.findUniqueOrThrow({where:{id:d.paymentId},include:{booking:{select:{status:true,customerConfirmedAt:true}}}});if(old.provider!=='TEST')throw new Error('This simulated refund endpoint cannot refund Stripe payments');if(old.payoutStatus==='PAID')throw new Error('Cannot refund after transporter payout has been released');if(old.paidPence<=0)throw new Error('No captured customer payment to refund');if(d.amountPence>old.paidPence-old.refundedPence)throw new Error('Refund exceeds paid balance');const refunded=old.refundedPence+d.amountPence;const fullyRefunded=refunded===old.paidPence;const status=fullyRefunded?'REFUNDED':'PARTIALLY_REFUNDED';const {platformFeePence,transporterProceedsPence}=refundAmounts(old,d.amountPence);const eligibleAfterPartial=!fullyRefunded&&old.booking.status==='DELIVERED'&&!!old.booking.customerConfirmedAt;const hold=await tx.dispute.count({where:{bookingId:old.bookingId,status:{in:['OPEN','UNDER_REVIEW']}}});const payoutStatus=fullyRefunded?'CANCELLED':hold||old.payoutStatus==='HELD'?'HELD':eligibleAfterPartial?'READY':'NOT_READY';const x=await tx.bookingPayment.update({where:{id:old.id},data:{refundedPence:refunded,status,payoutStatus,platformFeePence,transporterProceedsPence}});await tx.financeEvent.create({data:{paymentId:x.id,type:'REFUND_CREATED',amountPence:d.amountPence,actorId:u.id,note:'Sandbox/test refund'}});return x});return NextResponse.json(p)}catch(e:any){return NextResponse.json({error:e.message||'Unable to refund payment'},{status:400})}}


export async function PATCH(request:Request){
 if(!stripeRefundRecoveryEnabled())return NextResponse.json({error:'Stripe refund recovery is not enabled'},{status:403});
 const user=await currentUser();if(!user||user.role!=='ADMIN'||user.accountStatus!=='ACTIVE')return NextResponse.json({error:'Admin required'},{status:403});
 if((paymentEnvironment()==='production'||request.headers.get('origin'))&&request.headers.get('origin')!==connectOrigin())return NextResponse.json({error:'Invalid request origin'},{status:403});
 const parsed=z.object({refundId:z.string().min(1)}).safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Invalid refund record'},{status:400});
 const row=await prisma.stripeRefund.findFirst({where:{id:parsed.data.refundId,environment:paymentEnvironment()},select:refundSummarySelect});
 if(!row)return NextResponse.json({error:'Refund not found'},{status:404});
 after(()=>reconcileStripeRefund(row.id));
 return NextResponse.json({accepted:true,refund:row},{status:202});
}
