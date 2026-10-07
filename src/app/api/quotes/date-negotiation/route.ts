import {lockJob,assertNoReservation} from '@/lib/availability';
import {isOfferLive} from '@/lib/availability-time';
import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';
import {z} from 'zod';
import {isQuoteRequestOpen,pendingCollectionDates,collectionDateIsCurrent,parseCollectionDateInput} from '@/lib/job-expiry';

const S=z.object({quoteId:z.string().min(1),action:z.enum(['ACCEPT','DECLINE','COUNTER','PROPOSE']),date:z.string().optional()});
export async function PATCH(r:Request){
 const u=await currentUser();
 if(!u)return NextResponse.json({error:'Login required'},{status:401});
 try{
  const d=S.parse(await r.json());
  const updated=await prisma.$transaction(async tx=>{
  const initial=await tx.quote.findUnique({where:{id:d.quoteId},select:{jobId:true}});if(!initial)throw Error("Quote not found");
  await lockJob(tx,initial.jobId);await assertNoReservation(tx,initial.jobId);
  const q=await tx.quote.findUnique({where:{id:d.quoteId},include:{job:{include:{quotes:pendingCollectionDates}}}});
  if(!q)return NextResponse.json({error:'Quote not found'},{status:404});
  if(!isOfferLive(q)||!['OPEN','QUOTED'].includes(q.job.status))return NextResponse.json({error:'Quote is no longer available'},{status:400});
  const isCustomer=u.role==='CUSTOMER'&&q.job.customerId===u.id;
  const isTransporter=u.role==='TRANSPORTER'&&q.transporterId===u.id;
  if(!isCustomer&&!isTransporter)return NextResponse.json({error:'Forbidden'},{status:403});
  if(isTransporter&&(u.accountStatus!=='ACTIVE'||u.workRestricted))return NextResponse.json({error:'Your transporter account is not currently permitted to change pending quotes'},{status:403});
  if(!isQuoteRequestOpen(q.job)&&!(isCustomer&&d.action==='COUNTER'))throw new Error('This request has expired. The customer must choose a new collection date.');
  const data:{dateNegotiationStatus?:'ACCEPTED'|'DECLINED'|'COUNTERED'|'PROPOSED';proposedCollectionDate?:Date|null}={};
  if(d.action==='ACCEPT'){
   if(!q.proposedCollectionDate)throw new Error('No proposed date to accept');
   if(!collectionDateIsCurrent(q.proposedCollectionDate))throw new Error('Choose a collection date today or later');
   if(isCustomer&&q.dateNegotiationStatus!=='PROPOSED')throw new Error('No transporter date proposal is awaiting your response');
   if(isTransporter&&q.dateNegotiationStatus!=='COUNTERED')throw new Error('No customer counter-date is awaiting your response');
   data.dateNegotiationStatus='ACCEPTED';
  }else if(d.action==='DECLINE'){
   if(!isCustomer)throw new Error('Only the customer can decline a proposed date');
   data.dateNegotiationStatus='DECLINED';data.proposedCollectionDate=null;
  }else if(d.action==='COUNTER'){
   if(!isCustomer)throw new Error('Only the customer can counter with another date');
   if(!d.date)throw new Error('Choose a counter-date');
   data.proposedCollectionDate=parseCollectionDateInput(d.date);data.dateNegotiationStatus='COUNTERED';
  }else{
   if(!isTransporter)throw new Error('Only the transporter can propose a collection date');
   if(!d.date)throw new Error('Choose a proposed date');
   data.proposedCollectionDate=parseCollectionDateInput(d.date);data.dateNegotiationStatus='PROPOSED';
  }
  if(data.proposedCollectionDate&&!collectionDateIsCurrent(data.proposedCollectionDate))throw new Error('Choose a collection date today or later');
  return tx.quote.update({where:{id:q.id},data});
  });
  if(updated instanceof Response)return updated;
  return NextResponse.json(updated);
 }catch(e:any){return NextResponse.json({error:e?.message||'Unable to update collection date'},{status:400})}
}
