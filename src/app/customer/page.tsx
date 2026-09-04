'use client';import {useEffect,useRef,useState} from 'react';import AddressAutocomplete from '@/app/components/AddressAutocomplete';import CustomerCollectionDateActions from '@/app/components/CustomerCollectionDateActions';import Link from 'next/link';import CustomerRequestActions from '@/app/components/CustomerRequestActions';import CustomerReviewForm from '@/app/components/CustomerReviewForm';
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
 return {customerId:customerId||'',bookingId:booking.id,statusLabel:label(booking.status),eventKey:[booking.status,latest?.id||latest?.createdAt||''].join(':'),highlight:!booking.customerConfirmedAt&&statuses.includes(booking.status)};
}
export default function Customer(){const[jobs,setJobs]=useState<any[]>([]),[me,setMe]=useState<any>(),[bookings,setBookings]=useState<any[]>([]),[disputes,setDisputes]=useState<any[]>([]),[view,setView]=useState<'REQUEST'|'QUOTES'|'BOOKINGS'|'COMPLETED'>('REQUEST'),[submitting,setSubmitting]=useState(false),[formMessage,setFormMessage]=useState<{type:'success'|'error',text:string}|null>(null),[newJobId,setNewJobId]=useState<string|null>(null),[disputeBookingId,setDisputeBookingId]=useState<string|null>(null),[disputeReason,setDisputeReason]=useState(''),[disputeDetails,setDisputeDetails]=useState(''),[disputeSubmitting,setDisputeSubmitting]=useState(false),[disputeMessage,setDisputeMessage]=useState<string|null>(null);const[requestNotice,setRequestNotice]=useState<string|null>(null);const[jobsLoaded,setJobsLoaded]=useState(false);const[bookingsLoaded,setBookingsLoaded]=useState(false);const[quoteRefreshNotice,setQuoteRefreshNotice]=useState<string|null>(null);const[refreshingQuotes,setRefreshingQuotes]=useState(false);const[refreshingBookings,setRefreshingBookings]=useState(false);
const[confirmingBookingId,setConfirmingBookingId]=useState<string|null>(null);
const[bookingQuoteId,setBookingQuoteId]=useState<string|null>(null);
const[bookingNotice,setBookingNotice]=useState<{quoteId:string;type:'error'|'success';text:string}|null>(null);
const bookingInFlight=useRef(false);
const requestInFlight=useRef(false);
const[confirmationNotice,setConfirmationNotice]=useState<{type:'success'|'error',text:string}|null>(null);
const confirmationInFlight=useRef(false);
const confirmedBookingIds=useRef(new Set<string>());
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
}useEffect(()=>{load()},[]);async function create(e:any){
 e.preventDefault();
 if(requestInFlight.current)return;
 const form=e.currentTarget as HTMLFormElement;
 if(!form.reportValidity())return;
 requestInFlight.current=true;setSubmitting(true);setFormMessage(null);
 let requestSaved=false;
 try{
  const data:any=Object.fromEntries(new FormData(form));
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
  setJobs(current=>current.filter(job=>!(job.quotes||[]).some((quote:any)=>quote.id===quoteId)));
  setView('BOOKINGS');
  try{
   const bookingsResponse=await fetch('/api/my-bookings',{cache:'no-store'});
   const rows=await bookingsResponse.json().catch(()=>null);
   if(!bookingsResponse.ok||!Array.isArray(rows)||!rows.some((booking:any)=>booking.id===saved.id))throw new Error('Unable to refresh bookings');
   setBookings(rows);setBookingsLoaded(true);
  }catch{
   setConfirmationNotice({type:'success',text:'Quote accepted and payment recorded. Refresh the dashboard to load the confirmed delivery details.'});
  }
  window.requestAnimationFrame(()=>document.querySelector<HTMLElement>('.bookingCard')?.scrollIntoView({behavior:'smooth',block:'start'}));
 }catch{
  setBookingNotice({quoteId,type:'error',text:'The connection was interrupted. Refresh and check Your deliveries before trying again.'});
 }finally{
  bookingInFlight.current=false;setBookingQuoteId(null);
 }
}function openDispute(bookingId:string){setDisputeBookingId(bookingId);setDisputeReason('');setDisputeDetails('');setDisputeMessage(null)}async function raiseDispute(e:any){e.preventDefault();if(!disputeBookingId)return;setDisputeSubmitting(true);setDisputeMessage(null);try{let r=await fetch('/api/disputes',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({bookingId:disputeBookingId,reason:disputeReason,details:disputeDetails||undefined})});let d=await r.json().catch(()=>null);if(!r.ok){setDisputeMessage(d?.error||'Unable to raise dispute');return;}setDisputeMessage('Dispute raised successfully. DriveDrop will review this booking and any unreleased payout has been placed on hold.');setDisputeReason('');setDisputeDetails('');await load()}finally{setDisputeSubmitting(false)}}const completedBookings=bookings.filter(b=>!!b.customerConfirmedAt);const activeBookings=bookings.filter(b=>!b.customerConfirmedAt);const displayedBookings=view==='COMPLETED'?completedBookings:activeBookings;const showRequestForm=view==='REQUEST';const showBookings=view==='BOOKINGS'||view==='COMPLETED';const showQuotes=view==='QUOTES';const bookingRefreshInFlight=useRef(false);const quoteRefreshInFlight=useRef(false);
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
const toggleView=(next:'QUOTES'|'BOOKINGS'|'COMPLETED')=>{if(view===next){setFormMessage(null);setView('REQUEST');return}setView(next);if(next==='QUOTES')void refreshVisibleQuotes();else if(next==='BOOKINGS'||next==='COMPLETED')void refreshVisibleBookings()};return <main className="shell dashboardShell"><header className="dashboardHero"><div><span className="dashboardEyebrow">Customer account</span><h1>Your vehicle deliveries</h1><p>{me?`Welcome back, ${me.name}. Manage quotes, bookings and deliveries in one place.`:'Sign in as a customer to use this dashboard.'}</p></div><div className="dashboardSummary"><div role="button" tabIndex={0} aria-pressed={view==='QUOTES'} onClick={()=>toggleView('QUOTES')} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleView('QUOTES')}}} style={{cursor:'pointer'}}><strong>{jobsLoaded?jobs.length:'—'}</strong><span>Quote requests</span></div><div role="button" tabIndex={0} aria-pressed={view==='BOOKINGS'} onClick={()=>toggleView('BOOKINGS')} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleView('BOOKINGS')}}} style={{cursor:'pointer'}}><strong>{bookingsLoaded?activeBookings.length:'—'}</strong><span>Bookings</span></div><div role="button" tabIndex={0} aria-pressed={view==='COMPLETED'} onClick={()=>toggleView('COMPLETED')} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleView('COMPLETED')}}} style={{cursor:'pointer'}}><strong>{bookingsLoaded?completedBookings.length:'—'}</strong><span>Completed</span></div></div></header>{view!=='REQUEST'&&<div className="dashboardFilterBar"><span>Showing {view==='QUOTES'?'quote requests':view==='BOOKINGS'?'your deliveries':'completed deliveries'} only</span><button type="button" className="textAction" onClick={()=>{setFormMessage(null);setView('REQUEST')}}>Request vehicle transport</button></div>}<section className="dashboardCard requestPanel" hidden={!showRequestForm}><div className="panelHeading"><div><span className="panelIcon">＋</span><div><h2>Request vehicle transport</h2><p>Tell us what needs moving and verified transporters can send you quotes.</p></div></div></div><form onSubmit={create}><div className="grid"><AddressAutocomplete key={`collection-${newJobId||'draft'}`} name="collection" label="COLLECTION"/><AddressAutocomplete key={`delivery-${newJobId||'draft'}`} name="delivery" label="DELIVERY"/><div className="field"><label htmlFor="request-collection-date">COLLECTION DATE</label><input id="request-collection-date" type="date" name="collectionDate" required/></div><div className="field"><label htmlFor="request-vehicle-make">MAKE</label><input id="request-vehicle-make" name="vehicleMake" required/></div><div className="field"><label htmlFor="request-vehicle-model">MODEL</label><input id="request-vehicle-model" name="vehicleModel" required/></div><div className="field"><label htmlFor="request-running">RUNNING?</label><select id="request-running" name="running"><option value="true">Runs and drives</option><option value="false">Non-running</option></select></div></div>{formMessage&&<div className={formMessage.type==='success'?'formNotice successNotice':'formNotice errorNotice'} role={formMessage.type==='success'?'status':'alert'}>{formMessage.text}</div>}<button type="submit" className="btn orange" disabled={submitting} aria-busy={submitting}>{submitting?'Submitting request…':'Request quotes'}</button></form></section>{showBookings&&<>{confirmationNotice&&<div className={confirmationNotice.type==='success'?'formNotice successNotice':'formNotice errorNotice'} role={confirmationNotice.type==='success'?'status':'alert'}>{confirmationNotice.text}</div>}<div className="dashboardSectionHeading"><div><span className="dashboardEyebrow dark">{view==='COMPLETED'?'Completed deliveries':'Active bookings'}</span><h2>{view==='COMPLETED'?'Completed deliveries':'Your deliveries'}</h2></div><span aria-live="polite">{refreshingBookings?'Refreshing…':bookingsLoaded?`${displayedBookings.length} total`:'Loading…'}</span></div>{!bookingsLoaded&&<div className="dashboardCard emptyState" role="status"><div aria-hidden="true">⏳</div><h3>Loading deliveries…</h3><p>Fetching your latest booking and delivery information.</p></div>}{bookingsLoaded&&displayedBookings.length===0&&<div className="dashboardCard emptyState"><div>🚗</div><h3>{view==='COMPLETED'?'No completed deliveries yet':'No booked deliveries yet'}</h3><p>{view==='COMPLETED'?'Completed and customer-confirmed deliveries will appear here.':'Your confirmed vehicle deliveries will appear here.'}</p></div>}{displayedBookings.map(b=>{const bookingDisputes=disputes.filter(d=>d.bookingId===b.id);const activeDispute=bookingDisputes.find(d=>['OPEN','UNDER_REVIEW'].includes(d.status));const latestResolved=bookingDisputes.find(d=>d.status==='RESOLVED');const refundedPence=b.payment?.refundedPence||0;return <article className="dashboardCard bookingCard" key={b.id} data-delivery-progress={JSON.stringify(customerDeliveryProgress(b,me?.id))}>{refundedPence>0&&<div className={b.payment?.status==='REFUNDED'?'formNotice successNotice':'formNotice'}><strong>{b.payment?.status==='REFUNDED'?'Refund completed':'Partial refund issued'}</strong><div style={{marginTop:4,fontWeight:600}}>DriveDrop has refunded £{(refundedPence/100).toFixed(2)} to you for this delivery.</div></div>}<div className="bookingTop"><div><span className="statusPill">{label(b.status)}</span>{refundedPence>0&&<span className="statusPill">{b.payment?.status==='REFUNDED'?'Refunded':'Partial refund'}</span>}<h2>{b.job.vehicleMake} {b.job.vehicleModel}</h2><p className="bookingPartner">Transporter · <b>{b.transporter.name}</b></p></div>{b.payment&&<div className="paymentMini"><span>{refundedPence>0?'Refunded':'Total payment'}</span><strong>£{((refundedPence>0?refundedPence:b.payment.depositPence)/100).toFixed(2)}</strong><small>{label(b.payment.status)}</small></div>}</div><div className={`customerDeliveryDetails ${!b.customerConfirmedAt?'customerActiveDeliveryDetails':''}`}>{!b.customerConfirmedAt&&<div className="customerCollapsedDeliveryIdentity"><div><span>Transporter</span><strong>{b.transporter?.name?.trim()||'Not provided'}</strong></div><div><span>Vehicle registration</span><strong>{b.job.registration?.trim()||'Not provided'}</strong></div></div>}<div className="customerDeliveryDate"><span>Agreed collection date</span><strong>{collectionDateLabel(b.job.collectionDate)}</strong></div><Link className="btn orange customerMessageTransporter" prefetch={false} href={`/messages?bookingId=${encodeURIComponent(b.id)}`} aria-label={`Message transporter about ${b.job.vehicleMake} ${b.job.vehicleModel}`}>✉ Message transporter</Link>{b.status==='DELIVERED'&&!b.customerConfirmedAt&&<div style={{flexBasis:'100%'}}><p className="muted">Delivered — please confirm once you have received the vehicle.</p><button type="button" className="btn orange fullBtn" disabled={confirmingBookingId!==null} aria-busy={confirmingBookingId===b.id} onClick={()=>confirm(b.id)}>{confirmingBookingId===b.id?'Confirming receipt…':'Confirm vehicle received'}</button></div>}</div><div className="routeVisual"><div><i>●</i><span><small>Collection</small><b>{b.job.collection}</b></span></div><div className="routeLine"/><div><i>●</i><span><small>Delivery</small><b>{b.job.delivery}</b></span></div></div><div className="bookingColumns"><section><h3>Delivery progress</h3><div className="timeline polishedTimeline"><div className="event"><b>Booking confirmed</b></div>{b.trackingEvents.map((e:any)=><div className="event" key={e.id}><b>{label(e.status)}</b><small>{new Date(e.createdAt).toLocaleString('en-GB')}</small>{e.note&&<div className="muted">{e.note}</div>}</div>)}</div></section><section><h3>Payment & actions</h3>{b.payment&&<div className="infoPanel"><div className="infoRow"><span>Payment status</span><b>{label(b.payment.status)}</b></div><div className="infoRow"><span>Total payment</span><b>£{(b.payment.depositPence/100).toFixed(2)}</b></div>{refundedPence>0&&<><div className="infoRow"><span>Refunded to you</span><b>£{(refundedPence/100).toFixed(2)}</b></div><div className="infoRow"><span>Remaining paid amount</span><b>£{(Math.max(0,b.payment.paidPence-refundedPence)/100).toFixed(2)}</b></div></>}<div className="infoRow"><span>DriveDrop fee</span><b>£{(b.payment.platformFeePence/100).toFixed(2)}</b></div>{b.payment.status==='PENDING'&&<button className="btn orange fullBtn" onClick={()=>pay(b.id)}>Test: Pay total</button>}</div>}{b.status==='DELIVERED'&&b.customerConfirmedAt&&!b.review&&<CustomerReviewForm bookingId={b.id} onSubmitted={review=>setBookings(current=>current.map(booking=>booking.id===b.id?{...booking,review}:booking))}/>} {b.review&&<div className="infoPanel"><h3>Your review</h3><p className="statusPill successPill" role="status">Verified review · {b.review.rating}/5</p>{typeof b.review.body==='string'&&b.review.body.trim()&&<p className="muted" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{b.review.body}</p>}</div>}{activeDispute?<div className="infoPanel"><div className="infoRow"><span>Dispute status</span><b>{label(activeDispute.status)}</b></div><div className="infoRow"><span>Reason</span><b>{activeDispute.reason}</b></div><p className="muted">DriveDrop is reviewing this booking. Any unreleased transporter payout remains protected while the dispute is active.</p></div>:<>{latestResolved&&<div className="infoPanel"><div className="infoRow"><span>Latest dispute</span><b>Resolved</b></div><div className="infoRow"><span>Reason</span><b>{latestResolved.reason}</b></div>{latestResolved.resolution&&<div className="infoRow"><span>Outcome</span><b>{label(latestResolved.resolution)}</b></div>}{latestResolved.reviewedAt&&<div className="infoRow"><span>Resolved</span><b>{new Date(latestResolved.reviewedAt).toLocaleDateString('en-GB')}</b></div>}{latestResolved.resolutionNote&&<p className="muted">{latestResolved.resolutionNote}</p>}<p className="muted">This case has been closed by DriveDrop. You can raise another dispute if a separate issue needs review.</p></div>}{b.status!=='CANCELLED'&&<button className="btn light fullBtn" onClick={()=>openDispute(b.id)}>{latestResolved?'Raise another dispute':'Raise a dispute'}</button>}</>}{disputeBookingId===b.id&&!activeDispute&&<form onSubmit={raiseDispute} className="infoPanel" style={{marginTop:12}}><h3>{latestResolved?'Raise another dispute':'Raise a dispute'}</h3><p className="muted">Tell DriveDrop what went wrong. Submitting this will hold any unreleased transporter payout while the issue is reviewed.</p><div className="field"><label>REASON</label><input value={disputeReason} onChange={e=>setDisputeReason(e.target.value)} minLength={3} maxLength={120} required placeholder="e.g. Vehicle condition or delivery issue"/></div><div className="field"><label>DETAILS</label><textarea value={disputeDetails} onChange={e=>setDisputeDetails(e.target.value)} maxLength={2000} rows={4} placeholder="Describe what happened and any important details"/></div>{disputeMessage&&<div className={disputeMessage.startsWith('Dispute raised')?'formNotice successNotice':'formNotice errorNotice'}>{disputeMessage}</div>}<div className="actionButtons"><button className="btn orange" disabled={disputeSubmitting}>{disputeSubmitting?'Submitting…':'Submit dispute'}</button><button type="button" className="btn light" onClick={()=>{setDisputeBookingId(null);setDisputeMessage(null)}}>Cancel</button></div></form>}</section></div></article>})}</>}{showQuotes&&<section id="quote-requests"><div className="dashboardSectionHeading"><div><span className="dashboardEyebrow dark">Marketplace</span><h2>Your quote requests</h2></div><span aria-live="polite">{refreshingQuotes?'Refreshing…':jobsLoaded?`${jobs.length} total`:'Loading…'}</span></div>{requestNotice&&<div className="formNotice successNotice" role="status">{requestNotice}</div>}{quoteRefreshNotice&&<div className="formNotice errorNotice" role="alert">{quoteRefreshNotice}</div>}{!jobsLoaded&&<div className="dashboardCard emptyState" role="status"><div aria-hidden="true">⏳</div><h3>Loading quote requests…</h3><p>Fetching your latest requests and transporter quotes.</p></div>}{jobsLoaded&&jobs.length===0&&<div className="dashboardCard emptyState"><div aria-hidden="true">🚗</div><h3>No active quote requests</h3><p>Request vehicle transport to receive quotes. Booked deliveries are shown in Your deliveries.</p><button type="button" className="btn orange" onClick={()=>{setRequestNotice(null);setFormMessage(null);setView('REQUEST');window.requestAnimationFrame(()=>document.querySelector<HTMLElement>('.requestPanel')?.scrollIntoView({behavior:'smooth',block:'start'}))}}>Request vehicle transport</button></div>}{jobs.map(j=><article className={`dashboardCard quoteRequestCard ${j.id===newJobId?'newRequestCard':''}`} key={j.id}><div className="bookingTop"><div><span className="statusPill">{label(j.status)}</span><h2>{j.vehicleMake} {j.vehicleModel}</h2><p className="bookingPartner">Requested collection · {new Date(j.collectionDate).toLocaleDateString('en-GB')}</p></div><div className="quoteCount"><strong>{j.quotes.length}</strong><span>Quotes</span></div></div><div className="routeVisual compactRoute"><div><i>●</i><span><small>Collection</small><b>{j.collection}</b></span></div><div className="routeLine"/><div><i>●</i><span><small>Delivery</small><b>{j.delivery}</b></span></div></div><div className="customerRequestDetailsPanel" data-request-details="true"><div className="customerRequestDetailsHead"><div><span>Original transport request</span><b>Vehicle & collection details</b></div><small>Everything supplied when this request was created</small></div><div className="customerRequestDetailsGrid"><div><span>Vehicle type</span><b>{j.vehicleType||'Not provided'}</b></div><div><span>Make</span><b>{j.vehicleMake||'Not provided'}</b></div><div><span>Model</span><b>{j.vehicleModel||'Not provided'}</b></div><div><span>Registration</span><b>{j.registration||'Not provided'}</b></div><div><span>Running condition</span><b>{j.running?'Runs and drives':'Non-running'}</b></div><div><span>Collection date</span><b>{collectionDateLabel(j.collectionDate)}</b></div><div className="wide"><span>Collection</span><b>{j.collection}</b></div><div className="wide"><span>Delivery</span><b>{j.delivery}</b></div></div></div>{j.quotes.map((q:any)=><div className="quoteOffer" key={q.id} data-quote-summary={JSON.stringify({name:q.transporter.name,verified:q.transporter.transporterVerification?.status==='APPROVED',message:q.message?.trim()||'No message provided',price:`£${(q.pricePence/100).toFixed(2)}`,date:quoteCollectionDateLabel(q,j.collectionDate),status:quoteCollectionStatus(q)})}><div className="quoteTransporter"><div className="transporterAvatar">🚛</div><div><b>{q.transporter.name}</b>{q.transporter.transporterVerification?.status==='APPROVED'&&<span className="verifiedMini">✓ DriveDrop Verified</span>}<p>{q.message}</p>{q.proposedCollectionDate&&<div className="infoPanel"><div className="infoRow"><span>{q.dateNegotiationStatus==='COUNTERED'?'Your counter-date':q.dateNegotiationStatus==='ACCEPTED'?'Agreed collection date':'Proposed collection date'}</span><b>{new Date(q.proposedCollectionDate).toLocaleDateString('en-GB')}</b></div><div className="infoRow"><span>Date status</span><b>{quoteCollectionStatus(q)}</b></div>{q.status==='PENDING'&&q.dateNegotiationStatus==='PROPOSED'&&<CustomerCollectionDateActions quoteId={q.id} proposedDate={q.proposedCollectionDate} onUpdated={update=>setJobs(current=>current.map(job=>job.id===j.id?{...job,quotes:job.quotes.map((quote:any)=>quote.id===q.id?{...quote,proposedCollectionDate:update.proposedCollectionDate,dateNegotiationStatus:update.dateNegotiationStatus}:quote)}:job))}/>} {q.dateNegotiationStatus==='COUNTERED'&&<p className="muted">Awaiting the transporter’s response to your proposed date.</p>}</div>}</div></div><div className="quoteDecision"><span className="customerQuoteTotalLabel">Total price</span><strong>£{(q.pricePence/100).toFixed(2)}</strong>{q.status==='PENDING'&&!['PROPOSED','COUNTERED'].includes(q.dateNegotiationStatus)&&<button type="button" className="btn orange" disabled={bookingQuoteId!==null} aria-busy={bookingQuoteId===q.id} onClick={()=>book(q.id)}>{bookingQuoteId===q.id?'Accepting & paying…':'Accept quote & pay'}</button>}{q.status!=='PENDING'&&<span className="statusPill">{label(q.status)}</span>}</div>{bookingNotice&&bookingNotice.quoteId===q.id&&<div className={bookingNotice.type==='error'?'formNotice errorNotice':'formNotice successNotice'} role={bookingNotice.type==='error'?'alert':'status'}>{bookingNotice.text}</div>}</div>)}<CustomerRequestActions jobId={j.id} vehicle={`${j.vehicleMake} ${j.vehicleModel}`} status={j.status} hasBooking={!!j.booking} quoteCount={j.quotes.length} onRemoved={action=>{setJobs(current=>current.filter(job=>job.id!==j.id));setRequestNotice(action==='DELETE'?`${j.vehicleMake} ${j.vehicleModel} request deleted permanently.`:`${j.vehicleMake} ${j.vehicleModel} request cancelled — it is no longer available to transporters.`)}}/></article>)}</section>}</main>}
