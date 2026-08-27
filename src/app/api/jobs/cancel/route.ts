import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';
import {z} from 'zod';

const S=z.object({jobId:z.string(),action:z.enum(['CANCEL','DELETE'])});

export async function PATCH(r:Request){
  const u=await currentUser();
  if(!u||u.role!=='CUSTOMER') return NextResponse.json({error:'Customer login required'},{status:403});
  try{
    const d=S.parse(await r.json());
    const result=await prisma.$transaction(async(tx:any)=>{
      const job=await tx.transportJob.findUnique({where:{id:d.jobId},include:{quotes:true,booking:true}});
      if(!job||job.customerId!==u.id) throw new Error('Request not found');
      if(job.booking) throw new Error('Booked deliveries cannot be deleted from quote requests');
      if(['BOOKED','COMPLETED'].includes(job.status)) throw new Error('This request can no longer be cancelled');
      if(d.action==='DELETE'){
        if(job.quotes.length>0) throw new Error('Requests with transporter quotes must be cancelled rather than deleted');
        await tx.transportJob.delete({where:{id:job.id}});
        return {deleted:true};
      }
      await tx.quote.updateMany({where:{jobId:job.id,status:'PENDING'},data:{status:'DECLINED'}});
      const cancelled=await tx.transportJob.update({where:{id:job.id},data:{status:'CANCELLED'}});
      return {cancelled:true,job:cancelled};
    });
    return NextResponse.json(result);
  }catch(e:any){return NextResponse.json({error:e.message||'Unable to update request'},{status:400})}
}
