import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/auth';
import { z } from 'zod';

const S=z.object({bookingId:z.string(),status:z.enum(['COLLECTION_SCHEDULED','COLLECTED','IN_TRANSIT','ARRIVING_SOON','DELIVERED']),note:z.string().max(500).optional()});
const allowed:Record<string,string[]>={CONFIRMED:['COLLECTION_SCHEDULED','COLLECTED'],COLLECTION_SCHEDULED:['COLLECTED'],COLLECTED:['IN_TRANSIT'],IN_TRANSIT:['ARRIVING_SOON','DELIVERED'],ARRIVING_SOON:['DELIVERED']};

export async function PATCH(r:Request){
  const u=await currentUser();
  if(!u||!['TRANSPORTER','ADMIN'].includes(u.role)) return NextResponse.json({error:'Transporter or admin login required'},{status:403});
  const d=S.parse(await r.json());
  try{
    const result=await prisma.$transaction(async (tx: any)=>{
      const b=await tx.booking.findUniqueOrThrow({where:{id:d.bookingId}});
      if(u.role==='TRANSPORTER'&&b.transporterId!==u.id) throw new Error('Forbidden');
      if(!allowed[b.status]?.includes(d.status)) throw new Error(`Cannot move booking from ${b.status} to ${d.status}`);
      const booking=await tx.booking.update({where:{id:b.id},data:{status:d.status}});
      const event=await tx.trackingEvent.create({data:{bookingId:b.id,status:d.status,note:d.note,actorId:u.id}});
      if(d.status==='DELIVERED') await tx.transportJob.update({where:{id:b.jobId},data:{status:'COMPLETED'}});
      return {booking,event};
    });
    return NextResponse.json(result);
  }catch(e:any){return NextResponse.json({error:e.message||'Unable to update delivery'},{status:400})}
}
