import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';
import {z} from 'zod';

const Create=z.object({bookingId:z.string().min(1),reason:z.string().trim().min(3).max(120),details:z.string().trim().max(2000).optional(),evidenceUrl:z.string().url().optional()});

export async function GET(){
  const u=await currentUser();
  if(!u||!['CUSTOMER','TRANSPORTER'].includes(u.role)) return NextResponse.json({error:'Customer or transporter login required'},{status:403});
  return NextResponse.json(await prisma.dispute.findMany({where:{raisedById:u.id},include:{booking:{include:{job:true}}},orderBy:{createdAt:'desc'}}));
}

export async function POST(r:Request){
  const u=await currentUser();
  if(!u||!['CUSTOMER','TRANSPORTER'].includes(u.role)) return NextResponse.json({error:'Customer or transporter login required'},{status:403});
  const parsed=Create.safeParse(await r.json());
  if(!parsed.success) return NextResponse.json({error:'Invalid dispute details'},{status:400});
  const d=parsed.data;
  try{
    const dispute=await prisma.$transaction(async(tx:any)=>{
      const booking=await tx.booking.findUniqueOrThrow({where:{id:d.bookingId},include:{payment:true}});
      if(booking.customerId!==u.id&&booking.transporterId!==u.id) throw new Error('Forbidden');
      if(booking.status==='CANCELLED') throw new Error('This booking is already cancelled');
      const existing=await tx.dispute.findFirst({where:{bookingId:booking.id,status:{in:['OPEN','UNDER_REVIEW']}}});
      if(existing) throw new Error('An active dispute already exists for this booking');
      if(booking.payment&&booking.payment.payoutStatus!=='PAID'&&booking.payment.payoutStatus!=='CANCELLED') await tx.bookingPayment.update({where:{id:booking.payment.id},data:{payoutStatus:'HELD'}});
      return tx.dispute.create({data:{bookingId:booking.id,raisedById:u.id,reason:d.reason,details:d.details,evidenceUrl:d.evidenceUrl}});
    });
    return NextResponse.json(dispute,{status:201});
  }catch(e:any){return NextResponse.json({error:e.message||'Unable to raise dispute'},{status:400})}
}
