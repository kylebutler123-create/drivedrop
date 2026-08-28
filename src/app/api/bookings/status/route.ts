import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/auth';
import { z } from 'zod';
import { sendTransactionalEmailSafely } from '@/lib/email';

const S=z.object({bookingId:z.string(),status:z.enum(['COLLECTION_SCHEDULED','COLLECTED','IN_TRANSIT','ARRIVING_SOON','DELIVERED','CANCELLED']),note:z.string().max(500).optional()});
const allowed:Record<string,string[]>={CONFIRMED:['COLLECTION_SCHEDULED','COLLECTED','CANCELLED'],COLLECTION_SCHEDULED:['COLLECTED','CANCELLED'],COLLECTED:['IN_TRANSIT'],IN_TRANSIT:['ARRIVING_SOON','DELIVERED'],ARRIVING_SOON:['DELIVERED']};
const paymentRequiredStatuses=new Set(['COLLECTED','IN_TRANSIT','ARRIVING_SOON','DELIVERED']);

export async function PATCH(r:Request){
  const u=await currentUser();
  if(!u||!['TRANSPORTER','ADMIN'].includes(u.role)) return NextResponse.json({error:'Transporter or admin login required'},{status:403});
  const d=S.parse(await r.json());
  try{
    const result=await prisma.$transaction(async (tx: any)=>{
      const b=await tx.booking.findUniqueOrThrow({where:{id:d.bookingId},include:{payment:true,job:true,customer:{select:{name:true,email:true}},transporter:{select:{name:true}}}});
      if(u.role==='TRANSPORTER'&&b.transporterId!==u.id) throw new Error('Forbidden');
      if(!allowed[b.status]?.includes(d.status)) throw new Error(`Cannot move booking from ${b.status} to ${d.status}`);
      if(d.status==='CANCELLED'&&u.role==='TRANSPORTER'){
        if(b.payment?.paidPence>0) throw new Error('A paid booking cannot be cancelled directly by the transporter. Please report the problem to DriveDrop for review.');
        if(!d.note?.trim()) throw new Error('Please provide a cancellation reason');
      }
      if(paymentRequiredStatuses.has(d.status)&&(!b.payment||b.payment.status!=='PAID'||b.payment.paidPence<b.payment.depositPence)) throw new Error('Customer payment must be secured before vehicle collection can begin');
      const booking=await tx.booking.update({where:{id:b.id},data:{status:d.status}});
      const event=await tx.trackingEvent.create({data:{bookingId:b.id,status:d.status,note:d.note,actorId:u.id}});
      if(d.status==='DELIVERED') await tx.transportJob.update({where:{id:b.jobId},data:{status:'COMPLETED'}});
      if(d.status==='CANCELLED'){
        await tx.transportJob.update({where:{id:b.jobId},data:{status:'CANCELLED'}});
        if(b.payment){
          await tx.bookingPayment.update({where:{id:b.payment.id},data:b.payment.paidPence>0?{payoutStatus:'HELD'}:{status:'CANCELLED',payoutStatus:'CANCELLED'}});
        }
      }
      return {booking,event,before:b};
    });
    if(d.status==='COLLECTED'){
      const b=result.before;
      const vehicle=[b.job.vehicleYear,b.job.vehicleMake,b.job.vehicleModel].filter(Boolean).join(' ').replace(/\s+/g,' ').trim()||'vehicle';
      const transporter=b.transporter?.name?.trim()||'your transporter';
      await sendTransactionalEmailSafely({to:b.customer.email,subject:`Your ${vehicle} has been collected`,heading:'Vehicle collected',preheader:`Your DriveDrop transporter has collected your ${vehicle}.`,body:`Hi ${b.customer.name?.trim()||'there'},\n\n${transporter} has marked your ${vehicle} as collected.\n\nYou can follow the latest delivery status from your DriveDrop dashboard.`,ctaLabel:'Track your delivery',ctaPath:'/customer'});
    }
    return NextResponse.json({booking:result.booking,event:result.event});
  }catch(e:any){return NextResponse.json({error:e.message||'Unable to update delivery'},{status:400})}
}
