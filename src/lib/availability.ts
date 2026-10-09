import {AvailabilityError} from './availability-error';
import {Prisma} from '@prisma/client';
import {prisma} from './prisma';
import {calculateCustomerPrice} from './finance';
import {authorisationProvider,paymentEnvironment} from './booking-authorisation-provider';
import {insuranceStatusForVerification} from './insurance-expiry-notifications';
import {confirmationDeadline,isOfferLive,validateCollectionWindow,calendarDate} from './availability-time';

type Tx=Prisma.TransactionClient;
export type BookingActor={id:string;role:string;accountStatus?:string;workRestricted?:boolean};
export async function lockJob(tx:Tx,jobId:string){await tx.$queryRaw`SELECT "id" FROM "TransportJob" WHERE "id"=${jobId} FOR UPDATE`;}
const quoteInclude={job:true,transporter:{include:{transporterVerification:{include:{documents:true}}}}} as const;
export async function eligibleQuote(tx:Tx,id:string,now:Date){
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
 const rows=await tx.availabilityRequest.findMany({where:{jobId,OR:[{status:{in:['AWAITING_TRANSPORTER','AWAITING_AUTHORISATION']},respondBy:{lte:now}},{status:'AWAITING_PAYMENT',payBy:{lte:now}}]}});
 for(const r of rows)await tx.availabilityRequest.update({where:{id:r.id},data:{status:'EXPIRED',activeJobId:null,paymentState:r.paymentProvider==='STRIPE'?'RELEASE_PENDING':r.paymentProvider?'RELEASED':null}});
 return {count:rows.length};
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
  const provider=authorisationProvider();
  const request=await tx.availabilityRequest.create({data:{status:'AWAITING_AUTHORISATION',paymentProvider:provider,paymentEnvironment:paymentEnvironment(),paymentState:'PENDING',authorisedAmountPence:calculateCustomerPrice(q.pricePence).customerTotalPence,jobId:q.jobId,quoteId:q.id,customerId:actor.id,transporterId:q.transporterId,activeJobId:q.jobId,pricePence:q.pricePence,collectionDate:date,collectionFrom:from,collectionUntil:until,respondBy:confirmationDeadline(date,until,now,q.expiresAt)}});
  return {request,created:true};
 });
}
// Called only after verified capture, under the job lock. Safe for webhook/request retries.
export async function createCapturedBooking(tx:Tx,r:any,providerReference:string,actorId:string){
  if(r.status==='BOOKED'&&r.bookingId)return {booking:await tx.booking.findUniqueOrThrow({where:{id:r.bookingId},include:{payment:true}}),request:r,created:false};
  if(r.status!=='CAPTURING'||!r.confirmedAt)throw new AvailabilityError('Transporter confirmation is required before capture');
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
  const total=r.authorisedAmountPence;
  if(!total||total<r.pricePence)throw new Error('Authorised amount missing');
  const finance={transportValuePence:total,depositPence:total,platformFeePence:total-r.pricePence,transporterProceedsPence:r.pricePence,remainingBalancePence:0};
  const booking=await tx.booking.create({data:{jobId:r.jobId,quoteId:r.quoteId,customerId:r.customerId,transporterId:r.transporterId,agreedPricePence:r.pricePence,status:'CONFIRMED',payment:{create:{...finance,status:'PAID',paidPence:finance.transportValuePence,provider:r.paymentProvider,providerReference}}},include:{payment:true}});
  await tx.financeEvent.create({data:{paymentId:booking.payment!.id,type:'PAYMENT_CAPTURED',amountPence:finance.transportValuePence,actorId,note:'Authorised payment captured on transporter confirmation'}});
  await tx.quote.update({where:{id:r.quoteId},data:{status:'ACCEPTED'}});
  await tx.quote.updateMany({where:{jobId:r.jobId,id:{not:r.quoteId},status:'PENDING'},data:{status:'DECLINED'}});
  await tx.transportJob.update({where:{id:r.jobId},data:{status:'BOOKED',collectionDate:r.collectionDate,collectionFrom:r.collectionFrom,collectionUntil:r.collectionUntil}});
  const request=await tx.availabilityRequest.update({where:{id:r.id},data:{status:'BOOKED',paymentState:'CAPTURED',bookingId:booking.id,activeJobId:null}});
  return {booking,request,created:true};
}
