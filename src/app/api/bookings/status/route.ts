import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/auth';
import { z } from 'zod';
import { sendTransactionalEmailSafely } from '@/lib/email';
import {createNotificationSafely} from '@/lib/notifications';

const S=z.object({bookingId:z.string(),status:z.enum(['COLLECTION_SCHEDULED','COLLECTED','IN_TRANSIT','ARRIVING_SOON','DELIVERED','CANCELLED']),note:z.string().max(500).optional()});
const allowed:Record<string,string[]>={CONFIRMED:['COLLECTION_SCHEDULED','COLLECTED','CANCELLED'],COLLECTION_SCHEDULED:['COLLECTED','CANCELLED'],COLLECTED:['IN_TRANSIT'],IN_TRANSIT:['ARRIVING_SOON'],ARRIVING_SOON:[]};
const paymentRequiredStatuses=new Set(['COLLECTED','IN_TRANSIT','ARRIVING_SOON']);
const statusTitle:Record<string,string>={COLLECTION_SCHEDULED:'Collection scheduled',COLLECTED:'Vehicle collected',IN_TRANSIT:'Vehicle in transit',ARRIVING_SOON:'Vehicle arriving soon',CANCELLED:'Delivery cancelled'};

export async function PATCH(r:Request){
  const u=await currentUser();
  if(!u||!['TRANSPORTER','ADMIN'].includes(u.role)) return NextResponse.json({error:'Transporter or admin login required'},{status:403});
  const d=S.parse(await r.json());
  if(d.status==='DELIVERED')return NextResponse.json({error:'Complete the Proof of Delivery form to finish this delivery.'},{status:400});
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
      if(d.status==='CANCELLED'){
        await tx.transportJob.update({where:{id:b.jobId},data:{status:'OPEN'}});
        await tx.quote.updateMany({where:{jobId:b.jobId},data:{status:'PENDING'}});
        if(b.payment){
          await tx.bookingPayment.update({where:{id:b.payment.id},data:b.payment.paidPence>0?{payoutStatus:'HELD'}:{status:'CANCELLED',payoutStatus:'CANCELLED'}});
        }
      }
      return {booking,event,before:b};
    });
    const b=result.before;
    const vehicle=[b.job.vehicleYear,b.job.vehicleMake,b.job.vehicleModel].filter(Boolean).join(' ').replace(/\s+/g,' ').trim()||'vehicle';
    const transporter=b.transporter?.name?.trim()||'your transporter';
    await createNotificationSafely({userId:b.customerId,type:'DELIVERY',title:statusTitle[d.status]||'Delivery updated',body:`${vehicle}: ${statusTitle[d.status]||d.status.toLowerCase().replaceAll('_',' ')}.${d.note?` ${d.note}`:''}`,href:'/customer'});
    if(d.status==='COLLECTED'){
      await sendTransactionalEmailSafely({to:b.customer.email,subject:`Your ${vehicle} has been collected`,heading:'Vehicle collected',preheader:`Your DriveDrop transporter has collected your ${vehicle}.`,body:`Hi ${b.customer.name?.trim()||'there'},\n\n${transporter} has marked your ${vehicle} as collected.\n\nYou can follow the latest delivery status from your DriveDrop dashboard.`,ctaLabel:'Track your delivery',ctaPath:'/customer'});
    }
    if(d.status==='CANCELLED'){
      await sendTransactionalEmailSafely({to:b.customer.email,subject:`Your ${vehicle} delivery has been reopened`,heading:'Transporter cancelled — your request is open again',preheader:`Your DriveDrop transport request is available for new quotes again.`,body:`Hi ${b.customer.name?.trim()||'there'},\n\n${transporter} has cancelled the booking for your ${vehicle}.\n\nYour transport request has automatically been reopened so verified transporters can quote again.${d.note?`\n\nCancellation reason: ${d.note}`:''}`,ctaLabel:'View your request',ctaPath:'/customer',});
    }
    return NextResponse.json({booking:result.booking,event:result.event});
  }catch(e:any){return NextResponse.json({error:e.message||'Unable to update delivery'},{status:400})}
}
