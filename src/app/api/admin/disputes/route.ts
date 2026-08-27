import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';
import {z} from 'zod';

const Review=z.object({disputeId:z.string().min(1),status:z.enum(['UNDER_REVIEW','RESOLVED','CLOSED']),resolution:z.enum(['REFUND_CUSTOMER','PARTIAL_REFUND','RELEASE_PAYOUT','NO_ACTION','OTHER']).optional(),resolutionNote:z.string().trim().max(2000).optional()});

export async function GET(){
  const u=await currentUser();
  if(!u||u.role!=='ADMIN') return NextResponse.json({error:'Admin access required'},{status:403});
  return NextResponse.json(await prisma.dispute.findMany({include:{raisedBy:{select:{id:true,name:true,email:true,role:true}},booking:{include:{job:true,customer:{select:{name:true,email:true}},transporter:{select:{name:true,email:true}},payment:true}}},orderBy:[{status:'asc'},{createdAt:'desc'}]}));
}

export async function PATCH(r:Request){
  const u=await currentUser();
  if(!u||u.role!=='ADMIN') return NextResponse.json({error:'Admin access required'},{status:403});
  const parsed=Review.safeParse(await r.json());
  if(!parsed.success) return NextResponse.json({error:'Invalid dispute review'},{status:400});
  const d=parsed.data;
  if(d.status==='RESOLVED'&&!d.resolution) return NextResponse.json({error:'A resolution is required when resolving a dispute'},{status:400});
  try{
    const result=await prisma.$transaction(async(tx:any)=>{
      const dispute=await tx.dispute.findUniqueOrThrow({where:{id:d.disputeId},include:{booking:{include:{payment:true}}}});
      const payment=dispute.booking.payment;
      if(d.status==='UNDER_REVIEW'&&payment&&payment.payoutStatus!=='PAID'&&payment.payoutStatus!=='CANCELLED'&&payment.payoutStatus!=='HELD') await tx.bookingPayment.update({where:{id:payment.id},data:{payoutStatus:'HELD'}});
      if(d.status==='RESOLVED'&&d.resolution==='RELEASE_PAYOUT'&&payment){
        if(payment.status!=='PAID') throw new Error('Customer payment must be paid before payout can be released');
        if(dispute.booking.status!=='DELIVERED'||!dispute.booking.customerConfirmedAt) throw new Error('Delivery and customer confirmation are required before payout can be released');
        if(payment.payoutStatus==='PAID') throw new Error('Payout has already been released');
        await tx.bookingPayment.update({where:{id:payment.id},data:{payoutStatus:'READY'}});
      }
      if(d.status==='RESOLVED'&&['REFUND_CUSTOMER','PARTIAL_REFUND'].includes(d.resolution||'')&&payment&&payment.payoutStatus!=='PAID') await tx.bookingPayment.update({where:{id:payment.id},data:{payoutStatus:'HELD'}});
      return tx.dispute.update({where:{id:d.disputeId},data:{status:d.status,resolution:d.resolution,resolutionNote:d.resolutionNote,reviewerId:u.id,reviewedAt:new Date()}});
    });
    return NextResponse.json(result);
  }catch(e:any){return NextResponse.json({error:e.message||'Unable to review dispute'},{status:400})}
}
