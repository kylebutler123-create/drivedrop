'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {getSharedBookings} from './shared-bookings-client';

function esc(value:any){return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]||c))}
function norm(value:any){return String(value??'').replace(/\s+/g,' ').trim().toLowerCase()}
function label(value:any){return String(value??'').replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase())}

export default function CustomerCompletedCardSummary(){
 const pathname=usePathname();
 useEffect(()=>{
  if(pathname!=='/customer')return;
  let cancelled=false;
  let bookings:any[]=[];
  let timer:number|undefined;

  const matchBooking=(card:HTMLElement,index:number)=>{
   const title=norm(card.querySelector('.bookingTop h2')?.textContent);
   const route=Array.from(card.querySelectorAll('.routeVisual b')).slice(0,2).map(x=>norm(x.textContent));
   const exact=bookings.find((b:any)=>norm(`${b.job?.vehicleMake||''} ${b.job?.vehicleModel||''}`)===title&&route.length>=2&&norm(b.job?.collection)===route[0]&&norm(b.job?.delivery)===route[1]);
   if(exact)return exact;
   const byRoute=bookings.find((b:any)=>route.length>=2&&norm(b.job?.collection)===route[0]&&norm(b.job?.delivery)===route[1]);
   if(byRoute)return byRoute;
   return bookings.find((b:any)=>norm(`${b.job?.vehicleMake||''} ${b.job?.vehicleModel||''}`)===title)||bookings[index]||null;
  };

  const render=()=>{
   if(cancelled||!bookings.length)return;
   const cards=Array.from(document.querySelectorAll<HTMLElement>('main.dashboardShell .bookingCard.customerExpandableCard'));
   cards.forEach((card,index)=>{
    const booking=matchBooking(card,index);
    if(!booking?.customerConfirmedAt)return;
    const button=card.querySelector<HTMLButtonElement>(':scope > .customerCardToggle');
    if(!button)return;
    const completedEvent=[...(booking.trackingEvents||[])].reverse().find((e:any)=>e.status==='DELIVERED');
    const completedAt=completedEvent?.createdAt||booking.customerConfirmedAt;
    const evidenceCount=(booking.evidence||[]).length;
    const payment=booking.payment;
    const paymentText=payment?.refundedPence>0?(payment.status==='REFUNDED'?'Refunded':'Partial refund'):payment?.status?label(payment.status):'Payment complete';
    const registration=booking.job?.registration||'No registration';
    button.classList.add('customerCompletedSummary');
    button.innerHTML=`<span class="customerCompletedIdentity"><span class="customerCardSummaryStatus">Completed</span><strong>${esc(`${booking.job?.vehicleMake||''} ${booking.job?.vehicleModel||''}`.trim())}</strong><small>Transporter · ${esc(booking.transporter?.name||'Transporter')} · ${esc(registration)}</small></span><span class="customerCompletedQuick"><span><small>Completed</small><b>${completedAt?new Date(completedAt).toLocaleDateString('en-GB'):'Completed'}</b></span><span><small>Payment</small><b>${esc(paymentText)}</b></span><span><small>Confirmation</small><b>Confirmed</b></span><span><small>Evidence</small><b>${evidenceCount} item${evidenceCount===1?'':'s'}</b></span></span><span class="customerCardChevron">${card.classList.contains('isCollapsed')?'+':'−'}</span>`;
   });
  };

  async function load(){
   try{bookings=await getSharedBookings();if(!cancelled)render()}catch{}
  }

  load();
  const observer=new MutationObserver(()=>{window.clearTimeout(timer);timer=window.setTimeout(render,80)});
  observer.observe(document.body,{childList:true,subtree:true});
  return()=>{cancelled=true;observer.disconnect();if(timer)window.clearTimeout(timer)};
 },[pathname]);
 return null;
}
