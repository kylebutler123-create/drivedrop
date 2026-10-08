import {vehicleTypeDisplay} from '@/lib/vehicle-types';
import {transportTypeDisplay} from '@/lib/transport-types';

export function ExpandedFacts({job,customer}:{job:any;customer?:string}){
 const facts=[['Vehicle type',vehicleTypeDisplay(job.vehicleType)],['Transport type',transportTypeDisplay(job.transportType).replace(/\s*[\p{Extended_Pictographic}\uFE0F]+/gu,'')],['Registration',job.registration||'Not provided'],['Running condition',job.running?'Runs & drives':'Non-running'],['Collection window · UK',job.collectionFrom&&job.collectionUntil?`${job.collectionFrom} – ${job.collectionUntil}`:'To be arranged']];
 if(customer)facts.push(['Customer',customer]);
 return <dl className={`tdFacts ${customer?'tdFactsSix':''}`}>{facts.map(([name,value])=><div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>;
}
export function DeliveryProgress({booking}:{booking:any}){
 const stages=[['CONFIRMED','Booking confirmed'],['COLLECTED','Collected'],['IN_TRANSIT','In transit'],['DELIVERED','Delivered']];
 const events=booking.trackingEvents||[];
 const index=booking.status==='DELIVERED'?3:['IN_TRANSIT','ARRIVING_SOON'].includes(booking.status)?2:booking.status==='COLLECTED'?1:0;
 return <div className="tdDesktopOnly"><div className="tdProgress">{stages.map(([status,title],i)=>{
 const event=events.find((e:any)=>e.status===status);
 const time=event?.createdAt||(i===0?booking.createdAt:null);
 return <div className={'tdProgressStep'+(i<=index?' isReached':'')} key={status}><b>{title}</b>{time&&<small>{new Date(time).toLocaleString('en-GB',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'})}</small>}</div>;
 })}</div>{events.length>0&&<details className="tdStatusNotes"><summary>Status updates</summary>{events.map((event:any)=><p key={event.id}><b>{event.status.replaceAll('_',' ')}</b> · {new Date(event.createdAt).toLocaleString('en-GB',{timeZone:'Europe/London'})}<br/>{event.note}</p>)}</details>}</div>;
}
