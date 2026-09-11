import { NextResponse } from 'next/server';import { prisma } from '@/lib/prisma';import { currentUser } from '@/lib/auth';import { z } from 'zod';import {apiError,parseJson} from '@/lib/api';import {sendTransactionalEmailSafely} from '@/lib/email';import {createNotificationSafely} from '@/lib/notifications';import {calculateCustomerPrice} from '@/lib/finance';import {insuranceStatusForVerification} from '@/lib/insurance-expiry-notifications'
const S=z.object({jobId:z.string().min(1),pricePence:z.number().int().min(1000).max(10_000_000),message:z.string().trim().max(1000).optional(),proposedCollectionDate:z.string().optional()})
const W=z.object({quoteId:z.string().min(1)})
export async function POST(r:Request){
 try{
  const u=await currentUser();
  if(!u||u.role!=='TRANSPORTER')return NextResponse.json({error:'Transporter login required'},{status:403});
  if(u.accountStatus!=='ACTIVE'||u.workRestricted)return NextResponse.json({error:'Your transporter account is not currently permitted to quote on jobs'},{status:403});
  const verification=await prisma.transporterVerification.findUnique({where:{transporterId:u.id},select:{id:true,status:true,reviewedAt:true,documents:{where:{type:'INSURANCE',status:{not:'REJECTED'}},select:{id:true,type:true,status:true,expiresAt:true,createdAt:true},orderBy:{createdAt:'desc'}}}});
  if(!verification||verification.status!=='APPROVED')return NextResponse.json({error:'DriveDrop verification approval is required before you can submit quotes'},{status:403});
  const insuranceStatus=insuranceStatusForVerification(verification);
  if(insuranceStatus.state==='MISSING'||insuranceStatus.state==='EXPIRED')return NextResponse.json({error:insuranceStatus.replacementPending?'Your replacement insurance is awaiting DriveDrop approval. New quotes remain blocked until it is approved.':'Your approved insurance is missing or expired. Upload replacement insurance and wait for DriveDrop approval before submitting new quotes'},{status:403});
  const d=await parseJson(r,S);
  const result=await prisma.$transaction(async (tx: any)=>{
   const job=await tx.transportJob.findUnique({where:{id:d.jobId},include:{customer:{select:{id:true,email:true,name:true}}}});
   if(!job)throw new Error('Not found');
   if(!['OPEN','QUOTED'].includes(job.status))throw new Error('Job is no longer accepting quotes');
   const existing=await tx.quote.findFirst({where:{jobId:d.jobId,transporterId:u.id}});
   if(existing&&!['PENDING','WITHDRAWN'].includes(existing.status))throw new Error('This quote can no longer be revised');
   const proposed=d.proposedCollectionDate?new Date(`${d.proposedCollectionDate}T12:00:00`):null;
   const q=existing
    ?await tx.quote.update({where:{id:existing.id},data:{status:'PENDING',pricePence:d.pricePence,message:d.message||null,proposedCollectionDate:proposed,dateNegotiationStatus:proposed?'PROPOSED':'ORIGINAL'}})
    :await tx.quote.create({data:{jobId:d.jobId,pricePence:d.pricePence,message:d.message,transporterId:u.id,proposedCollectionDate:proposed,dateNegotiationStatus:proposed?'PROPOSED':'ORIGINAL'}});
   if(job.status==='OPEN')await tx.transportJob.update({where:{id:d.jobId},data:{status:'QUOTED'}});
   return {quote:q,customer:job.customer,vehicleMake:job.vehicleMake,vehicleModel:job.vehicleModel,collection:job.collection,delivery:job.delivery,revised:existing?.status==='PENDING'}
  });
  const pricing=calculateCustomerPrice(result.quote.pricePence);
  const customerTotal=`£${(pricing.customerTotalPence/100).toFixed(2)}`;
  await createNotificationSafely({userId:result.customer.id,type:'QUOTE',title:result.revised?'Transport quote updated':'New transport quote received',body:`A verified transporter ${result.revised?'updated their quote to':'quoted'} ${customerTotal} including the DriveDrop fee for your ${result.vehicleMake} ${result.vehicleModel}.`,href:'/customer?view=quotes#quote-requests'});
  await sendTransactionalEmailSafely({to:result.customer.email,subject:`${result.revised?'Updated':'New'} quote for your ${result.vehicleMake} ${result.vehicleModel}`,heading:result.revised?'A transporter updated their quote':'You have a new transport quote',body:`A verified DriveDrop transporter has ${result.revised?'updated their quote to':'quoted'} ${customerTotal} including the DriveDrop fee to move your ${result.vehicleMake} ${result.vehicleModel}.\n\n${result.collection} → ${result.delivery}\n\nSign in to review the quote, transporter details and any proposed collection date.`,ctaLabel:'Review your quote',ctaPath:'/customer',preheader:`DriveDrop quote: ${customerTotal}`});
  return NextResponse.json({...result.quote,transporterBasePricePence:result.quote.pricePence,platformFeePence:pricing.platformFeePence,customerTotalPence:pricing.customerTotalPence},{status:result.revised?200:201})
 }catch(e){return apiError(e,'Unable to submit quote')}
}


export async function DELETE(r:Request){
 try{
  const u=await currentUser();
  if(!u||u.role!=='TRANSPORTER')return NextResponse.json({error:'Transporter login required'},{status:403});
  const d=await parseJson(r,W);
  const result=await prisma.$transaction(async(tx:any)=>{
   const quote=await tx.quote.findFirst({where:{id:d.quoteId,transporterId:u.id},include:{booking:{select:{id:true}},job:{select:{id:true,status:true,customerId:true,vehicleMake:true,vehicleModel:true}}}});
   if(!quote)throw new Error('Quote not found');
   if(quote.status!=='PENDING')throw new Error('Only a pending quote can be cancelled');
   if(quote.booking)throw new Error('This quote has already become a booking and cannot be cancelled as a quote');
   const withdrawn=await tx.quote.update({where:{id:quote.id},data:{status:'WITHDRAWN'}});
   const pendingQuotes=await tx.quote.count({where:{jobId:quote.jobId,status:'PENDING'}});
   const jobStatus=quote.job.status==='QUOTED'&&pendingQuotes===0
    ?(await tx.transportJob.update({where:{id:quote.jobId},data:{status:'OPEN'},select:{status:true}})).status
    :quote.job.status;
   return{quote:withdrawn,jobStatus,customerId:quote.job.customerId,vehicleMake:quote.job.vehicleMake,vehicleModel:quote.job.vehicleModel};
  });
  await createNotificationSafely({userId:result.customerId,type:'QUOTE',title:'Transport quote withdrawn',body:`A transporter has withdrawn their quote for your ${result.vehicleMake} ${result.vehicleModel}. Your request remains open for quotes.`,href:'/customer?view=quotes#quote-requests'});
  return NextResponse.json({quote:result.quote,jobStatus:result.jobStatus,noCancellationFine:true});
 }catch(e){return apiError(e,'Unable to cancel quote')}
}
