import {AvailabilityError} from './availability-error';
import {Prisma} from '@prisma/client';
import {prisma} from './prisma';
import {calculateFinance} from './finance';
import {collectionDateIsCurrent} from './job-expiry';
import {insuranceStatusForVerification} from './insurance-expiry-notifications';
import {confirmationDeadline,paymentDeadline,requestExpired,isOfferLive,validateCollectionWindow,calendarDate,collectionLimit} from './availability-time';

type Tx=Prisma.TransactionClient;
export type BookingActor={id:string;role:string;accountStatus?:string;workRestricted?:boolean};
export async function lockJob(tx:Tx,jobId:string){await tx.$queryRaw`SELECT "id" FROM "TransportJob" WHERE "id"=${jobId} FOR UPDATE`;}
const quoteInclude={job:true,transporter:{include:{transporterVerification:{include:{documents:true}}}}} as const;
async function eligibleQuote(tx:Tx,id:string,now:Date){
 const q=await tx.quote.findUniqueOrThrow({where:{id},include:quoteInclude});
 if(!isOfferLive(q,now)||!['OPEN','QUOTED'].includes(q.job.status))throw new AvailabilityError('Quote is unavailable or expired');
 if(['PROPOSED','COUNTERED'].includes(q.dateNegotiationStatus))throw new AvailabilityError('Agree the collection date before selecting this quote');
 const v=q.transporter.transporterVerification;
 if(q.transporter.accountStatus!=='ACTIVE'||q.transporter.workRestricted||v?.status!=='APPROVED')throw new AvailabilityError('This transporter is no longer available for booking');
 const insurance=insuranceStatusForVerification(v,now);
 if(['MISSING','EXPIRED'].includes(insurance.state))throw new AvailabilityError('This transporter needs valid approved insurance before confirming a new booking');
 return q;
}
export async function closeExpired(tx:Tx,jobId:string,now:Date){
 return tx.availabilityRequest.updateMany({where:{jobId,OR:[{status:'AWAITING_TRANSPORTER',respondBy:{lte:now}},{status:'AWAITING_PAYMENT',payBy:{lte:now}}]},data:{status:'EXPIRED',activeJobId:null}});
}
export async function assertNoReservation(tx:Tx,jobId:string,now=new Date()){
 await closeExpired(tx,jobId,now);
 if(await tx.availabilityRequest.findFirst({where:{jobId,activeJobId:jobId}}))throw new AvailabilityError('Finish or withdraw the current confirmation request before changing this quote or collection date');
}
export async function selectQuote(actor:BookingActor,quoteId:string,window?:{collectionFrom?:string;collectionUntil?:string}){
 if(actor.role!=='CUSTOMER'||actor.accountStatus==='SUSPENDED'||actor.accountStatus==='DELETED')throw new AvailabilityError('Customer login required');
 return prisma.$transaction(async tx=>{
  const initial=await tx.quote.findUniqueOrThrow({where:{id:quoteId},select:{jobId:true}});
  await lockJob(tx,initial.jobId);const now=new Date();
  const q=await eligibleQuote(tx,quoteId,now);
  if(q.job.customerId!==actor.id)throw new AvailabilityError('Quote not found');
  await closeExpired(tx,q.jobId,now);
  const current=await tx.availabilityRequest.findFirst({where:{activeJobId:q.jobId}});
  if(current){if(current.quoteId===q.id)return {request:current,created:false};throw new AvailabilityError('You already have a confirmation request for this job. Withdraw it before choosing another quote.');}
  const prior=await tx.booking.findUnique({where:{jobId:q.jobId}});
  if(prior&&prior.status!=='CANCELLED')throw new AvailabilityError('This job already has a booking');
  const date=q.dateNegotiationStatus==='ACCEPTED'&&q.proposedCollectionDate?q.proposedCollectionDate:q.job.collectionDate;
  const windowChanged=calendarDate(date)!==calendarDate(q.job.collectionDate);
  const agreedWindow=q.dateNegotiationStatus==='ACCEPTED'&&q.proposedCollectionFrom&&q.proposedCollectionUntil;
  const from=window?.collectionFrom||(agreedWindow?q.proposedCollectionFrom:windowChanged?null:q.job.collectionFrom),until=window?.collectionUntil||(agreedWindow?q.proposedCollectionUntil:windowChanged?null:q.job.collectionUntil);
  validateCollectionWindow(date,from,until,now);
  const request=await tx.availabilityRequest.create({data:{jobId:q.jobId,quoteId:q.id,customerId:actor.id,transporterId:q.transporterId,activeJobId:q.jobId,pricePence:q.pricePence,collectionDate:date,collectionFrom:from,collectionUntil:until,respondBy:confirmationDeadline(date,until,now,q.expiresAt)}});
  return {request,created:true};
 });
}
export async function respondToRequest(actor:BookingActor,id:string,action:'CONFIRM'|'DECLINE'|'WITHDRAW',travelMinutes=30){
 return prisma.$transaction(async tx=>{
  const initial=await tx.availabilityRequest.findUniqueOrThrow({where:{id}});await lockJob(tx,initial.jobId);const now=new Date();
  const r=await tx.availabilityRequest.findUniqueOrThrow({where:{id}});
  const customer=actor.role==='CUSTOMER'&&actor.id===r.customerId,transporter=actor.role==='TRANSPORTER'&&actor.id===r.transporterId;
  if(action==='WITHDRAW'?!customer:!transporter)throw new AvailabilityError('Confirmation request not found');
  if(actor.accountStatus&&actor.accountStatus!=='ACTIVE')throw new AvailabilityError('Account is not active');
  if(requestExpired(r,now)){const closed=await closeExpired(tx,r.jobId,now);return {request:await tx.availabilityRequest.findUniqueOrThrow({where:{id}}),changed:closed.count>0};}
  if(action==='CONFIRM'&&r.status==='AWAITING_PAYMENT')return {request:r,changed:false};
  if(!['AWAITING_TRANSPORTER','AWAITING_PAYMENT'].includes(r.status))throw new AvailabilityError('This confirmation request has already ended');
  if(action==='CONFIRM'){
   if(r.status!=='AWAITING_TRANSPORTER')throw new AvailabilityError('This request cannot be confirmed');
   const q=await eligibleQuote(tx,r.quoteId,now);
   if(q.pricePence!==r.pricePence)throw new AvailabilityError('The quote changed. Ask the customer to select it again.');
   validateCollectionWindow(r.collectionDate,r.collectionFrom,r.collectionUntil,now);
   const request=await tx.availabilityRequest.update({where:{id},data:{status:'AWAITING_PAYMENT',confirmedAt:now,payBy:paymentDeadline(r.collectionDate,r.collectionUntil,travelMinutes,now),travelMinutes}});
   return {request,changed:true};
  }
  const request=await tx.availabilityRequest.update({where:{id},data:{status:action==='WITHDRAW'?'WITHDRAWN':'DECLINED',activeJobId:null}});
  return {request,changed:true};
 });
}
// Test capture is the existing preview-only provider. No production payment is simulated.
export async function payConfirmedRequest(actor:BookingActor,id:string){
 if(process.env.VERCEL_ENV==='production'||(!process.env.VERCEL_ENV&&process.env.NODE_ENV==='production'))throw new AvailabilityError('Test finance is permanently disabled in production');
 if(actor.role!=='CUSTOMER'||(actor.accountStatus&&actor.accountStatus!=='ACTIVE'))throw new AvailabilityError('Customer login required');
 return prisma.$transaction(async tx=>{
  const initial=await tx.availabilityRequest.findUniqueOrThrow({where:{id}});await lockJob(tx,initial.jobId);const now=new Date();
  const r=await tx.availabilityRequest.findUniqueOrThrow({where:{id}});
  if(r.customerId!==actor.id)throw new AvailabilityError('Confirmation request not found');
  // Retry returns the existing delivery without regressing collected/delivered/cancelled status.
  if(r.status==='BOOKED'&&r.bookingId)return {booking:await tx.booking.findUniqueOrThrow({where:{id:r.bookingId},include:{payment:true}}),request:r,created:false};
  if(r.status!=='AWAITING_PAYMENT'||!r.confirmedAt||requestExpired(r,now))throw new AvailabilityError('This payment window has expired or availability has not been confirmed. Check availability again.');
  const q=await tx.quote.findUniqueOrThrow({where:{id:r.quoteId},include:quoteInclude});
  if(q.status!=='PENDING'||!['OPEN','QUOTED'].includes(q.job.status)||q.pricePence!==r.pricePence)throw new AvailabilityError('The quote or job has changed. Check availability again.');
  const v=q.transporter.transporterVerification;
  if(q.transporter.accountStatus!=='ACTIVE'||q.transporter.workRestricted||v?.status!=='APPROVED'||['MISSING','EXPIRED'].includes(insuranceStatusForVerification(v,now).state))throw new AvailabilityError('This transporter is no longer eligible. Choose another quote.');
  if(!collectionDateIsCurrent(r.collectionDate,now))throw new AvailabilityError('The collection date has passed');
  if(+collectionLimit(r.collectionDate,r.collectionUntil)-(r.travelMinutes||30)*60_000<=+now)throw new AvailabilityError('The collection window can no longer be met');
  const previous=await tx.booking.findUnique({where:{jobId:r.jobId},include:{job:true,quote:true}});
  if(previous){
   if(previous.status!=='CANCELLED')throw new AvailabilityError('This job already has an active booking');
   // Archive the original job and quote rather than deleting a cancelled booking's history.
   const {id:_j,customerId,...jobData}=previous.job;
   const archivedJob=await tx.transportJob.create({data:{...jobData,customerId,status:'CANCELLED'}});
   await tx.$executeRaw`UPDATE "TransportJob" SET "vehicleType"=(SELECT "vehicleType" FROM "TransportJob" WHERE "id"=${r.jobId}) WHERE "id"=${archivedJob.id}`;
   const {id:_q,jobId:_job,transporterId,...quoteData}=previous.quote;
   const archivedQuote=await tx.quote.create({data:{...quoteData,jobId:archivedJob.id,transporterId,status:'DECLINED'}});
   await tx.booking.update({where:{id:previous.id},data:{jobId:archivedJob.id,quoteId:archivedQuote.id}});
  }
  const finance=calculateFinance(r.pricePence);
  const booking=await tx.booking.create({data:{jobId:r.jobId,quoteId:r.quoteId,customerId:r.customerId,transporterId:r.transporterId,agreedPricePence:r.pricePence,status:'CONFIRMED',payment:{create:{...finance,status:'PAID',paidPence:finance.transportValuePence,provider:'TEST',providerReference:`test_${crypto.randomUUID()}`}}},include:{payment:true}});
  await tx.financeEvent.create({data:{paymentId:booking.payment!.id,type:'PAYMENT_CAPTURED',amountPence:finance.transportValuePence,actorId:actor.id,note:'Full sandbox/test payment captured after transporter availability confirmation'}});
  await tx.quote.update({where:{id:r.quoteId},data:{status:'ACCEPTED'}});
  await tx.quote.updateMany({where:{jobId:r.jobId,id:{not:r.quoteId},status:'PENDING'},data:{status:'DECLINED'}});
  await tx.transportJob.update({where:{id:r.jobId},data:{status:'BOOKED',collectionDate:r.collectionDate,collectionFrom:r.collectionFrom,collectionUntil:r.collectionUntil}});
  const request=await tx.availabilityRequest.update({where:{id},data:{status:'BOOKED',bookingId:booking.id,activeJobId:null}});
  return {booking,request,created:true};
 });
}
