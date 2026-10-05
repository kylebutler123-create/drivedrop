'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Icon from './ApprovedIcon';
import {transportTypeDisplay} from '@/lib/transport-types';
import '../transporter-cancelled.css';

type CancelledBooking={
 id:string;cancelledAt:string|null;cancellationNote:string|null;
 customer:{name:string};
 job:{vehicleMake:string;vehicleModel:string;collection:string;delivery:string;registration:string|null;running:boolean;transportType:string;collectionDate:string};
};
const date=(value:string|null)=>{
 const parsed=value?new Date(value):null;
 return parsed&&Number.isFinite(parsed.getTime())?parsed.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/London'}):'Not recorded';
};
const reference=(id:string)=>`DD-${id.slice(-8).toUpperCase()}`;

export default function TransporterCancelledDeliveries({selected,onCountChange}:{selected:boolean;onCountChange:(count:number)=>void}){
 const [bookings,setBookings]=useState<CancelledBooking[]|null>(null);
 const [error,setError]=useState(false);
 const [refreshing,setRefreshing]=useState(false);
 const [expanded,setExpanded]=useState<string|null>(null);
 const [desktop,setDesktop]=useState(false);
 const inFlight=useRef<AbortController|null>(null);
 const refresh=useCallback(async()=>{
  if(inFlight.current)return;
  const controller=new AbortController();
  inFlight.current=controller;setRefreshing(true);setError(false);
  try{
   const response=await fetch('/api/transporter/cancelled',{cache:'no-store',signal:controller.signal});
   const data=await response.json();
   if(!response.ok||!Array.isArray(data?.bookings))throw new Error('Unable to load cancellations');
   if(!controller.signal.aborted){setBookings(data.bookings);onCountChange(data.bookings.length)}
  }catch{
   if(!controller.signal.aborted)setError(true);
  }finally{
   if(!controller.signal.aborted)setRefreshing(false);
   if(inFlight.current===controller)inFlight.current=null;
  }
 },[onCountChange]);
 useEffect(()=>{
  const media=window.matchMedia('(min-width:1024px)');
  const update=()=>setDesktop(media.matches);
  update();media.addEventListener('change',update);
  return()=>{media.removeEventListener('change',update);inFlight.current?.abort();inFlight.current=null};
 },[]);
 useEffect(()=>{
  if(!desktop)return;
  void refresh();
  const update=()=>{void refresh()};
  window.addEventListener('drivedrop-bookings-updated',update);
  window.addEventListener('focus',update);
  return()=>{window.removeEventListener('drivedrop-bookings-updated',update);window.removeEventListener('focus',update)};
 },[desktop,refresh]);
 useEffect(()=>{
  if(selected&&desktop)void refresh();
  if(!selected)setExpanded(null);
 },[selected,desktop,refresh]);

 return <>
  {selected&&desktop&&<section className="transporterCancelledList" id="cancelled-deliveries" aria-labelledby="cancelled-deliveries-heading" aria-busy={refreshing}>
   <div className="transporterCancelledHeading"><h2 id="cancelled-deliveries-heading">Cancelled deliveries</h2><span aria-live="polite">{refreshing?'Refreshing…':bookings!==null?`${bookings.length} total`:error?'Unavailable':'Loading…'}</span></div>
   {error&&<div className="formNotice errorNotice" role="alert"><span>{bookings===null?'Unable to load cancelled deliveries.':'Unable to refresh cancelled deliveries. Your existing cards are still shown.'}</span><button type="button" className="btn light" onClick={()=>void refresh()} disabled={refreshing}>Try again</button></div>}
   {bookings===null&&!error&&<p role="status">Loading cancelled deliveries…</p>}
   {bookings?.length===0&&<div className="transporterCancelledEmpty"><h3>No cancelled deliveries</h3><p>Your cancelled deliveries will appear here.</p></div>}
   {bookings?.map(booking=>{
    const open=expanded===booking.id;
    const detailsId=`cancelled-details-${booking.id}`;
    return <article className="transporterCancelledCard" key={booking.id}>
     <button type="button" className="transporterCancelledToggle" aria-expanded={open} aria-controls={detailsId} onClick={()=>setExpanded(open?null:booking.id)}>
      <Icon name="car"/>
      <span className="transporterCancelledIdentity"><strong>{booking.job.vehicleMake} {booking.job.vehicleModel}</strong><span className="transporterCancelledBadge">Cancelled</span><small>Delivery reference: {reference(booking.id)}</small></span>
      <span className="transporterCancelledStop"><small>Collection</small><b>{booking.job.collection}</b></span><span className="transporterCancelledArrow"><Icon name="arrow"/></span>
      <span className="transporterCancelledStop"><small>Delivery</small><b>{booking.job.delivery}</b></span>
      <span className="transporterCancelledDate"><small>Cancelled on</small><b>{date(booking.cancelledAt)}</b></span>
      <svg className="transporterCancelledChevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
     </button>
     <div className="transporterCancelledDetails" id={detailsId} hidden={!open}>
      <dl><div><dt>Transport type</dt><dd>{transportTypeDisplay(booking.job.transportType)}</dd></div><div><dt>Registration</dt><dd>{booking.job.registration||'Not provided'}</dd></div><div><dt>Running condition</dt><dd>{booking.job.running?'Runs & drives':'Non-running'}</dd></div><div><dt>Requested collection date</dt><dd>{date(booking.job.collectionDate)}</dd></div><div><dt>Customer</dt><dd>{booking.customer.name}</dd></div></dl>
      {booking.cancellationNote&&<p><strong>Cancellation note</strong><span>{booking.cancellationNote}</span></p>}
     </div>
    </article>;
   })}
  </section>}
 </>;
}
