import { NextResponse } from 'next/server';import { prisma } from '@/lib/prisma';import { currentUser } from '@/lib/auth';import { z } from 'zod';import {apiError,parseJson} from '@/lib/api';import {sendTransactionalEmailSafely} from '@/lib/email';import {createNotificationSafely} from '@/lib/notifications'
const S=z.object({jobId:z.string().min(1),pricePence:z.number().int().min(1000).max(10_000_000),message:z.string().trim().max(1000).optional(),proposedCollectionDate:z.string().optional()})
export async function POST(r:Request){
 try{
  const u=await currentUser();
  if(!u||u.role!=='TRANSPORTER')return NextResponse.json({error:'Transporter login required'},{status:403});
  if(u.accountStatus!=='ACTIVE'||u.workRestricted)return NextResponse.json({error:'Your transporter account is not currently permitted to quote on jobs'},{status:403});
  const verification=await prisma.transporterVerification.findUnique({where:{transporterId:u.id},select:{status:true}});
  if(!verification||verification.status!=='APPROVED')return NextResponse.json({error:'DriveDrop verification approval is required before you can submit quotes'},{status:403});
  const d=await parseJson(r,S);
  const result=await prisma.$transaction(async (tx: any)=>{const job=await tx.transportJob.findUnique({where:{id:d.jobId},include:{customer:{select:{id:true,email:true,name:true}}}});if(!job)throw new Error('Not found');if(!['OPEN','QUOTED'].includes(job.status))throw new Error('Job is no longer accepting quotes');const existing=await tx.quote.findFirst({where:{jobId:d.jobId,transporterId:u.id}});if(existing)throw new Error('You have already quoted this job');const proposed=d.proposedCollectionDate?new Date(`${d.proposedCollectionDate}T12:00:00`):null;const q=await tx.quote.create({data:{jobId:d.jobId,pricePence:d.pricePence,message:d.message,transporterId:u.id,proposedCollectionDate:proposed,dateNegotiationStatus:proposed?'PROPOSED':'ORIGINAL'}});if(job.status==='OPEN')await tx.transportJob.update({where:{id:d.jobId},data:{status:'QUOTED'}});return {quote:q,customer:job.customer,vehicleMake:job.vehicleMake,vehicleModel:job.vehicleModel,collection:job.collection,delivery:job.delivery}});
  await createNotificationSafely({userId:result.customer.id,type:'QUOTE',title:'New transport quote received',body:`A verified transporter quoted £${(result.quote.pricePence/100).toFixed(2)} for your ${result.vehicleMake} ${result.vehicleModel}.`,href:'/customer?view=quotes#quote-requests'});
  await sendTransactionalEmailSafely({to:result.customer.email,subject:`New quote for your ${result.vehicleMake} ${result.vehicleModel}`,heading:'You have a new transport quote',body:`A verified DriveDrop transporter has quoted £${(result.quote.pricePence/100).toFixed(2)} to move your ${result.vehicleMake} ${result.vehicleModel}.\n\n${result.collection} → ${result.delivery}\n\nSign in to review the quote, transporter details and any proposed collection date.`,ctaLabel:'Review your quote',ctaPath:'/customer',preheader:`New DriveDrop quote: £${(result.quote.pricePence/100).toFixed(2)}`});
  return NextResponse.json(result.quote,{status:201})
 }catch(e){return apiError(e,'Unable to submit quote')}
}
