'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {requestExpired,ukParts} from '@/lib/availability-time';
import {QuoteIcon} from './CustomerQuoteRequest';
type RequestRow={paymentProvider:string|null;paymentState:string|null;id:string;quoteId:string;jobId:string;status:string;collectionDate:string;collectionFrom:string|null;collectionUntil:string|null;respondBy:string;payBy:string|null;confirmedAt:string|null;pricePence:number;customerTotalPence:number;bookingId:string|null;customerName:string;transporterName:string;job:{vehicleMake:string;vehicleModel:string;collection:string;delivery:string;running:boolean}};
const money=(v:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(v/100);
const date=(v:string)=>new Date(v).toLocaleDateString('en-GB',{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'});
const time=(v:string)=>new Date(v).toLocaleString('en-GB',{timeZone:'Europe/London',day:'numeric',month:'long',hour:'numeric',minute:'2-digit'});
const statusText:Record<string,string>={AWAITING_AUTHORISATION:'Payment authorisation required',CAPTURING:'Confirming payment',PAYMENT_FAILED:'Payment unsuccessful — no booking',AWAITING_TRANSPORTER:'Awaiting transporter confirmation',AWAITING_PAYMENT:'Earlier request — select quote again',EXPIRED:'Confirmation or payment window expired',DECLINED:'Transporter unavailable',WITHDRAWN:'Request withdrawn',BOOKED:'Booking active'};
export function SelectQuoteDialog({quoteId,job,onClose,onSaved}:{quoteId:string;job:any;onClose:()=>void;onSaved:()=>void}){
 const[provider,setProvider]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');const inFlight=useRef(false),dialog=useRef<HTMLDialogElement>(null);
 const q=job.quotes.find((q:any)=>q.id===quoteId);const collectionDate=q?.dateNegotiationStatus==='ACCEPTED'&&q.proposedCollectionDate?q.proposedCollectionDate:job.collectionDate;
 const agreedWindow=q?.dateNegotiationStatus==='ACCEPTED'&&q.proposedCollectionFrom&&q.proposedCollectionUntil;
 const sameDate=collectionDate.slice(0,10)===job.collectionDate.slice(0,10);
 const collectionFrom=agreedWindow?q.proposedCollectionFrom:sameDate?job.collectionFrom:null;
 const collectionUntil=agreedWindow?q.proposedCollectionUntil:sameDate?job.collectionUntil:null;
 useEffect(()=>{fetch('/api/availability/authorise').then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);setProvider(d.provider)}).catch(e=>setError(e.message));const el=dialog.current;el?.showModal();return()=>el?.close()},[]);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');try{const r=await fetch('/api/bookings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({quoteId})});const d=await r.json();if(!r.ok)throw Error(d.error||'Unable to request confirmation');if(d.checkoutUrl){window.location.assign(d.checkoutUrl);return;}if(!d.id||!['AWAITING_TRANSPORTER','AWAITING_AUTHORISATION'].includes(d.status))throw Error('Refresh and check confirmation requests before trying again.');window.dispatchEvent(new Event('drivedrop-availability-updated'));onSaved();}catch(e){setError(e instanceof Error?e.message:'Connection interrupted. Check requests before retrying.')}finally{inFlight.current=false;setBusy(false)}}
 return <dialog ref={dialog} className="availabilityDialog" onCancel={e=>{if(busy)e.preventDefault();else onClose()}} aria-labelledby="availability-select-title"><form onSubmit={submit}><h2 id="availability-select-title">Authorise payment &amp; request confirmation</h2><p>{job.vehicleMake} {job.vehicleModel} · {date(collectionDate)}</p><div className="availabilityNotice"><strong>Your transport is not booked yet.</strong><p>Authorise the full amount now. Payment is collected automatically when the transporter confirms. Your booking becomes active only when payment succeeds.</p></div><div className="availabilitySavedWindow"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" strokeLinecap="round"/></svg><div><span>Collection window · UK time</span><strong>{collectionFrom&&collectionUntil?`${collectionFrom} – ${collectionUntil}`:'To be arranged'}</strong></div></div><p className="availabilityMuted">Quote total: <strong>{money(q.pricePence)}</strong>. If the transporter declines or the request expires, the authorisation is cancelled. Your bank may take time to release the hold.</p><p className="availabilityMuted">{provider==='TEST'?'Preview simulation — no card details or real money.':provider==='STRIPE'?'Stripe test mode — use test card details only.':'Checking payment availability…'}</p>{error&&<p role="alert" className="availabilityError">{error}</p>}<div className="availabilityActions"><button className="btn orange" disabled={busy||!provider}>{busy?'Processing…':provider==='TEST'?'Authorise test payment & request confirmation':'Continue to Stripe'}</button><button type="button" className="btn light" disabled={busy} onClick={onClose}>Back to quotes</button></div></form></dialog>;
}
function RequestCard({r,customer,refresh}:{r:RequestRow;customer:boolean;refresh:()=>void}){
 const[busy,setBusy]=useState(false),[error,setError]=useState(''),[confirmed,setConfirmed]=useState(false);const inFlight=useRef(false);
 const status=requestExpired(r)?'EXPIRED':r.status;
 const active=status==='BOOKED',waiting=status==='AWAITING_TRANSPORTER',authorising=status==='AWAITING_AUTHORISATION',capturing=status==='CAPTURING';
 const legacy=!r.paymentProvider&&['AWAITING_TRANSPORTER','AWAITING_PAYMENT'].includes(status);
 const canEnd=waiting||authorising||legacy;
 async function act(action:string){
  if(inFlight.current)return;
  if(action==='CONFIRM'&&!confirmed){setError('Confirm you can meet the collection window before continuing.');return;}
  if(['DECLINE','WITHDRAW'].includes(action)&&!window.confirm('End this request and cancel any payment authorisation? No £50 fine applies.'))return;
  inFlight.current=true;setBusy(true);setError('');
  try{
   const response=await fetch(action==='AUTHORISE'?'/api/availability/authorise':'/api/availability',{method:action==='AUTHORISE'?'POST':'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({requestId:r.id,action})});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to update request');
   if(data.checkoutUrl){window.location.assign(data.checkoutUrl);return;}
   refresh();window.dispatchEvent(new Event('drivedrop-availability-updated'));
   if(data.status==='BOOKED'){window.dispatchEvent(new Event('drivedrop-bookings-updated'));window.dispatchEvent(new CustomEvent('drivedrop-availability-booked',{detail:{bookingId:data.bookingId}}));}
  }catch(e){setError(e instanceof Error?e.message:'Unable to update request')}finally{inFlight.current=false;setBusy(false)}
 }
 const heading=legacy?'Payment authorisation needed':waiting?(customer?'Checking transporter availability':'Can you still collect this vehicle?'):authorising?'Authorise payment to request confirmation':capturing?'Confirming payment':active?'Payment secured — delivery active':'This request has ended';
 const explanation=legacy?'This earlier request has no payment authorisation. Withdraw it and select the quote again to use the new booking flow.':waiting?(customer?'Payment authorised. We will collect it when your transporter confirms. Your booking is not active yet.':`${r.customerName} has authorised payment. Confirm only if you can meet the collection window. Payment will be collected immediately.`):authorising?'Complete the authorisation before the deadline. The transporter is only asked to confirm once payment is authorised.':capturing?'We are checking the payment result. The delivery becomes active only when payment succeeds.':active?'Contact your '+(customer?'transporter':'customer')+' to arrange collection within the agreed window.':'No active booking was created. Any payment authorisation is being cancelled or has been released; your bank may take time to show the release.';
 return <article className="availabilityCard" aria-busy={busy}>
  <div className="availabilityHeading"><h3>{active?'Your confirmed delivery':customer?'Your selected quote':'Availability confirmation'}</h3><span className={'availabilityBadge'+(active?' good':'')}>{legacy?'Earlier request — payment not authorised':statusText[status]||status}</span></div>
  <div className="availabilityVehicle"><span className="availabilityVehicleIcon"><QuoteIcon name="car"/></span><div><strong>{r.job.vehicleMake} {r.job.vehicleModel}</strong><div className="availabilityAddress"><QuoteIcon name="pin"/><span><b>Collection</b> {r.job.collection}</span></div><div className="availabilityAddress"><QuoteIcon name="pin"/><span><b>Delivery</b> {r.job.delivery}</span></div></div><div className="availabilityPrice"><strong>{money(customer?r.customerTotalPence:r.pricePence)}</strong><small>{customer?'Total including DriveDrop fee':'Your quoted proceeds'}</small></div></div>
  <div className="availabilityGrid"><section className="availabilityBody"><h3>{heading}</h3><p>{explanation}</p>
   {(waiting||authorising)&&!legacy&&<div className="availabilityNotice"><strong>{authorising?'Authorise by':'Respond by'} {time(r.respondBy)}</strong><p>UK time · No cancellation fine before a paid booking is confirmed.</p></div>}
   {waiting&&!customer&&!legacy&&<><div className="availabilityNotice"><strong>Payment authorised — awaiting your confirmation</strong><p>Your confirmation collects the payment and secures the booking if successful.</p></div><label className="availabilityCheck"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/>I can collect within the agreed collection window.</label></>}
   {error&&<p role="alert" className="availabilityError">{error}</p>}
   <div className="availabilityActions">
    {waiting&&!customer&&!legacy&&<button className="btn orange" disabled={busy||!confirmed} onClick={()=>act('CONFIRM')}>{busy?'Confirming…':'Confirm & secure booking'}</button>}
    {canEnd&&!customer&&<button className="btn light" disabled={busy} onClick={()=>act('DECLINE')}>Decline — no fine</button>}
    {authorising&&customer&&<button className="btn orange" disabled={busy} onClick={()=>act('AUTHORISE')}>{r.paymentProvider==='TEST'?'Authorise test payment':'Continue to Stripe'}</button>}
    {canEnd&&customer&&<button className="btn light" disabled={busy} onClick={()=>act('WITHDRAW')}>Withdraw request</button>}
    {capturing&&<button className="btn light" disabled={busy} onClick={refresh}>Check payment status</button>}
    {active&&<Link className="btn orange" href={(customer?'/customer?view=bookings':'/transporter?view=deliveries')+'#booking-'+r.bookingId}>View delivery</Link>}
   </div>
   {r.paymentProvider&&<small className="availabilityMuted">{r.paymentProvider==='TEST'?'Preview simulation — no real card charge.':'Stripe test mode — no live payment.'}</small>}
   {active&&!customer&&<div className="availabilityNotice">Cancelling an active delivery will result in a £50 fine, automatically deducted from your payment for the next completed job.</div>}
  </section><aside className="availabilityDetails"><h3>Collection details</h3>{[['Date',date(r.collectionDate)],['Available from',r.collectionFrom||'To be arranged'],['Collect by',r.collectionUntil||'To be arranged'],['Running condition',r.job.running?'Starts & drives':'Non-running'],[customer?'Transporter':'Customer',customer?r.transporterName:r.customerName]].map(([key,value])=><div key={key}><span>{key}</span><strong>{value}</strong></div>)}<small>All times UK time</small></aside></div>
 </article>;
}
export default function AvailabilityPanel({role,visible=true}:{role:'CUSTOMER'|'TRANSPORTER';visible?:boolean}){
 const[rows,setRows]=useState<RequestRow[]>([]),[error,setError]=useState('');const sequence=useRef(0),previousRows=useRef<RequestRow[]>([]);
 const refresh=useCallback(async()=>{const n=++sequence.current;try{const r=await fetch('/api/availability',{cache:'no-store'});if(!r.ok)throw Error();const data=await r.json();if(n===sequence.current){if(data.some((row:RequestRow)=>row.status==='BOOKED'&&previousRows.current.some(old=>old.id===row.id&&old.status!=='BOOKED')))window.dispatchEvent(new Event('drivedrop-bookings-updated'));previousRows.current=data;setRows(data);setError('')}}catch{if(n===sequence.current)setError('Unable to refresh confirmation requests. Please try again.')}},[]);
 useEffect(()=>{void refresh();const tick=window.setInterval(refresh,30000);window.addEventListener('drivedrop-availability-updated',refresh);window.addEventListener('focus',refresh);return()=>{++sequence.current;window.clearInterval(tick);window.removeEventListener('drivedrop-availability-updated',refresh);window.removeEventListener('focus',refresh)}},[refresh]);
 if(!visible)return null;
 const pending=rows.filter(r=>['AWAITING_AUTHORISATION','AWAITING_TRANSPORTER','AWAITING_PAYMENT','CAPTURING'].includes(r.status)&&!requestExpired(r));const history=rows.filter(r=>!pending.includes(r));
 return <section className="availabilitySection" id="availability-requests" aria-label="Booking confirmations">{error&&<p role="alert">{error} <button className="btn light" onClick={refresh}>Retry</button></p>}{pending.map(r=><RequestCard key={r.id} r={r} customer={role==='CUSTOMER'} refresh={refresh}/>)}{history.length>0&&<details className="availabilityHistory"><summary>Confirmation history ({history.length})</summary>{history.map(r=><RequestCard key={r.id} r={r} customer={role==='CUSTOMER'} refresh={refresh}/>)}</details>}</section>;
}
