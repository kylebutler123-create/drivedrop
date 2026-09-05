'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {usePathname} from 'next/navigation';

const money=(pence:number)=>`£${(pence/100).toFixed(2)}`;
const bookingReference=(value:any)=>{const id=String(value??'').trim();return id?`DD-${id.slice(-8).toUpperCase()}`:'Not available'};
const payoutLabel=(status?:string,confirmed?:string|null,payoutDetailsComplete=true)=>{
 if(status==='PAID')return'Paid';
 if(status==='HELD')return'Held by dispute';
 if(!confirmed)return'Awaiting customer confirmation';
 if(status==='READY'&&!payoutDetailsComplete)return'Blocked — payout details missing';
 if(status==='READY')return'Ready for DriveDrop release';
 return'Not ready';
};
function EvidenceGroup({items,type}:{items:any[],type:'COLLECTION'|'DELIVERY'}){const marker=type==='COLLECTION'?'__POC_SIGNATURE__':'__POD_SIGNATURE__';let photo=0;return <div className="completedEvidenceGroup"><b>{type==='COLLECTION'?'Proof of collection':'Proof of delivery'}</b>{items.length===0?<small className="muted">No evidence recorded.</small>:items.map((e:any)=>{const signature=e.note?.includes(marker);if(!signature)photo++;return <a key={e.id} className="evidenceRow" href={`/api/evidence/${e.id}`} target="_blank" rel="noreferrer"><span>{signature?'✍️':'📷'}</span><div><b>{signature?(type==='COLLECTION'?'Release signature':'Recipient signature'):`${type==='COLLECTION'?'Collection':'Delivery'} photo ${photo}`}</b><small>{signature?'Secure signed confirmation':e.note||'Secure evidence image'}</small></div><strong>View →</strong></a>})}</div>}

export default function TransporterDeliveredSummary(){
 const pathname=usePathname();
 const[target,setTarget]=useState<HTMLElement|null>(null);
 const[listTarget,setListTarget]=useState<HTMLElement|null>(null);
 const[proceedsTarget,setProceedsTarget]=useState<HTMLElement|null>(null);
 const[bookings,setBookings]=useState<any[]>([]);
 const[payoutDetailsComplete,setPayoutDetailsComplete]=useState(true);
 const[show,setShow]=useState(false);
 const[expanded,setExpanded]=useState<string|null>(null);
 const[version,setVersion]=useState(0);
 const[loaded,setLoaded]=useState(false);
 const[loadFailed,setLoadFailed]=useState(false);
 const[refreshing,setRefreshing]=useState(false);
 const[totalProceedsPence,setTotalProceedsPence]=useState(0);
 const[proceedsLoaded,setProceedsLoaded]=useState(false);
 const showRef=useRef(false);
 const loadedRef=useRef(false);
 const refreshingRef=useRef(false);
 const failedRef=useRef(false);
 useEffect(()=>{
  setTarget(null);setListTarget(null);setProceedsTarget(null);setShow(false);showRef.current=false;setExpanded(null);setLoaded(false);loadedRef.current=false;setLoadFailed(false);failedRef.current=false;setRefreshing(false);refreshingRef.current=false;setProceedsLoaded(false);if(pathname!=='/transporter')return;
  let cancelled=false;let cleanup:(()=>void)|undefined;let attempts=0;
  const initialise=()=>{if(cancelled)return;const summary=document.querySelector<HTMLElement>('.transporterHero .dashboardSummary');const hero=document.querySelector<HTMLElement>('.transporterHero');const proceeds=document.querySelector<HTMLElement>('[data-booked-proceeds-summary]');if(!summary||!hero||!proceeds){attempts+=1;if(attempts<20)window.setTimeout(initialise,50);return}const oldMount=summary.querySelector<HTMLElement>('[data-delivered-summary]');oldMount?.remove();document.querySelector<HTMLElement>('[data-delivered-list]')?.remove();const mount=document.createElement('div');mount.dataset.deliveredSummary='true';mount.setAttribute('role','button');mount.setAttribute('tabindex','0');mount.style.cursor='pointer';const jobsBox=Array.from(summary.children).find(child=>child.textContent?.includes('Jobs available'));if(jobsBox?.nextSibling)summary.insertBefore(mount,jobsBox.nextSibling);else summary.appendChild(mount);const list=document.createElement('div');list.dataset.deliveredList='true';hero.insertAdjacentElement('afterend',list);setTarget(mount);setListTarget(list);setProceedsTarget(proceeds);const standardBoxes=Array.from(summary.children).filter(child=>child!==mount&&child.getAttribute('role')==='button') as HTMLElement[];const clearStandardSelection=()=>standardBoxes.forEach(box=>box.setAttribute('aria-pressed','false'));const toggleDelivered=()=>{const next=!showRef.current;showRef.current=next;setShow(next);if(next){clearStandardSelection();if((loadedRef.current||failedRef.current)&&!refreshingRef.current)setVersion(v=>v+1)}};const key=(e:KeyboardEvent)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleDelivered()}};const clearDelivered=()=>{showRef.current=false;setShow(false)};mount.addEventListener('click',toggleDelivered);mount.addEventListener('keydown',key);standardBoxes.forEach(box=>box.addEventListener('click',clearDelivered));cleanup=()=>{mount.removeEventListener('click',toggleDelivered);mount.removeEventListener('keydown',key);standardBoxes.forEach(box=>box.removeEventListener('click',clearDelivered));mount.remove();list.remove()}};
  initialise();return()=>{cancelled=true;cleanup?.()};
 },[pathname]);
 useEffect(()=>{const refresh=()=>setVersion(v=>v+1);window.addEventListener('drivedrop-bookings-updated',refresh);return()=>window.removeEventListener('drivedrop-bookings-updated',refresh)},[]);
 useEffect(()=>{
  if(pathname!=='/transporter')return;
  let cancelled=false;
  async function request(path:string){
   try{
    const response=await fetch(path,{cache:'no-store'});
    if(!response.ok)return null;
    return await response.json();
   }catch{return null}
  }
  async function load(){
   refreshingRef.current=true;failedRef.current=false;setRefreshing(true);setLoadFailed(false);
   try{
    const[data,activeBookings]=await Promise.all([
     request('/api/transporter/delivered'),
     request('/api/my-bookings')
    ]);
    if(cancelled)return;
    if(!data||!Array.isArray(data.bookings)){failedRef.current=true;setLoadFailed(true);return}
    setBookings(data.bookings);
    setPayoutDetailsComplete(data.payoutDetailsComplete!==false);
    setLoaded(true);loadedRef.current=true;
    if(Array.isArray(activeBookings)){
     const activeProceedsPence=activeBookings.reduce((total:number,booking:any)=>total+(booking.payment?.transporterProceedsPence||0),0);
     const combinedProceedsPence=activeProceedsPence+(Number(data.deliveredProceedsPence)||0);
     setTotalProceedsPence(combinedProceedsPence);
     setProceedsLoaded(true);
    }
   }finally{if(!cancelled){refreshingRef.current=false;setRefreshing(false)}}
  }
  void load();
  return()=>{cancelled=true;refreshingRef.current=false};
 },[pathname,version]);
 useEffect(()=>{if(target)target.setAttribute('aria-pressed',show?'true':'false')},[target,show]);
 if(!target)return null;
 return <>{proceedsTarget&&createPortal(<><strong>{proceedsLoaded?money(totalProceedsPence):'—'}</strong><span>Booked proceeds</span></>,proceedsTarget)}{createPortal(<><strong>{loaded?bookings.length:'—'}</strong><span>Completed</span></>,target)}{listTarget&&show&&createPortal(<section className="dashboardCard transporterCompletedList" style={{margin:'18px auto',maxWidth:1180}}><div className="dashboardSectionHeading" style={{marginTop:0}}><div><span className="dashboardEyebrow dark">Delivery history</span><h2>Completed</h2></div><span aria-live="polite">{refreshing&&loaded?'Refreshing…':loaded?`${bookings.length} total`:loadFailed?'Unavailable':'Loading…'}</span></div>{loaded&&loadFailed&&<div className="formNotice errorNotice" role="alert">Unable to refresh completed deliveries. Existing completed deliveries remain shown.</div>}{!loaded&&loadFailed?<div className="formNotice errorNotice" role="alert"><strong>Unable to load completed deliveries</strong><div style={{marginTop:4}}>Please check your connection and refresh the page.</div></div>:!loaded?<div className="emptyState" role="status"><div aria-hidden="true">⏳</div><h3>Loading completed deliveries…</h3><p>Fetching your completed jobs, evidence and payout status.</p></div>:bookings.length===0?<p className="muted">No completed jobs yet.</p>:bookings.map(b=>{const collection=(b.evidence||[]).filter((e:any)=>e.type==='COLLECTION');const delivery=(b.evidence||[]).filter((e:any)=>e.type==='DELIVERY');const completedAt=b.trackingEvents?.[0]?.createdAt;const payoutText=payoutLabel(b.payment?.payoutStatus,b.customerConfirmedAt,payoutDetailsComplete);const open=expanded===b.id;const proofStatus=collection.length&&delivery.length?'Collection & delivery saved':delivery.length?'Delivery proof saved':'Proof incomplete';return <article className={`dashboardCard transporterCompletedCard transporterCompletedExpandable ${open?'isExpanded':''}`} key={b.id}><button type="button" className="transporterCompletedSummary" onClick={()=>setExpanded(open?null:b.id)} aria-expanded={open}><div className="transporterCompletedIdentity"><div className="statusGroup"><span className="statusPill successPill">Completed</span>{b.payment&&<span className="statusPill">{payoutText}</span>}</div><strong>{b.job.vehicleMake} {b.job.vehicleModel}</strong><small>Customer · {b.customer.name}{b.job.registration?` · ${b.job.registration}`:''}</small><small className="transporterDeliveryReference">Delivery reference · {bookingReference(b.id)}</small><small className="transporterCompletedRoute"><span>Collection</span>{b.job.collection}<b>→</b><span>Delivery</span>{b.job.delivery}</small></div><div className="transporterCompletedQuick"><span><small>Your proceeds</small><b>{b.payment?money(b.payment.transporterProceedsPence||0):'—'}</b></span><span><small>Completed</small><b>{completedAt?new Date(completedAt).toLocaleDateString('en-GB'):'Completed'}</b></span><span><small>Proof status</small><b>{proofStatus}</b></span><span><small>Evidence</small><b>{collection.length+delivery.length} items</b></span></div><span className="transporterCardChevron">{open?'−':'+'}</span></button>{open&&<div className="transporterCompletedExpanded"><div className="bookingTop"><div><span className="statusPill successPill">Completed</span><h2>{b.job.vehicleMake} {b.job.vehicleModel}</h2><p className="bookingPartner">Customer · <b>{b.customer.name}</b>{b.job.registration?` · ${b.job.registration}`:''}</p></div>{b.payment&&<div className="paymentMini"><span>Your proceeds</span><strong>{money(b.payment.transporterProceedsPence||0)}</strong><small>{payoutText}</small></div>}</div><div className="routeVisual compactRoute"><div><i>●</i><span><small>Collection</small><b>{b.job.collection}</b></span></div><div className="routeLine"/><div><i>●</i><span><small>Delivery</small><b>{b.job.delivery}</b></span></div></div><section className="activeVehicleDetails" data-active-vehicle-details="true"><div className="activeVehicleDetailsHeading"><span>Vehicle details</span><small>Transport request information</small></div><div className="activeVehicleDetailsGrid"><span><small>Vehicle type</small><b>{b.job.vehicleType||'Not specified'}</b></span><span><small>Make & model</small><b>{`${b.job.vehicleMake||''} ${b.job.vehicleModel||''}`.trim()||'Not specified'}</b></span><span><small>Registration</small><b>{b.job.registration||'Not provided'}</b></span><span><small>Running condition</small><b>{b.job.running?'Runs & drives':'Non-running'}</b></span><span><small>Collection date</small><b>{b.job.collectionDate?new Date(b.job.collectionDate).toLocaleDateString('en-GB'):'Not specified'}</b></span></div></section><div className="completedMetaGrid"><div className="infoPanel"><div className="infoRow"><span>Delivery completed</span><b>{completedAt?new Date(completedAt).toLocaleString('en-GB'):'Completed'}</b></div><div className="infoRow"><span>Customer confirmation</span><b>{b.customerConfirmedAt?new Date(b.customerConfirmedAt).toLocaleString('en-GB'):'Awaiting confirmation'}</b></div><div className="infoRow"><span>Payout details</span><b>{payoutDetailsComplete?'Complete':'Missing'}</b></div><div className="infoRow"><span>Payout status</span><b>{payoutText}</b></div></div>{!payoutDetailsComplete&&b.customerConfirmedAt&&b.payment?.payoutStatus==='READY'&&<div className="formNotice"><strong>Payout details required</strong><div style={{marginTop:4}}>Add your bank account in Account → Payout details before DriveDrop can release this payout.</div></div>}<div className="completedEvidence"><EvidenceGroup items={collection} type="COLLECTION"/><EvidenceGroup items={delivery} type="DELIVERY"/></div></div></div>}</article>})}</section>,listTarget)}</>;
}
