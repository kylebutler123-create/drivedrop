'use client';
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';

const money=(pence:number)=>`£${(pence/100).toFixed(2)}`;

export default function TransporterDeliveredSummary(){
 const[target,setTarget]=useState<HTMLElement|null>(null);
 const[listTarget,setListTarget]=useState<HTMLElement|null>(null);
 const[bookings,setBookings]=useState<any[]>([]);
 const[show,setShow]=useState(false);
 useEffect(()=>{
  const summary=document.querySelector<HTMLElement>('.transporterHero .dashboardSummary');
  if(!summary)return;
  const mount=document.createElement('div');
  mount.dataset.deliveredSummary='true';
  mount.setAttribute('role','button');
  mount.setAttribute('tabindex','0');
  mount.style.cursor='pointer';
  const jobsBox=Array.from(summary.children).find(child=>child.textContent?.includes('Jobs available'));
  if(jobsBox?.nextSibling)summary.insertBefore(mount,jobsBox.nextSibling);else summary.appendChild(mount);
  const list=document.createElement('div');
  list.dataset.deliveredList='true';
  const hero=document.querySelector('.transporterHero');
  hero?.insertAdjacentElement('afterend',list);
  setTarget(mount);
  setListTarget(list);

  const standardBoxes=Array.from(summary.children).filter(child=>child!==mount&&child.getAttribute('role')==='button') as HTMLElement[];
  const clearStandardSelection=()=>standardBoxes.forEach(box=>box.setAttribute('aria-pressed','false'));
  const selectDelivered=()=>{clearStandardSelection();setShow(true)};
  const toggleDelivered=()=>setShow(current=>{if(!current){clearStandardSelection();return true}return false});
  const key=(e:KeyboardEvent)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleDelivered()}};
  const clearDelivered=()=>setShow(false);

  mount.addEventListener('click',toggleDelivered);
  mount.addEventListener('keydown',key);
  standardBoxes.forEach(box=>box.addEventListener('click',clearDelivered));
  return()=>{
   mount.removeEventListener('click',toggleDelivered);
   mount.removeEventListener('keydown',key);
   standardBoxes.forEach(box=>box.removeEventListener('click',clearDelivered));
   mount.remove();list.remove();
  };
 },[]);
 useEffect(()=>{
  let cancelled=false;
  async function load(){
   try{
    const [deliveredResponse,activeResponse]=await Promise.all([
      fetch('/api/transporter/delivered',{cache:'no-store'}),
      fetch('/api/my-bookings',{cache:'no-store'})
    ]);
    if(!deliveredResponse.ok||!activeResponse.ok||cancelled)return;
    const data=await deliveredResponse.json();
    const activeBookings=await activeResponse.json();
    const delivered=Array.isArray(data?.bookings)?data.bookings:[];
    setBookings(delivered);
    const activeProceedsPence=Array.isArray(activeBookings)?activeBookings.reduce((total:number,booking:any)=>total+(booking.payment?.transporterProceedsPence||0),0):0;
    const totalProceedsPence=activeProceedsPence+(Number(data?.deliveredProceedsPence)||0);
    const summary=document.querySelector('.transporterHero .dashboardSummary');
    const proceedsBox=summary?Array.from(summary.children).find(child=>child.textContent?.includes('Booked proceeds')):null;
    const proceedsStrong=proceedsBox?.querySelector('strong');
    if(proceedsStrong)proceedsStrong.textContent=money(totalProceedsPence);
   }catch{}
  }
  load();
  const timer=window.setInterval(load,10000);
  return()=>{cancelled=true;window.clearInterval(timer)};
 },[]);
 useEffect(()=>{if(target)target.setAttribute('aria-pressed',show?'true':'false')},[target,show]);
 if(!target)return null;
 return <>
  {createPortal(<><strong>{bookings.length}</strong><span>Delivered</span></>,target)}
  {listTarget&&show&&createPortal(<section className="dashboardCard" style={{margin:'18px auto',maxWidth:1180}}><div className="dashboardSectionHeading" style={{marginTop:0}}><div><span className="dashboardEyebrow dark">Delivery history</span><h2>Delivered</h2></div><span>{bookings.length} total</span></div>{bookings.length===0?<p className="muted">No delivered jobs yet.</p>:bookings.map(b=><article className="dashboardCard" key={b.id}><div className="bookingTop"><div><span className="statusPill successPill">Delivered</span><h2>{b.job.vehicleMake} {b.job.vehicleModel}</h2><p className="bookingPartner">Customer · <b>{b.customer.name}</b></p></div>{b.payment&&<div className="paymentMini"><span>Your proceeds</span><strong>{money(b.payment.transporterProceedsPence||0)}</strong><small>{String(b.payment.payoutStatus||'').replaceAll('_',' ')}</small></div>}</div><div className="routeVisual compactRoute"><div><i>●</i><span><small>Collection</small><b>{b.job.collection}</b></span></div><div className="routeLine"/><div><i>●</i><span><small>Delivery</small><b>{b.job.delivery}</b></span></div></div>{b.trackingEvents?.[0]?.createdAt&&<p className="muted">Delivered {new Date(b.trackingEvents[0].createdAt).toLocaleDateString('en-GB')}</p>}</article>)}</section>,listTarget)}
 </>;
}
