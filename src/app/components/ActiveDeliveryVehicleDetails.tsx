'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

function escapeHtml(value:any){return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]||c))}
function details(job:any){return `<section class="activeVehicleDetails" data-active-vehicle-details="true"><div class="activeVehicleDetailsHeading"><span>Vehicle details</span><small>Transport request information</small></div><div class="activeVehicleDetailsGrid"><span><small>Vehicle type</small><b>${escapeHtml(job.vehicleType||'Not specified')}</b></span><span><small>Make & model</small><b>${escapeHtml(`${job.vehicleMake||''} ${job.vehicleModel||''}`.trim()||'Not specified')}</b></span><span><small>Registration</small><b>${escapeHtml(job.registration||'Not provided')}</b></span><span><small>Running condition</small><b>${job.running?'Runs & drives':'Non-running'}</b></span><span><small>Collection date</small><b>${job.collectionDate?new Date(job.collectionDate).toLocaleDateString('en-GB'):'Not specified'}</b></span></div></section>`}

export default function ActiveDeliveryVehicleDetails(){
 const pathname=usePathname();
 useEffect(()=>{
  if(pathname!=='/customer'&&pathname!=='/transporter')return;
  let cancelled=false;
  async function enhance(){
   const r=await fetch('/api/my-bookings',{cache:'no-store'});if(!r.ok||cancelled)return;
   const bookings=await r.json();if(cancelled)return;
   const cards=Array.from(document.querySelectorAll<HTMLElement>('main.dashboardShell .bookingCard'));
   cards.forEach(card=>{
    card.querySelector('[data-active-vehicle-details]')?.remove();
    const title=(card.querySelector('.bookingTop h2')?.textContent||'').trim();
    const routes=Array.from(card.querySelectorAll('.routeVisual b')).map(x=>(x.textContent||'').trim());
    const booking=bookings.find((b:any)=>`${b.job?.vehicleMake||''} ${b.job?.vehicleModel||''}`.trim()===title&&(!routes.length||(b.job?.collection===routes[0]&&b.job?.delivery===routes[1])));
    if(!booking?.job)return;
    const route=card.querySelector('.routeVisual');
    if(route)route.insertAdjacentHTML('afterend',details(booking.job));
   });
  }
  enhance();
  const observer=new MutationObserver(()=>{window.clearTimeout((window as any).__ddVehicleDetailsTimer);(window as any).__ddVehicleDetailsTimer=window.setTimeout(enhance,80)});observer.observe(document.body,{childList:true,subtree:true});
  return()=>{cancelled=true;observer.disconnect()};
 },[pathname]);
 return null;
}
