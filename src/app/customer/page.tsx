'use client';import {useEffect,useLayoutEffect,useRef,useState} from 'react';import AddressAutocomplete from '@/app/components/AddressAutocomplete';import CustomerCollectionDateActions from '@/app/components/CustomerCollectionDateActions';import Link from 'next/link';import CustomerRequestActions from '@/app/components/CustomerRequestActions';import CustomerReviewForm from '@/app/components/CustomerReviewForm';import {vehicleTypes,vehicleTypeCategory,vehicleTypeDisplay} from '@/lib/vehicle-types';
import {transportTypes,transportTypeDisplay} from '@/lib/transport-types';
import {enclosedTransportCompatibilityMessage,isTransportVehicleCompatible} from '@/lib/transport-compatibility';

const label=(s:string)=>s.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
function collectionDateLabel(value:string|null|undefined){
 const date=value?new Date(value):null;
 return date&&Number.isFinite(date.getTime())?date.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'Date unavailable';
}
function quoteCollectionDateLabel(quote:any,requestedDate:string){
 return collectionDateLabel(quote?.proposedCollectionDate||requestedDate);
}
function quoteCollectionStatus(quote:any){
 switch(quote?.dateNegotiationStatus){
  case 'PROPOSED':return 'Action needed — review date';
  case 'COUNTERED':return 'Awaiting transporter';
  case 'ACCEPTED':return 'Date agreed';
  case 'DECLINED':return 'Original date kept';
  default:return 'Ready to accept';
 }
}
function customerDeliveryProgress(booking:any,customerId?:string){
 const statuses=['COLLECTION_SCHEDULED','COLLECTED','IN_TRANSIT','ARRIVING_SOON','DELIVERED','CANCELLED'];
 const events=Array.isArray(booking.trackingEvents)?booking.trackingEvents:[];
 let latest:any=null;
 for(let i=events.length-1;i>=0;i--){if(events[i].status===booking.status){latest=events[i];break}}
 const confirmationRequired=booking.status==='DELIVERED'&&!booking.customerConfirmedAt;
 return {customerId:customerId||'',bookingId:booking.id,status:booking.status,statusLabel:label(booking.status),eventKey:[booking.status,latest?.id||latest?.createdAt||''].join(':'),persistedEventKey:booking.status==='CANCELLED'&&typeof booking.customerCancellationSeenEventKey==='string'?booking.customerCancellationSeenEventKey:null,highlight:!booking.customerConfirmedAt&&statuses.includes(booking.status),confirmationRequired,deliveredAt:confirmationRequired?customerDeliveredAt(booking):null};
}
function customerDeliveredAt(booking:any){
 return booking.proofOfDelivery?.submittedAt||[...(booking.trackingEvents||[])].reverse().find((event:any)=>event.status==='DELIVERED')?.createdAt||booking.customerConfirmedAt||booking.createdAt;
}
function customerCompletedSummary(booking:any){
 const payment=booking.payment;
 const evidenceCount=(booking.evidence||[]).length;
 return {title:`${booking.job?.vehicleMake||''} ${booking.job?.vehicleModel||''}`.trim(),transporter:booking.transporter?.name||'Transporter',registration:booking.job?.registration||'No registration',deliveredAt:customerDeliveredAt(booking),evidenceCount,paymentText:payment?.refundedPence>0?(payment.status==='REFUNDED'?'Refunded':'Partial refund'):payment?.status?label(payment.status):'Payment complete',eventKey:String(booking.customerConfirmedAt||''),persistedEventKey:typeof booking.customerCompletedSeenEventKey==='string'?booking.customerCompletedSeenEventKey:null};
}
function hasUnseenCustomerProgress(booking:any,customerId?:string){
 if(typeof window==='undefined'||!customerId)return false;
 const progress=customerDeliveryProgress(booking,customerId);
 if(progress.confirmationRequired)return true;
 if(!progress.highlight)return false;
 if(progress.persistedEventKey===progress.eventKey)return false;
 const storageKey='drivedrop:delivery-progress:v1:'+JSON.stringify([progress.customerId,progress.bookingId]);
 try{return localStorage.getItem(storageKey)!==progress.eventKey}catch{return true}
}
function CustomerSummaryActivity({count}:{count:number}){
 if(count<1)return null;
 return <span className="customerSummaryActivity" aria-label="New activity"/>;
}
function completedActivityStorageKey(bookingId:string){return 'drivedrop:customer-completed-activity:v1:'+bookingId}
function completedCardActivityStorageKey(bookingId:string){return 'drivedrop:customer-completed-card-activity:v1:'+bookingId}
function hasUnseenCompletedActivity(booking:any){
 if(typeof window==='undefined'||!booking?.customerConfirmedAt||typeof booking?.id!=='string')return false;
 if(booking.customerCompletedSeenEventKey===String(booking.customerConfirmedAt))return false;
 try{return localStorage.getItem(completedActivityStorageKey(booking.id))===String(booking.customerConfirmedAt)}catch{return false}
}
function markCompletedActivity(bookingId:string,confirmedAt:string){
 try{
  localStorage.setItem(completedActivityStorageKey(bookingId),confirmedAt);
  localStorage.setItem(completedCardActivityStorageKey(bookingId),confirmedAt);
 }catch{}
}
function CustomerDeliveryLocationMap({proof}:{proof:any}){
 const location=proof?.deliveryLocation;
 if(!proof?.submittedAt||typeof location?.latitude!=='number'||typeof location?.longitude!=='number'||!Number.isFinite(location.latitude)||!Number.isFinite(location.longitude)||Math.abs(location.latitude)>90||Math.abs(location.longitude)>180)return null;
 const {latitude,longitude}=location;
 const mapLatitude=Math.max(-85,Math.min(85,latitude));
 const bbox=[Math.max(-180,longitude-0.003),Math.max(-85,mapLatitude-0.002),Math.min(180,longitude+0.003),Math.min(85,mapLatitude+0.002)].join(',');
 const src='https://www.openstreetmap.org/export/embed.html?bbox='+encodeURIComponent(bbox)+'&layer=mapnik&marker='+encodeURIComponent(latitude+','+longitude);
 const capturedAt=location.capturedAt?new Date(location.capturedAt):null;
 const hasTime=capturedAt&&Number.isFinite(capturedAt.getTime());
 const hasAccuracy=typeof location.accuracyMeters==='number'&&Number.isFinite(location.accuracyMeters)&&location.accuracyMeters>=0;
 return <section className="customerDeliveryLocationMap" aria-label="Saved proof of delivery location" style={{flexBasis:'100%',width:'100%',minWidth:0,marginTop:12}}>
  <h3 style={{margin:'0 0 6px',fontSize:14}}>Delivery location</h3>
  <p className="muted" style={{margin:'0 0 10px',fontSize:12}}>Location recorded by the transporter with proof of delivery.</p>
  <iframe title="Saved delivery location map" src={src} loading="lazy" referrerPolicy="no-referrer" allow="geolocation 'none'" style={{display:'block',width:'100%',maxWidth:'100%',boxSizing:'border-box',height:240,border:'1px solid #dce4ed',borderRadius:12,background:'#eef2f6'}}/>
  {(hasAccuracy||hasTime)&&<p className="muted" style={{margin:'8px 0 0',fontSize:12}}>{hasAccuracy?Math.round(location.accuracyMeters)+' m accuracy':''}{hasAccuracy&&hasTime?' · ':''}{hasTime?'Captured '+capturedAt.toLocaleString('en-GB'):''}</p>}
  <small className="muted" style={{display:'block',marginTop:6}}>Saved position, not live tracking. Map: © OpenStreetMap contributors.</small>
 </section>;
}

export default function Customer(){const[jobs,setJobs]=useState<any[]>([]),[me,setMe]=useState<any>(),[bookings,setBookings]=useState<any[]>([]),[disputes,setDisputes]=useState<any[]>([]),[view,setView]=useState<'REQUEST'|'QUOTES'|'BOOKINGS'|'COMPLETED'|'CANCELLED'>('REQUEST'),[submitting,setSubmitting]=useState(false),[formMessage,setFormMessage]=useState<{type:'success'|'error',text:string}|null>(null),[newJobId,setNewJobId]=useState<string|null>(null),[disputeBookingId,setDisputeBookingId]=useState<string|null>(null),[disputeReason,setDisputeReason]=useState(''),[disputeDetails,setDisputeDetails]=useState(''),[disputeSubmitting,setDisputeSubmitting]=useState(false),[disputeMessage,setDisputeMessage]=useState<string|null>(null);const[requestNotice,setRequestNotice]=useState<string|null>(null);const[jobsLoaded,setJobsLoaded]=useState(false);const[bookingsLoaded,setBookingsLoaded]=useState(false);const[quoteRefreshNotice,setQuoteRefreshNotice]=useState<string|null>(null);const[refreshingQuotes,setRefreshingQuotes]=useState(false);const[refreshingBookings,setRefreshingBookings]=useState(false);
const[confirmingBookingId,setConfirmingBookingId]=useState<string|null>(null);
const[bookingQuoteId,setBookingQuoteId]=useState<string|null>(null);
const[selectedVehicleType,setSelectedVehicleType]=useState<string>('');
const pendingAcceptedBookingId=useRef<string|null>(null);
const[bookingNotice,setBookingNotice]=useState<{quoteId:string;type:'error'|'success';text:string}|null>(null);
const bookingInFlight=useRef(false);
const requestInFlight=useRef(false);
const[confirmationNotice,setConfirmationNotice]=useState<{type:'success'|'error',text:string}|null>(null);
const[activityReady,setActivityReady]=useState(false);
const[activityRevision,setActivityRevision]=useState(0);
useEffect(()=>{
 setActivityReady(true);
 const refresh=()=>setActivityRevision(value=>value+1);
 window.addEventListener('drivedrop:customer-progress-seen',refresh);
 window.addEventListener('storage',refresh);
 return()=>{window.removeEventListener('drivedrop:customer-progress-seen',refresh);window.removeEventListener('storage',refresh)};
},[]);
const confirmationInFlight=useRef(false);
const confirmedBookingIds=useRef(new Set<string>());
const deepLinkView=useRef<'QUOTES'|'BOOKINGS'|null>(null);
async function load(){
 const read=async(path:string,apply:(data:any)=>void)=>{
  try{
   const response=await fetch(path,{cache:'no-store'});
   if(!response.ok)return;
   const data=await response.json();
   apply(data);
  }catch{}
 };
 await Promise.all([
  read('/api/me',(data:any)=>{if(data&&typeof data==='object'&&!Array.isArray(data))setMe(data)}),
  read('/api/my-jobs',(data:any)=>{if(Array.isArray(data)){setJobs(data);setJobsLoaded(true)}}),
  read('/api/my-bookings',(data:any)=>{if(Array.isArray(data)){setBookings(data);setBookingsLoaded(true)}}),
  read('/api/disputes',(data:any)=>{if(Array.isArray(data))setDisputes(data)})
 ]);
}useEffect(()=>{
 load();
 const params=new URLSearchParams(window.location.search);
 setSelectedVehicleType(vehicleTypeCategory(params.get('vehicleType'))||'');
 const requestedView=params.get('view');
 if(requestedView==='quotes'||requestedView==='bookings'){
  const next=requestedView==='quotes'?'QUOTES':'BOOKINGS';
  deepLinkView.current=next;
  setView(next);
 }
},[]);
useEffect(()=>{
 const transport=document.getElementById('request-transport-type') as HTMLSelectElement|null;
 const vehicle=document.getElementById('request-vehicle-type') as HTMLSelectElement|null;
 if(!transport||!vehicle)return;
 const validateCompatibility=()=>{
  setSelectedVehicleType(vehicle.value);
  const incompatible=Boolean(transport.value&&vehicle.value&&!isTransportVehicleCompatible(transport.value,vehicle.value));
  setFormMessage(current=>incompatible?{type:'error',text:enclosedTransportCompatibilityMessage}:current?.text===enclosedTransportCompatibilityMessage?null:current);
 };
 transport.addEventListener('change',validateCompatibility);
 vehicle.addEventListener('change',validateCompatibility);
 validateCompatibility();
 return()=>{
  transport.removeEventListener('change',validateCompatibility);
  vehicle.removeEventListener('change',validateCompatibility);
 };
},[]);
useEffect(()=>{
 const targetView=deepLinkView.current;
 if(!targetView||view!==targetView)return;
 const ready=targetView==='QUOTES'?jobsLoaded:bookingsLoaded;
 if(!ready)return;
 const frame=requestAnimationFrame(()=>{
  const target=document.getElementById(targetView==='QUOTES'?'quote-requests':'customer-bookings');
  if(target){target.scrollIntoView({behavior:'auto',block:'start'});deepLinkView.current=null}
 });
 return()=>cancelAnimationFrame(frame);
},[view,jobsLoaded,bookingsLoaded]);
useLayoutEffect(()=>{
 const bookingId=pendingAcceptedBookingId.current;
 if(view!=='BOOKINGS'||!bookingId)return;
 const card=Array.from(document.querySelectorAll<HTMLElement>('.bookingCard')).find(element=>element.dataset.bookingId===bookingId);
 const target=card||document.getElementById('customer-bookings');
 if(!target)return;
 window.scrollTo({top:Math.max(0,target.getBoundingClientRect().top+window.scrollY-(card?72:0)),behavior:'instant'});
 pendingAcceptedBookingId.current=null;
},[view,bookings]);
async function create(e:any){
 e.preventDefault();
 if(requestInFlight.current)return;
 const form=e.currentTarget as HTMLFormElement;
 if(!form.reportValidity())return;
 const requestData=new FormData(form);
 if(!isTransportVehicleCompatible(requestData.get('transportType'),requestData.get('vehicleType'))){
  setFormMessage({type:'error',text:enclosedTransportCompatibilityMessage});
  return;
 }
 requestInFlight.current=true;setSubmitting(true);setFormMessage(null);
 let requestSaved=false;
 try{
  const data:any=Object.fromEntries(requestData);
  data.running=data.running==='true';
  const response=await fetch('/api/jobs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
  const saved=await response.json().catch(()=>null);
  if(!response.ok){
   setFormMessage({type:'error',text:response.status>=500?'We could not confirm whether your request was saved. Refresh and check Your quote requests before submitting again.':typeof saved?.error==='string'?saved.error:'We could not submit your transport request. Please check the details and try again.'});
   return;
  }
  if(typeof saved?.id!=='string'||!saved.id.trim()||saved.status!=='OPEN'){
   setFormMessage({type:'error',text:'We could not verify the submission response. Refresh and check Your quote requests before submitting again.'});
   return;
  }
  requestSaved=true;
  setNewJobId(saved.id);
  setFormMessage(null);
  setRequestNotice('Request submitted — transporters can now send you quotes.');
  setSelectedVehicleType('');
  form.reset();
  try{
   const jobsResponse=await fetch('/api/my-jobs',{cache:'no-store'});
   const rows=await jobsResponse.json().catch(()=>null);
   if(!jobsResponse.ok||!Array.isArray(rows)||!rows.some((job:any)=>job?.id===saved.id))throw new Error('Unable to refresh requests');
   setJobs(rows);setJobsLoaded(true);
  }catch{
   setRequestNotice('Your request was submitted successfully, but the list could not refresh. Refresh the page and select Quote requests to see it — there is no need to submit it again.');
  }
 }catch{
  if(requestSaved)setRequestNotice('Your request was submitted successfully. Refresh the page and select Quote requests to see it — there is no need to submit it again.');
  else setFormMessage({type:'error',text:'The connection was interrupted. Refresh and check Your quote requests before submitting again.'});
 }finally{
  requestInFlight.current=false;setSubmitting(false);
  if(requestSaved){
   setView('QUOTES');
   window.requestAnimationFrame(()=>document.getElementById('quote-requests')?.scrollIntoView({behavior:'smooth',block:'start'}));
  }
 }
}async function confirm(bookingId:string){
 if(confirmationInFlight.current||confirmedBookingIds.current.has(bookingId))return;
 const booking=bookings.find(item=>item.id===bookingId);
 if(!booking||booking.status!=='DELIVERED'||booking.customerConfirmedAt)return;
 confirmationInFlight.current=true;
 setConfirmingBookingId(bookingId);
 setConfirmationNotice(null);
 const vehicle=[booking.job.vehicleMake,booking.job.vehicleModel].filter(Boolean).join(' ')||'Your vehicle';
 try{
  const response=await fetch('/api/bookings/confirm-delivery',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({bookingId})});
  const saved=await response.json().catch(()=>null);
  if(!response.ok){
   setConfirmationNotice({type:'error',text:typeof saved?.error==='string'?saved.error:'Unable to confirm receipt. Please check the delivery and try again.'});
   return;
  }
  if(saved?.id!==bookingId||saved.status!=='DELIVERED'||typeof saved.customerConfirmedAt!=='string'||!Number.isFinite(Date.parse(saved.customerConfirmedAt))){
   setConfirmationNotice({type:'error',text:'We could not verify the confirmation response. Please refresh and check this delivery before trying again.'});
   return;
  }
  confirmedBookingIds.current.add(bookingId);
  markCompletedActivity(bookingId,saved.customerConfirmedAt);
  setActivityRevision(value=>value+1);
  setBookings(current=>current.map(item=>item.id===bookingId?{...item,customerConfirmedAt:saved.customerConfirmedAt}:item));
  setConfirmationNotice({type:'success',text:`${vehicle} receipt confirmed. This delivery is now in Completed, where you can leave a review.`});
  try{await load()}catch{
   setConfirmationNotice({type:'success',text:`${vehicle} receipt confirmed. Some dashboard details could not refresh; refresh the page to see the latest details.`});
  }
 }catch{
  setConfirmationNotice({type:'error',text:'The connection was interrupted. Please refresh and check whether this delivery is already in Completed before trying again.'});
 }finally{
  confirmationInFlight.current=false;
  setConfirmingBookingId(null);
 }
}async function pay(bookingId:string){let r=await fetch('/api/payments/test-pay',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({bookingId})});if(r.ok)load();else alert((await r.json()).error)}async function book(quoteId:string){
 if(bookingInFlight.current)return;
 bookingInFlight.current=true;setBookingQuoteId(quoteId);setBookingNotice(null);
 try{
  const response=await fetch('/api/bookings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({quoteId})});
  const saved=await response.json().catch(()=>null);
  if(!response.ok){setBookingNotice({quoteId,type:'error',text:typeof saved?.error==='string'?saved.error:'Unable to accept this quote. Please try again.'});return}
  if(typeof saved?.id!=='string'||!saved.id||saved.quoteId!==quoteId||!['CONFIRMED','PENDING_PAYMENT'].includes(saved.status)||typeof saved?.payment?.status!=='string'){
   setBookingNotice({quoteId,type:'error',text:'We could not verify the booking response. Refresh and check Your deliveries before trying again.'});return;
  }
  pendingAcceptedBookingId.current=saved.id;
  try{
   const bookingsResponse=await fetch('/api/my-bookings',{cache:'no-store'});
   const rows=await bookingsResponse.json().catch(()=>null);
   if(!bookingsResponse.ok||!Array.isArray(rows)||!rows.some((booking:any)=>booking.id===saved.id))throw new Error('Unable to refresh bookings');
   setBookings(rows);setBookingsLoaded(true);
  }catch{
   setConfirmationNotice({type:'success',text:'Quote accepted and payment recorded. Refresh the dashboard to load the confirmed delivery details.'});
  }
  setJobs(current=>current.filter(job=>!(job.quotes||[]).some((quote:any)=>quote.id===quoteId)));
  setView('BOOKINGS');
 }catch{
  setBookingNotice({quoteId,type:'error',text:'The connection was interrupted. Refresh and check Your deliveries before trying again.'});
 }finally{
  bookingInFlight.current=false;setBookingQuoteId(null);
 }
}function openDispute(bookingId:string){setDisputeBookingId(bookingId);setDisputeReason('');setDisputeDetails('');setDisputeMessage(null)}async function raiseDispute(e:any){e.preventDefault();if(!disputeBookingId)return;setDisputeSubmitting(true);setDisputeMessage(null);try{let r=await fetch('/api/disputes',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({bookingId:disputeBookingId,reason:disputeReason,details:disputeDetails||undefined})});let d=await r.json().catch(()=>null);if(!r.ok){setDisputeMessage(d?.error||'Unable to raise dispute');return;}setDisputeMessage('Dispute raised successfully. DriveDrop will review this booking and any unreleased payout has been placed on hold.');setDisputeReason('');setDisputeDetails('');await load()}finally{setDisputeSubmitting(false)}}const cancelledBookings=bookings.filter(b=>b.status==='CANCELLED');const completedBookings=bookings.filter(b=>b.status!=='CANCELLED'&&!!b.customerConfirmedAt).sort((a,b)=>new Date(customerDeliveredAt(b)).getTime()-new Date(customerDeliveredAt(a)).getTime());const activeBookings=bookings.filter(b=>b.status!=='CANCELLED'&&!b.customerConfirmedAt&&b.status!=='PENDING_PAYMENT');const activityStateReady=activityReady&&activityRevision>=0;const quoteActivityCount=jobs.filter(job=>Array.isArray(job.quotes)&&job.quotes.length>0).length;const bookingActivityCount=activityStateReady?activeBookings.filter(booking=>hasUnseenCustomerProgress(booking,me?.id)).length:0;const completedActivityCount=activityStateReady?completedBookings.filter(hasUnseenCompletedActivity).length:0;const cancelledActivityCount=activityStateReady?cancelledBookings.filter(booking=>hasUnseenCustomerProgress(booking,me?.id)).length:0;const displayedBookings=view==='COMPLETED'?completedBookings:view==='CANCELLED'?cancelledBookings:activeBookings;const showRequestForm=view==='REQUEST';const showBookings=view==='BOOKINGS'||view==='COMPLETED'||view==='CANCELLED';const showQuotes=view==='QUOTES';const bookingViewCopy=view==='COMPLETED'?{id:'completed-deliveries',eyebrow:'',title:'Completed deliveries',emptyTitle:'No completed deliveries yet',emptyText:'Completed and customer-confirmed deliveries will appear here.'}:view==='CANCELLED'?{id:'cancelled-deliveries',eyebrow:'',title:'Cancelled deliveries',emptyTitle:'No cancelled bookings',emptyText:'Cancelled deliveries will appear here and remain separate from your active bookings.'}:{id:'customer-bookings',eyebrow:'',title:'Your deliveries',emptyTitle:'No booked deliveries yet',emptyText:'Your confirmed vehicle deliveries will appear here.'};const bookingRefreshInFlight=useRef(false);const quoteRefreshInFlight=useRef(false);
async function refreshVisibleQuotes(){
 if(quoteRefreshInFlight.current||!jobsLoaded)return;
 quoteRefreshInFlight.current=true;
 setRefreshingQuotes(true);
 setQuoteRefreshNotice(null);
 try{
  const response=await fetch('/api/my-jobs',{cache:'no-store'});
  const rows=await response.json().catch(()=>null);
  if(!response.ok||!Array.isArray(rows))throw new Error('Unable to refresh quotes');
  setJobs(rows);setJobsLoaded(true);
 }catch{
  setQuoteRefreshNotice('Unable to load the latest transporter quotes. Your existing requests are still shown.');
 }finally{
  quoteRefreshInFlight.current=false;
  setRefreshingQuotes(false);
 }
}
async function refreshVisibleBookings(){
 if(bookingRefreshInFlight.current)return;
 bookingRefreshInFlight.current=true;
 setRefreshingBookings(true);
 try{const response=await fetch('/api/my-bookings',{cache:'no-store'});const rows=await response.json();if(!response.ok||!Array.isArray(rows))throw new Error('Unable to refresh deliveries');setBookings(rows);setBookingsLoaded(true)}
 catch{setConfirmationNotice({type:'error',text:'Unable to load the latest delivery status. Please refresh before confirming receipt.'})}
 finally{bookingRefreshInFlight.current=false;setRefreshingBookings(false)}
}
const toggleView=(next:'QUOTES'|'BOOKINGS'|'COMPLETED'|'CANCELLED')=>{if(view===next){setFormMessage(null);setView('REQUEST');return}setView(next);if(next==='QUOTES')void refreshVisibleQuotes();else if(next==='BOOKINGS'||next==='COMPLETED'||next==='CANCELLED')void refreshVisibleBookings()};return <main className="shell dashboardShell"><header className="dashboardHero"><div><span className="dashboardEyebrow">Customer account</span><h1>Your vehicle deliveries</h1><p>{me?`Welcome back, ${me.name}. Manage quotes, bookings and deliveries in one place.`:'Manage quotes, bookings and deliveries in one place.'}</p></div><div className="dashboardSummary customerDashboardSummary"><div role="button" tabIndex={0} aria-pressed={view==='QUOTES'} className={quoteActivityCount>0?'hasCustomerSummaryActivity':undefined} onClick={()=>toggleView('QUOTES')} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleView('QUOTES')}}} style={{cursor:'pointer'}}><strong>{jobsLoaded?jobs.length:'—'}</strong><span>Quote requests</span><CustomerSummaryActivity count={quoteActivityCount}/></div><div role="button" tabIndex={0} aria-pressed={view==='BOOKINGS'} className={bookingActivityCount>0?'hasCustomerSummaryActivity':undefined} onClick={()=>toggleView('BOOKINGS')} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleView('BOOKINGS')}}} style={{cursor:'pointer'}}><strong>{bookingsLoaded?activeBookings.length:'—'}</strong><span>Your deliveries</span><CustomerSummaryActivity count={bookingActivityCount}/></div><div role="button" tabIndex={0} aria-pressed={view==='COMPLETED'} className={completedActivityCount>0?'hasCustomerSummaryActivity':undefined} onClick={()=>toggleView('COMPLETED')} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleView('COMPLETED')}}} style={{cursor:'pointer'}}><strong>{bookingsLoaded?completedBookings.length:'—'}</strong><span>Completed</span><CustomerSummaryActivity count={completedActivityCount}/></div><div role="button" tabIndex={0} aria-pressed={view==='CANCELLED'} className={cancelledActivityCount>0?'hasCustomerSummaryActivity':undefined} onClick={()=>toggleView('CANCELLED')} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleView('CANCELLED')}}} style={{cursor:'pointer'}}><strong>{bookingsLoaded?cancelledBookings.length:'—'}</strong><span>Cancelled</span><CustomerSummaryActivity count={cancelledActivityCount}/></div></div></header>{view!=='REQUEST'&&<div className="dashboardFilterBar"><span>Showing {view==='QUOTES'?'quote requests':view==='BOOKINGS'?'your deliveries':view==='CANCELLED'?'cancelled deliveries':'completed deliveries'} only</span><button type="button" className="textAction" onClick={()=>{setFormMessage(null);setView('REQUEST')}}>Request vehicle transport</button></div>}<section className="dashboardCard requestPanel" hidden={!showRequestForm}><div className="panelHeading"><div><span className="panelIcon">＋</span><div><h2>Request vehicle transport</h2><p>Tell us what needs moving and verified transporters can send you quotes.</p></div></div></div><form onSubmit={create}><div className="grid"><AddressAutocomplete key={`collection-${newJobId||'draft'}`} name="collection" label="COLLECTION"/><AddressAutocomplete key={`delivery-${newJobId||'draft'}`} name="delivery" label="DELIVERY"/><div className="field"><label htmlFor="request-collection-date">COLLECTION DATE</label><input id="request-collection-date" type="date" name="collectionDate" required/></div><div className="field"><label htmlFor="request-transport-type">TRANSPORT TYPE</label><select id="request-transport-type" name="transportType" required defaultValue=""><option value="" disabled>Select transport type</option>{transportTypes.map(type=><option key={type.value} value={type.value}>{type.label}</option>)}</select></div><div className="field"><label htmlFor="request-vehicle-type">VEHICLE TYPE</label><select id="request-vehicle-type" name="vehicleType" required value={selectedVehicleType} onChange={event=>setSelectedVehicleType(event.target.value)}><option value="" disabled>Select vehicle type</option>{vehicleTypes.map(type=><option key={type} value={type}>{type}</option>)}</select></div><div className="field"><label htmlFor="request-vehicle-make">MAKE</label><input id="request-vehicle-make" name="vehicleMake" required/></div><div className="field"><label htmlFor="request-vehicle-model">MODEL</label><input id="request-vehicle-model" name="vehicleModel" required/></div><div className="field"><label htmlFor="request-registration">REGISTRATION</label><input id="request-registration" name="registration" maxLength={20} placeholder="e.g. AB12 CDE" autoCapitalize="characters"/></div><div className="field"><label htmlFor="request-running">RUNNING?</label><select id="request-running" name="running"><option value="true">Runs and drives</option><option value="false">Non-running</option></select></div></div>{formMessage&&<div className={formMessage.type==='success'?'formNotice successNotice':'formNotice errorNotice'} role={formMessage.type==='success'?'status':'alert'}>{formMessage.text}</div>}<button type="submit" className="btn orange" disabled={submitting} aria-busy={submitting}>{submitting?'Submitting request…':'Request quotes'}</button></form></section>{showBookings&&<>{confirmationNotice&&<div className={confirmationNotice.type==='success'?'formNotice successNotice':'formNotice errorNotice'} role={confirmationNotice.type==='success'?'status':'alert'}>{confirmationNotice.text}</div>}<div id={bookingViewCopy.id} className="dashboardSectionHeading"><div>{bookingViewCopy.eyebrow&&<span className="dashboardEyebrow dark">{bookingViewCopy.eyebrow}</span>}<h2>{bookingViewCopy.title}</h2></div><span aria-live="polite">{refreshingBookings?'Refreshing…':bookingsLoaded?`${displayedBookings.length} total`:'Loading…'}</span></div>{!bookingsLoaded&&<div className="dashboardCard emptyState" role="status"><div aria-hidden="true">⏳</div><h3>Loading deliveries…</h3><p>Fetching your latest booking and delivery information.</p></div>}{bookingsLoaded&&displayedBookings.length===0&&<div className="dashboardCard emptyState"><div>🚗</div><h3>{bookingViewCopy.emptyTitle}</h3><p>{bookingViewCopy.emptyText}</p></div>}{displayedBookings.map(b=>{const bookingDisputes=disputes.filter(d=>d.bookingId===b.id);const activeDispute=bookingDisputes.find(d=>['OPEN','UNDER_REVIEW'].includes(d.status));const latestResolved=bookingDisputes.find(d=>d.status==='RESOLVED');const refundedPence=b.payment?.refundedPence||0;return <article className="dashboardCard bookingCard" key={`${view}:${b.id}`} data-booking-id={b.id} data-delivery-progress={JSON.stringify(customerDeliveryProgress(b,me?.id))} data-completed-summary={b.customerConfirmedAt?JSON.stringify(customerCompletedSummary(b)):undefined}>{refundedPence>0&&<div className={b.payment?.status==='REFUNDED'?'formNotice successNotice':'formNotice'}><strong>{b.payment?.status==='REFUNDED'?'Refund completed':'Partial refund issued'}</strong><div style={{marginTop:4,fontWeight:600}}>DriveDrop has refunded £{(refundedPence/100).toFixed(2)} to you for this delivery.</div></div>}<div className="bookingTop"><div><span className="statusPill">{label(b.status)}</span>{refundedPence>0&&<span className="statusPill">{b.payment?.status==='REFUNDED'?'Refunded':'Partial refund'}</span>}<h2>{b.job.vehicleMake} {b.job.vehicleModel}</h2><p className="bookingPartner">Transporter · <b>{b.transporter.name}</b></p></div>{b.payment&&<div className="paymentMini"><span>{refundedPence>0?'Refunded':'Total payment'}</span><strong>£{((refundedPence>0?refundedPence:b.payment.depositPence)/100).toFixed(2)}</strong><small>{label(b.payment.status)}</small></div>}</div><div className={`customerDeliveryDetails ${!b.customerConfirmedAt?'customerActiveDeliveryDetails':''}`}>{!b.customerConfirmedAt&&<div className="customerCollapsedDeliveryIdentity"><div><span>Transporter</span><strong>{b.transporter?.name?.trim()||'Not provided'}</strong></div><div><span>Vehicle registration</span><strong>{b.job.registration?.trim()||'Not provided'}</strong></div></div>}<div className="customerDeliveryDate"><span>Agreed collection date</span><strong>{collectionDateLabel(b.job.collectionDate)}</strong></div>{b.transporter?.id&&<Link className="btn light customerViewTransporterProfile" prefetch={false} href={`/transporter/profile/${encodeURIComponent(b.transporter.id)}`} aria-label={`View ${b.transporter.name} transporter profile`}>View transporter profile</Link>}{view==='BOOKINGS'?<div className="customerTransporterContactActions"><Link className="btn navy customerMessageTransporter" prefetch={false} href={`/messages?bookingId=${encodeURIComponent(b.id)}`} aria-label={`Message transporter about ${b.job.vehicleMake} ${b.job.vehicleModel}`}>✉ Message transporter</Link>{/\d/.test(String(b.transporter?.phone||''))?<a className="btn navy customerCallTransporter" href={`tel:${String(b.transporter.phone).replace(/[^\d+]/g,'')}`} aria-label={`Call transporter ${b.transporter.name}`}>☎ Call transporter</a>:<button type="button" className="btn navy customerCallTransporter" disabled title="Transporter phone number unavailable">☎ Call transporter</button>}</div>:null}{b.status==='DELIVERED'&&b.customerConfirmedAt&&<Link className="btn light customerStatementButton" prefetch={false} target="_blank" rel="noreferrer" href={`/bookings/${encodeURIComponent(b.id)}/statement`} aria-label={`Open printable receipt for ${b.job.vehicleMake} ${b.job.vehicleModel}`}>↓ Printable receipt</Link>}{b.status==='DELIVERED'&&<CustomerDeliveryLocationMap proof={b.proofOfDelivery}/>}{b.status==='DELIVERED'&&!b.customerConfirmedAt&&<div style={{flexBasis:'100%'}}><p className="muted">Delivered — please confirm once you have received the vehicle.</p><button type="button" className="btn orange fullBtn" disabled={confirmingBookingId!==null} aria-busy={confirmingBookingId===b.id} onClick={()=>confirm(b.id)}>{confirmingBookingId===b.id?'Confirming receipt…':'Confirm vehicle received'}</button></div>}</div><div className="routeVisual"><div><i>●</i><span><small>Collection</small><b>{b.job.collection}</b></span></div><div className="routeLine"/><div><i>●</i><span><small>Delivery</small><b>{b.job.delivery}</b></span></div></div><section className="activeVehicleDetails" data-active-vehicle-details="true"><div className="activeVehicleDetailsHeading"><span>Vehicle details</span><small>Transport request information</small></div><div className="activeVehicleDetailsGrid"><span><small>Transport type</small><b>{transportTypeDisplay(b.job.transportType)}</b></span><span><small>Vehicle type</small><b>{vehicleTypeDisplay(b.job.vehicleType)}</b></span><span><small>Make & model</small><b>{`${b.job.vehicleMake||''} ${b.job.vehicleModel||''}`.trim()||'Not specified'}</b></span><span><small>Registration</small><b>{b.job.registration||'Not provided'}</b></span><span><small>Running condition</small><b>{b.job.running?'Runs & drives':'Non-running'}</b></span><span><small>Collection date</small><b>{b.job.collectionDate?new Date(b.job.collectionDate).toLocaleDateString('en-GB'):'Not specified'}</b></span></div></section><div className="bookingColumns"><section><h3>Delivery progress</h3><div className="timeline polishedTimeline"><div className="event"><b>Booking confirmed</b></div>{b.trackingEvents.map((e:any)=><div className="event" key={e.id}><b>{label(e.status)}</b><small>{new Date(e.createdAt).toLocaleString('en-GB')}</small>{e.note&&<div className="muted">{e.note}</div>}</div>)}</div></section><section><h3>Payment & actions</h3>{b.payment&&<div className="infoPanel"><div className="infoRow"><span>Payment status</span><b>{label(b.payment.status)}</b></div><div className="infoRow"><span>Total payment</span><b>£{(b.payment.depositPence/100).toFixed(2)}</b></div>{refundedPence>0&&<><div className="infoRow"><span>Refunded to you</span><b>£{(refundedPence/100).toFixed(2)}</b></div><div className="infoRow"><span>Remaining paid amount</span><b>£{(Math.max(0,b.payment.paidPence-refundedPence)/100).toFixed(2)}</b></div></>}<div className="infoRow"><span>DriveDrop fee</span><b>£{(b.payment.platformFeePence/100).toFixed(2)}</b></div>{b.payment.status==='PENDING'&&<button className="btn orange fullBtn" onClick={()=>pay(b.id)}>Test: Pay total</button>}</div>}{b.status==='DELIVERED'&&b.customerConfirmedAt&&!b.review&&<CustomerReviewForm bookingId={b.id} onSubmitted={review=>setBookings(current=>current.map(booking=>booking.id===b.id?{...booking,review}:booking))}/>} {b.review&&<div className="infoPanel"><h3>Your review</h3><p className="statusPill successPill" role="status">Verified review · {b.review.rating}/5</p>{typeof b.review.body==='string'&&b.review.body.trim()&&<p className="muted" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{b.review.body}</p>}</div>}{activeDispute?<div className="infoPanel"><div className="infoRow"><span>Dispute status</span><b>{label(activeDispute.status)}</b></div><div className="infoRow"><span>Reason</span><b>{activeDispute.reason}</b></div><p className="muted">DriveDrop is reviewing this booking. Any unreleased transporter payout remains protected while the dispute is active.</p></div>:<>{latestResolved&&<div className="infoPanel"><div className="infoRow"><span>Latest dispute</span><b>Resolved</b></div><div className="infoRow"><span>Reason</span><b>{latestResolved.reason}</b></div>{latestResolved.resolution&&<div className="infoRow"><span>Outcome</span><b>{label(latestResolved.resolution)}</b></div>}{latestResolved.reviewedAt&&<div className="infoRow"><span>Resolved</span><b>{new Date(latestResolved.reviewedAt).toLocaleDateString('en-GB')}</b></div>}{latestResolved.resolutionNote&&<p className="muted">{latestResolved.resolutionNote}</p>}<p className="muted">This case has been closed by DriveDrop. You can raise another dispute if a separate issue needs review.</p></div>}{b.status!=='CANCELLED'&&<button className="btn light fullBtn" onClick={()=>openDispute(b.id)}>{latestResolved?'Raise another dispute':'Raise a dispute'}</button>}</>}{disputeBookingId===b.id&&!activeDispute&&<form onSubmit={raiseDispute} className="infoPanel" style={{marginTop:12}}><h3>{latestResolved?'Raise another dispute':'Raise a dispute'}</h3><p className="muted">Tell DriveDrop what went wrong. Submitting this will hold any unreleased transporter payout while the issue is reviewed.</p><div className="field"><label>REASON</label><input value={disputeReason} onChange={e=>setDisputeReason(e.target.value)} minLength={3} maxLength={120} required placeholder="e.g. Vehicle condition or delivery issue"/></div><div className="field"><label>DETAILS</label><textarea value={disputeDetails} onChange={e=>setDisputeDetails(e.target.value)} maxLength={2000} rows={4} placeholder="Describe what happened and any important details"/></div>{disputeMessage&&<div className={disputeMessage.startsWith('Dispute raised')?'formNotice successNotice':'formNotice errorNotice'}>{disputeMessage}</div>}<div className="actionButtons"><button className="btn orange" disabled={disputeSubmitting}>{disputeSubmitting?'Submitting…':'Submit dispute'}</button><button type="button" className="btn light" onClick={()=>{setDisputeBookingId(null);setDisputeMessage(null)}}>Cancel</button></div></form>}</section></div></article>})}</>}{showQuotes&&<section id="quote-requests"><div className="dashboardSectionHeading"><div><h2>Your quote requests</h2></div><span aria-live="polite">{refreshingQuotes?'Refreshing…':jobsLoaded?`${jobs.length} total`:'Loading…'}</span></div>{requestNotice&&<div className="formNotice successNotice" role="status">{requestNotice}</div>}{quoteRefreshNotice&&<div className="formNotice errorNotice" role="alert">{quoteRefreshNotice}</div>}{!jobsLoaded&&<div className="dashboardCard emptyState" role="status"><div aria-hidden="true">⏳</div><h3>Loading quote requests…</h3><p>Fetching your latest requests and transporter quotes.</p></div>}{jobsLoaded&&jobs.length===0&&<div className="dashboardCard emptyState"><div aria-hidden="true">🚗</div><h3>No active quote requests</h3><p>Request vehicle transport to receive quotes. Booked deliveries are shown in Your deliveries.</p><button type="button" className="btn orange" onClick={()=>{setRequestNotice(null);setFormMessage(null);setView('REQUEST');window.requestAnimationFrame(()=>document.querySelector<HTMLElement>('.requestPanel')?.scrollIntoView({behavior:'smooth',block:'start'}))}}>Request vehicle transport</button></div>}{jobs.map(j=><article className={`dashboardCard quoteRequestCard${j.quotes.length>0?' hasCustomerQuotes':''}${j.id===newJobId?' newRequestCard':''}`} key={j.id}><div className="bookingTop"><div><span className="statusPill">{label(j.status)}</span>{j.quotes.length>0&&<span className="quotesReceivedBadge">{j.quotes.length===1?'✓ Quote received':`✓ ${j.quotes.length} quotes received`}</span>}<h2>{j.vehicleMake} {j.vehicleModel}</h2><p className="bookingPartner">Requested collection · {new Date(j.collectionDate).toLocaleDateString('en-GB')}</p></div><div className="quoteCount"><strong>{j.quotes.length}</strong><span>Quotes</span></div></div><div className="routeVisual compactRoute"><div><i>●</i><span><small>Collection</small><b>{j.collection}</b></span></div><div className="routeLine"/><div><i>●</i><span><small>Delivery</small><b>{j.delivery}</b></span></div></div><div className="customerRequestDetailsPanel" data-request-details="true"><div className="customerRequestDetailsHead"><div><span>Original transport request</span><b>Vehicle & collection details</b></div><small>Everything supplied when this request was created</small></div><div className="customerRequestDetailsGrid"><div><span>Transport type</span><b>{transportTypeDisplay(j.transportType)}</b></div><div><span>Vehicle type</span><b>{j.vehicleType?vehicleTypeDisplay(j.vehicleType):'Not provided'}</b></div><div><span>Make</span><b>{j.vehicleMake||'Not provided'}</b></div><div><span>Model</span><b>{j.vehicleModel||'Not provided'}</b></div><div><span>Registration</span><b>{j.registration||'Not provided'}</b></div><div><span>Running condition</span><b>{j.running?'Runs and drives':'Non-running'}</b></div><div><span>Collection date</span><b>{collectionDateLabel(j.collectionDate)}</b></div><div className="wide"><span>Collection</span><b>{j.collection}</b></div><div className="wide"><span>Delivery</span><b>{j.delivery}</b></div></div></div>{j.quotes.map((q:any)=><div className="quoteOffer" key={q.id} data-quote-summary={JSON.stringify({name:q.transporter.name,verified:q.transporter.transporterVerification?.status==='APPROVED',message:q.message?.trim()||'No message provided',price:`£${(q.pricePence/100).toFixed(2)}`,date:quoteCollectionDateLabel(q,j.collectionDate),status:quoteCollectionStatus(q)})}><div className="quoteTransporter"><div className={`transporterAvatar${q.transporter.profileImageUrl?' hasProfileImage':''}`}>{q.transporter.profileImageUrl?<img src={q.transporter.profileImageUrl} alt={`${q.transporter.businessName||q.transporter.personName||'Transporter'} profile`}/>:'🚛'}</div><div><b>{q.transporter.name}</b>{q.transporter.transporterVerification?.status==='APPROVED'&&<span className="verifiedMini">✓ DriveDrop Verified</span>}<p>{q.message}</p>{q.proposedCollectionDate&&<div className="infoPanel"><div className="infoRow"><span>{q.dateNegotiationStatus==='COUNTERED'?'Your counter-date':q.dateNegotiationStatus==='ACCEPTED'?'Agreed collection date':'Proposed collection date'}</span><b>{new Date(q.proposedCollectionDate).toLocaleDateString('en-GB')}</b></div><div className="infoRow"><span>Date status</span><b>{quoteCollectionStatus(q)}</b></div>{q.status==='PENDING'&&q.dateNegotiationStatus==='PROPOSED'&&<CustomerCollectionDateActions quoteId={q.id} proposedDate={q.proposedCollectionDate} onUpdated={update=>setJobs(current=>current.map(job=>job.id===j.id?{...job,quotes:job.quotes.map((quote:any)=>quote.id===q.id?{...quote,proposedCollectionDate:update.proposedCollectionDate,dateNegotiationStatus:update.dateNegotiationStatus}:quote)}:job))}/>} {q.dateNegotiationStatus==='COUNTERED'&&<p className="muted">Awaiting the transporter’s response to your proposed date.</p>}</div>}</div><div className="transporterSummaryMeta"><div className="transporterTrustRow"><span>{q.transporter.verificationStatus==='APPROVED'?'✓ DriveDrop Verified':'Verification pending'}</span><span>{q.transporter.averageRating!==null&&q.transporter.averageRating!==undefined?`★ ${Number(q.transporter.averageRating).toFixed(1)} · ${q.transporter.reviewCount} review${q.transporter.reviewCount===1?'':'s'}`:'★ New transporter'}</span><span>{q.transporter.yearsOperating===null||q.transporter.yearsOperating===undefined?'New business':`${q.transporter.yearsOperating} year${q.transporter.yearsOperating===1?'':'s'} operating`}</span></div><Link className="btn light transporterProfileLink" href={`/transporter/profile/${encodeURIComponent(q.transporter.id)}`}>View profile</Link></div></div><div className="quoteDecision"><span className="customerQuoteTotalLabel">Total price</span><strong>£{(q.pricePence/100).toFixed(2)}</strong>{q.status==='PENDING'&&!['PROPOSED','COUNTERED'].includes(q.dateNegotiationStatus)&&<button type="button" className="btn orange" disabled={bookingQuoteId!==null} aria-busy={bookingQuoteId===q.id} onClick={()=>book(q.id)}>{bookingQuoteId===q.id?'Accepting & paying…':'Accept quote & pay'}</button>}{q.status!=='PENDING'&&<span className="statusPill">{label(q.status)}</span>}</div>{bookingNotice&&bookingNotice.quoteId===q.id&&<div className={bookingNotice.type==='error'?'formNotice errorNotice':'formNotice successNotice'} role={bookingNotice.type==='error'?'alert':'status'}>{bookingNotice.text}</div>}</div>)}<CustomerRequestActions jobId={j.id} vehicle={`${j.vehicleMake} ${j.vehicleModel}`} status={j.status} hasBooking={!!j.booking} quoteCount={j.quotes.length} onRemoved={action=>{setJobs(current=>current.filter(job=>job.id!==j.id));setRequestNotice(action==='DELETE'?`${j.vehicleMake} ${j.vehicleModel} request deleted permanently.`:`${j.vehicleMake} ${j.vehicleModel} request cancelled — it is no longer available to transporters.`)}}/></article>)}</section>}</main>}
