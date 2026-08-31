'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

const sleep=(ms:number)=>new Promise(resolve=>window.setTimeout(resolve,ms));
const normalise=(value?:string|null)=>value?.trim().toLowerCase().replace(/\s+/g,' ')||'';
const parsePricePence=(value?:string|null)=>{const amount=Number((value||'').replace(/[^0-9.]/g,''));return Number.isFinite(amount)?Math.round(amount*100):null};

export default function CustomerAcceptQuotePaymentEnhancer(){
 const pathname=usePathname();
 useEffect(()=>{
  if(pathname!=='/customer')return;
  let stopped=false;
  const markButtons=()=>{
   document.querySelectorAll<HTMLButtonElement>('.quoteOffer button').forEach(button=>{
    if(button.textContent?.trim()==='Accept quote')button.textContent='Accept quote & pay';
   });
   document.querySelectorAll<HTMLElement>('.bookingCard').forEach(card=>{
    const status=card.querySelector<HTMLElement>('.statusPill')?.textContent?.trim().toLowerCase();
    if(status==='pending payment')card.style.display='none';
   });
  };
  const handleClick=(event:MouseEvent)=>{
   const button=(event.target as HTMLElement | null)?.closest<HTMLButtonElement>('button');
   if(!button||button.textContent?.trim()!=='Accept quote & pay'||button.dataset.immediatePayment==='running')return;
   const quoteOffer=button.closest<HTMLElement>('.quoteOffer');
   const requestCard=button.closest<HTMLElement>('.quoteRequestCard');
   const transporterName=normalise(quoteOffer?.querySelector<HTMLElement>('.quoteTransporter b')?.textContent);
   const vehicleName=normalise(requestCard?.querySelector<HTMLElement>('.bookingTop h2')?.textContent||requestCard?.querySelector<HTMLElement>('.customerCardSummaryMain strong')?.textContent);
   const pricePence=parsePricePence(quoteOffer?.querySelector<HTMLElement>('.quoteDecision strong')?.textContent||quoteOffer?.querySelector<HTMLElement>('.quoteCompareStats>span:first-child b')?.textContent);
   const clickedAt=Date.now();
   button.dataset.immediatePayment='running';
   button.disabled=true;
   button.textContent='Accepting & paying…';
   void (async()=>{
    try{
     let pending:any=null;
     for(let attempt=0;attempt<20&&!stopped;attempt++){
      await sleep(attempt===0?300:250);
      const response=await fetch('/api/my-bookings',{cache:'no-store'});
      if(!response.ok)continue;
      const bookings=await response.json();
      if(!Array.isArray(bookings))continue;
      const candidates=bookings.filter((booking:any)=>booking.status==='PENDING_PAYMENT'&&booking.payment?.status==='PENDING'&&new Date(booking.createdAt).getTime()>=clickedAt-2000);
      pending=candidates.find((booking:any)=>{
       const bookingVehicle=normalise(`${booking.job?.vehicleMake||''} ${booking.job?.vehicleModel||''}`);
       const bookingTransporter=normalise(booking.transporter?.name);
       const priceMatches=pricePence==null||booking.agreedPricePence===pricePence;
       const vehicleMatches=!vehicleName||bookingVehicle===vehicleName;
       const transporterMatches=!transporterName||bookingTransporter===transporterName;
       return priceMatches&&vehicleMatches&&transporterMatches;
      })||null;
      if(pending)break;
     }
     if(!pending||stopped){alert('Your quote was accepted, but DriveDrop could not match the new booking for payment. Please refresh and try again.');return;}
     const payment=await fetch('/api/payments/test-pay',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({bookingId:pending.id})});
     if(!payment.ok){const data=await payment.json().catch(()=>null);alert(data?.error||'Payment could not be completed. Please try again.');return;}
     for(let attempt=0;attempt<8&&!stopped;attempt++){
      const response=await fetch('/api/my-bookings',{cache:'no-store'});
      if(response.ok){const bookings=await response.json();const confirmed=Array.isArray(bookings)?bookings.find((booking:any)=>booking.id===pending.id&&booking.status==='CONFIRMED'&&booking.payment?.status==='PAID'):null;if(confirmed)break;}
      await sleep(150);
     }
     window.dispatchEvent(new Event('drivedrop-bookings-updated'));
     window.location.reload();
    }finally{
     if(!stopped){button.disabled=false;button.textContent='Accept quote & pay';delete button.dataset.immediatePayment;}
    }
   })();
  };
  const observer=new MutationObserver(markButtons);
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',handleClick,true);
  markButtons();
  return()=>{stopped=true;observer.disconnect();document.removeEventListener('click',handleClick,true)};
 },[pathname]);
 return null;
}
