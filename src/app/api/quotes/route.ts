import { NextResponse } from 'next/server';import { prisma } from '@/lib/prisma';import { currentUser } from '@/lib/auth';import { z } from 'zod';import {apiError,parseJson} from '@/lib/api';import {sendTransactionalEmailSafely} from '@/lib/email';import {createNotificationSafely} from '@/lib/notifications';import {calculateCustomerPrice} from '@/lib/finance'
const S=z.object({jobId:z.string().min(1),pricePence:z.number().int().min(1000).max(10_000_000),message:z.string().trim().max(1000).optional(),proposedCollectionDate:z.string().optional()})
export async function POST(r:Request){
 try{
  const u=await currentUser();
  if(!u||u.role!=='TRANSPORTER')return NextResponse.json({error:'Transporter login required'},{status:403});
  if(u.accountStatus!=='ACTIVE'||u.workRestricted)return NextResponse.json({error:'Your transporter account is not currently permitted to quote on jobs'},{status:403});
  const verification=await prisma.transporterVerification.findUnique({where:{transporterId:u.id},select:{status:true}});
  if(!verification||verification.status!=='APPROVED')return NextResponse.json({error:'DriveDrop verification approval is required before you can submit quotes'},{status:403});
  const d=await parseJson(r,S);
  const result=await prisma.$transaction(async (tx: any)=>{
   const job=await tx.transportJob.findUnique({where:{id:d.jobId},include:{customer:{select:{id:true,email:true,name:true}}}});
   if(!job)throw new Error('Not found');
   if(!['OPEN','QUOTED'].includes(job.status))throw new Error('Job is no longer accepting quotes');
   const existing=await tx.quote.findFirst({where:{jobId:d.jobId,transporterId:u.id}});
   if(existing&&existing.status!=='PENDING')throw new Error('This quote can no longer be revised');
   const proposed=d.proposedCollectionDate?new Date(`${d.proposedCollectionDate}T12:00:00`):null;
   const q=existing
    ?await tx.quote.update({where:{id:existing.id},data:{pricePence:d.pricePence,message:d.message||null,proposedCollectionDate:proposed,dateNegotiationStatus:proposed?'PROPOSED':'ORIGINAL'}})
    :await tx.quote.create({data:{jobId:d.jobId,pricePence:d.pricePence,message:d.message,transporterId:u.id,proposedCollectionDate:proposed,dateNegotiationStatus:proposed?'PROPOSED':'ORIGINAL'}});
   if(job.status==='OPEN')await tx.transportJob.update({where:{id:d.jobId},data:{status:'QUOTED'}});
   return {quote:q,customer:job.customer,vehicleMake:job.vehicleMake,vehicleModel:job.vehicleModel,collection:job.collection,delivery:job.delivery,revised:!!existing}
  });
  const pricing=calculateCustomerPrice(result.quote.pricePence);
  const customerTotal=`£${(pricing.customerTotalPence/100).toFixed(2)}`;
  await createNotificationSafely({userId:result.customer.id,type:'QUOTE',title:result.revised?'Transport quote updated':'New transport quote received',body:`A verified transporter ${result.revised?'updated their quote to':'quoted'} ${customerTotal} including the DriveDrop fee for your ${result.vehicleMake} ${result.vehicleModel}.`,href:'/customer?view=quotes#quote-requests'});
  await sendTransactionalEmailSafely({to:result.customer.email,subject:`${result.revised?'Updated':'New'} quote for your ${result.vehicleMake} ${result.vehicleModel}`,heading:result.revised?'A transporter updated their quote':'You have a new transport quote',body:`A verified DriveDrop transporter has ${result.revised?'updated their quote to':'quoted'} ${customerTotal} including the DriveDrop fee to move your ${result.vehicleMake} ${result.vehicleModel}.\n\n${result.collection} → ${result.delivery}\n\nSign in to review the quote, transporter details and any proposed collection date.`,ctaLabel:'Review your quote',ctaPath:'/customer',preheader:`DriveDrop quote: ${customerTotal}`});
  return NextResponse.json({...result.quote,transporterBasePricePence:result.quote.pricePence,platformFeePence:pricing.platformFeePence,customerTotalPence:pricing.customerTotalPence},{status:result.revised?200:201})
 }catch(e){return apiError(e,'Unable to submit quote')}
}
