import type {Prisma} from '@prisma/client';

// Collection dates are calendar dates (stored at UTC midnight/noon), not appointment times.
// Compare them with today's UK calendar date, including the GMT/BST midnight boundary.
export function collectionDateCutoff(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const part=(type:string)=>parts.find(p=>p.type===type)!.value;
 return new Date(`${part('year')}-${part('month')}-${part('day')}T00:00:00.000Z`);
}
type DateValue=Date|string;
type PendingDate={status:string;expiresAt?:DateValue|null;proposedCollectionDate?:DateValue|null;dateNegotiationStatus:string};
type RequestDates={status:string;collectionDate:DateValue;quotes?:PendingDate[]};
export function collectionDateIsCurrent(date:DateValue,now=new Date()){
 const value=new Date(date).getTime();
 return Number.isFinite(value)&&value>=collectionDateCutoff(now).getTime();
}
export function parseCollectionDateInput(value:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Choose a valid collection date');
 const date=new Date(`${value}T12:00:00.000Z`);
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)throw new Error('Choose a valid collection date');
 return date;
}
const liveDateStatuses=['PROPOSED','COUNTERED','ACCEPTED'];
export function isQuoteRequestOpen(job:RequestDates,now=new Date()){
 return ['OPEN','QUOTED'].includes(job.status)&&(collectionDateIsCurrent(job.collectionDate,now)||
  (job.quotes||[]).some(q=>q.status==='PENDING'&&(!q.expiresAt||new Date(q.expiresAt)>now)&&liveDateStatuses.includes(q.dateNegotiationStatus)&&!!q.proposedCollectionDate&&collectionDateIsCurrent(q.proposedCollectionDate,now)));
}
// Shared by both dashboard lists and the customer quote-request list.
export function openQuoteRequestsWhere(now=new Date()):Prisma.TransportJobWhereInput{
 const cutoff=collectionDateCutoff(now);
 return {status:{in:['OPEN','QUOTED']},OR:[
  {collectionDate:{gte:cutoff}},
  {quotes:{some:{status:'PENDING',OR:[{expiresAt:null},{expiresAt:{gt:now}}],dateNegotiationStatus:{in:['PROPOSED','COUNTERED','ACCEPTED']},proposedCollectionDate:{gte:cutoff}}}}
 ]};
}
export const pendingCollectionDates={where:{status:'PENDING' as const},select:{status:true,expiresAt:true,proposedCollectionDate:true,dateNegotiationStatus:true}};
