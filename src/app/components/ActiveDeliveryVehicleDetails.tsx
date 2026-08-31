'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

function escapeHtml(value:any){return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]||c))}
function norm(value:any){return String(value??'').replace(/\s+/g,' ').trim().toLowerCase()}
function details(job:any){return `<section class="activeVehicleDetails" data-active-vehicle-details="true"><div class="activeVehicleDetailsHeading"><span>Vehicle details</span><small>Transport request information</small></div><div class="activeVehicleDetailsGrid"><span><small>Vehicle type</small><b>${escapeHtml(job.vehicleType||'Not specified')}</b></span><span><small>Make & model</small><b>${escapeHtml(`${job.vehicleMake||''} ${job.vehicleModel||''}`.trim()||'Not specified')}</b></span><span><small>Registration</small><b>${escapeHtml(job.registration||'Not provided')}</b></span><span><small>Running condition</small><b>${job.running?'Runs & drives':'Non-running'}</b></span><span><small>Collection date</small><b>${job.collectionDate?new Date(job.collectionDate).toLocaleDateString('en-GB'):'Not specified'}</b></span></div></section>`}

export default function ActiveDeliveryVehicleDetails(){
 const pathname=usePathname();
 useEffect(()=>{
  if(pathname!=='/customer'&&pathname!=='/transporter')return;
  let cancelled=false;
  let bookings:any[]=[];
  let timer:number|undefined;

  const findBooking=(card:HTMLElement,index:number)=>{
   const title=norm(card.querySelector('.bookingTop h2')?.textContent);
   const stops=Array.from(card.querySelectorAll('.routeVisual b')).slice(0,2).map(x=>norm(x.textContent));
   const exact=bookings.find((b:any)=>{
    const job=b.job||{};
    const sameTitle=norm(`${job.vehicleMake||''} ${job.vehicleModel||''}`)===title;
    const sameRoute=stops.length<2||(norm(job.collection)===stops[0]&&norm(job.delivery)===stops[1]);
    return sameTitle&&sameRoute;
   });
   if(exact)return exact;
   const routeMatch=bookings.find((b:any)=>stops.length>=2&&norm(b.job?.collection)===stops[0]&&norm(b.job?.delivery)===stops[1]);
   if(routeMatch)return routeMatch;
   const titleMatch=bookings.find((b:any)=>norm(`${b.job?.vehicleMake||''} ${b.job?.vehicleModel||''}`)===title);
   return titleMatch||bookings[index]||null;
  };

  const render=()=>{
   if(cancelled||!bookings.length)return;
   const cards=Array.from(document.querySelectorAll<HTMLElement>('main.dashboardShell .bookingCard'));
   cards.forEach((card,index)=>{
    if(card.querySelector('[data-active-vehicle-details]'))return;
    const booking=findBooking(card,index);
    if(!booking?.job)return;
    const route=card.querySelector('.routeVisual');
    if(route)route.insertAdjacentHTML('afterend',details(booking.job));
   });
  };

  async function load(){
   const r=await fetch('/api/my-bookings',{cache:'no-store'});if(!r.ok||cancelled)return;
   bookings=await r.json();if(cancelled)return;
   render();
  }

  load();
  const observer=new MutationObserver(()=>{
   if(cancelled)return;
   window.clearTimeout(timer);
   timer=window.setTimeout(render,80);
  });
  observer.observe(document.body,{childList:true,subtree:true});
  return()=>{cancelled=true;observer.disconnect();if(timer)window.clearTimeout(timer)};
 },[pathname]);
 return null;
}
