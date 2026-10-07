import {AvailabilityError} from './availability-error';
// All scheduling decisions use UK wall-clock time, never the server/browser timezone.
const MINUTE=60_000;
export const RESPONSE_START=8, RESPONSE_END=20;
export function ukParts(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const get=(name:string)=>parts.find(p=>p.type===name)!.value;
 return {date:`${get('year')}-${get('month')}-${get('day')}`,time:`${get('hour')}:${get('minute')}`,hour:Number(get('hour'))};
}
export const calendarDate=(value:Date|string)=>new Date(value).toISOString().slice(0,10);
export function ukInstant(date:string,time:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw new AvailabilityError('Enter a valid UK date and time');
 const nominal=new Date(`${date}T${time}:00Z`);
 if(!Number.isFinite(+nominal)||calendarDate(nominal)!==date)throw new AvailabilityError('Enter a valid UK date');
 // Try both offsets. Reject nonexistent or ambiguous DST times instead of guessing.
 const candidates=[nominal,new Date(+nominal-60*MINUTE)].filter(d=>{const p=ukParts(d);return p.date===date&&p.time===time});
 if(candidates.length!==1)throw new AvailabilityError('That clock time is ambiguous or unavailable when UK clocks change. Choose another time.');
 return candidates[0];
}
function nextDate(date:string){return calendarDate(new Date(+new Date(date+'T12:00:00Z')+86400_000));}
export function validateCollectionWindow(dateValue:Date|string,from?:string|null,until?:string|null,now=new Date(),requireSameDay=true){
 const date=calendarDate(dateValue),today=ukParts(now).date;
 if(date<today)throw new AvailabilityError('Choose a collection date today or later');
 if(!from&&!until){if(requireSameDay&&date===today)throw new AvailabilityError('Same-day collection requires Available from and Collect by times');return {collectionFrom:null,collectionUntil:null};}
 if(!from||!until||from>=until)throw new AvailabilityError('Collect by must be later than Available from');
 const start=ukInstant(date,from),end=ukInstant(date,until);
 if(end<=now)throw new AvailabilityError('The collection window has passed. Choose a later window.');
 return {collectionFrom:from,collectionUntil:until,start,end};
}
export function quoteExpiry(value:string|undefined|null,now=new Date()){
 if(!value)return null;
 const match=/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(value);
 if(!match)throw new AvailabilityError('Choose a quote expiry date and time in UK time');
 const date=ukInstant(match[1],match[2]);if(date<=now)throw new AvailabilityError('Quote expiry must be in the future');return date;
}
function responseStart(now:Date){const p=ukParts(now);return p.hour<8?ukInstant(p.date,'08:00'):p.hour>=20?ukInstant(nextDate(p.date),'08:00'):now;}
function businessDeadline(now:Date,minutes:number){
 let cursor=responseStart(now),remaining=minutes;
 while(remaining>0){const end=ukInstant(ukParts(cursor).date,'20:00'),available=(+end-+cursor)/MINUTE;if(remaining<=available)return new Date(+cursor+remaining*MINUTE);remaining-=available;cursor=ukInstant(nextDate(ukParts(cursor).date),'08:00');}return cursor;
}
export function paymentMinutes(date:Date|string,now=new Date()){return calendarDate(date)===ukParts(now).date?30:120;}
export function collectionLimit(date:Date|string,until?:string|null){return until?ukInstant(calendarDate(date),until):ukInstant(nextDate(calendarDate(date)),'00:00');}
export function confirmationDeadline(date:Date|string,until?:string|null,now=new Date(),offerExpiry?:Date|null){
 const sameDay=calendarDate(date)===ukParts(now).date;
 if(sameDay&&!until)throw new AvailabilityError('Add a collection time window before requesting same-day confirmation');
 const start=responseStart(now);
 // 30 minutes is a minimum travel allowance, not a prediction of the route duration.
 const cutoff=new Date(+collectionLimit(date,until)-(paymentMinutes(date,now)+30)*MINUTE);
 const deadline=new Date(Math.min(+businessDeadline(now,sameDay?60:720),+cutoff,...(offerExpiry?[+offerExpiry]:[]),...(sameDay?[+ukInstant(calendarDate(date),'20:00')]:[])));
 if(+deadline-+start<15*MINUTE)throw new AvailabilityError('There is not enough time for confirmation, payment and travel. Choose a later collection window.');
 return deadline;
}
export function paymentDeadline(date:Date|string,until:string|null,travelMinutes:number,now=new Date()){
 if(!Number.isInteger(travelMinutes)||travelMinutes<30||travelMinutes>1440)throw new AvailabilityError('Allow between 30 minutes and 24 hours for travel');
 if(calendarDate(date)===ukParts(now).date&&!until)throw new AvailabilityError('The customer must add a same-day collection time window');
 const deadline=new Date(Math.min(+now+paymentMinutes(date,now)*MINUTE,+collectionLimit(date,until)-travelMinutes*MINUTE));
 if(+deadline-+now<15*MINUTE)throw new AvailabilityError('There is not enough time for payment and travel. Ask the customer to change the collection window.');
 return deadline;
}
export function isOfferLive(q:{status:string;expiresAt?:Date|string|null},now=new Date()){return q.status==='PENDING'&&(!q.expiresAt||+new Date(q.expiresAt)>+now);}
export function requestExpired(r:{status:string;respondBy:Date|string;payBy?:Date|string|null},now=new Date()){return r.status==='AWAITING_TRANSPORTER'?+new Date(r.respondBy)<=+now:r.status==='AWAITING_PAYMENT'? !r.payBy||+new Date(r.payBy)<=+now:false;}
