import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';
import {disputesEnabled} from '@/lib/features';
import {sendTransactionalEmailSafely} from '@/lib/email';
import {z} from 'zod';

const Create=z.object({bookingId:z.string().min(1),reason:z.string().trim().min(3).max(120),details:z.string().trim().max(2000).optional(),evidenceUrl:z.string().url().optional()});
const disabled=()=>NextResponse.json({error:'Disputes are not enabled in this environment'},{status:404});

export async function GET(){
  if(!disputesEnabled()) return disabled();
  const u=await currentUser();
  if(!u||!['CUSTOMER','TRANSPORTER'].includes(u.role)) return NextResponse.json({error:'Customer or transporter login required'},{status:403});
  return NextResponse.json(await prisma.dispute.findMany({where:{raisedById:u.id},include:{booking:{include:{job:true}}},orderBy:{createdAt:'desc'}}));
}

export async function POST(r:Request){
  if(!disputesEnabled()) return disabled();
  const u=await currentUser();
  if(!u||!['CUSTOMER','TRANSPORTER'].includes(u.role)) return NextResponse.json({error:'Customer or transporter login required'},{status:403});
  const parsed=Create.safeParse(await r.json());
  if(!parsed.success) return NextResponse.json({error:'Invalid dispute details'},{status:400});
  const d=parsed.data;
  try{
    const result=await prisma.$transaction(async(tx:any)=>{
      const booking=await tx.booking.findUniqueOrThrow({where:{id:d.bookingId},include:{payment:true,job:true,customer:{select:{id:true,name:true,email:true}},transporter:{select:{id:true,name:true,email:true}}}});
      if(booking.customerId!==u.id&&booking.transporterId!==u.id) throw new Error('Forbidden');
      if(booking.status==='CANCELLED') throw new Error('This booking is already cancelled');
      const existing=await tx.dispute.findFirst({where:{bookingId:booking.id,status:{in:['OPEN','UNDER_REVIEW']}}});
      if(existing) throw new Error('An active dispute already exists for this booking');
      if(booking.payment&&booking.payment.payoutStatus!=='PAID'&&booking.payment.payoutStatus!=='CANCELLED') await tx.bookingPayment.update({where:{id:booking.payment.id},data:{payoutStatus:'HELD'}});
      const dispute=await tx.dispute.create({data:{bookingId:booking.id,raisedById:u.id,reason:d.reason,details:d.details,evidenceUrl:d.evidenceUrl}});
      return {dispute,booking};
    });

    const {booking,dispute}=result;
    const vehicle=[booking.job.vehicleYear,booking.job.vehicleMake,booking.job.vehicleModel].filter(Boolean).join(' ').replace(/\s+/g,' ').trim()||'vehicle';
    const raisedByCustomer=booking.customerId===u.id;
    const raiser=raisedByCustomer?booking.customer:booking.transporter;
    const otherParty=raisedByCustomer?booking.transporter:booking.customer;
    const raiserPath=raisedByCustomer?'/customer':'/transporter';
    const otherPath=raisedByCustomer?'/transporter':'/customer';

    await Promise.all([
      sendTransactionalEmailSafely({to:raiser.email,subject:`DriveDrop dispute opened — ${vehicle}`,heading:'Dispute opened',preheader:`Your dispute for the ${vehicle} has been opened.`,body:`Hi ${raiser.name?.trim()||'there'},\n\nWe have received your dispute regarding the ${vehicle}.\n\nReason: ${d.reason}\n\nDriveDrop will review the booking and any submitted evidence. Any unreleased transporter payout will remain protected while the dispute is active.`,ctaLabel:'View dispute status',ctaPath:raiserPath}),
      sendTransactionalEmailSafely({to:otherParty.email,subject:`DriveDrop dispute opened on your booking — ${vehicle}`,heading:'A dispute has been opened',preheader:`A dispute has been opened for the ${vehicle} booking.`,body:`Hi ${otherParty.name?.trim()||'there'},\n\nA dispute has been opened regarding the ${vehicle} booking.\n\nReason: ${d.reason}\n\nDriveDrop will review the booking and any submitted evidence. Any unreleased transporter payout will remain protected while the dispute is active.`,ctaLabel:'View booking',ctaPath:otherPath})
    ]);

    return NextResponse.json(dispute,{status:201});
  }catch(e:any){return NextResponse.json({error:e.message||'Unable to raise dispute'},{status:400})}
}
