'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

const sleep=(ms:number)=>new Promise(resolve=>window.setTimeout(resolve,ms));

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
   button.dataset.immediatePayment='running';
   button.disabled=true;
   button.textContent='Accepting & paying…';
   void (async()=>{
    try{
     let pending:any=null;
     for(let attempt=0;attempt<12&&!stopped;attempt++){
      await sleep(attempt===0?250:300);
      const response=await fetch('/api/my-bookings',{cache:'no-store'});
      if(!response.ok)continue;
      const bookings=await response.json();
      pending=Array.isArray(bookings)?bookings.find((booking:any)=>booking.status==='PENDING_PAYMENT'&&booking.payment?.status==='PENDING'):null;
      if(pending)break;
     }
     if(!pending||stopped)return;
     const payment=await fetch('/api/payments/test-pay',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({bookingId:pending.id})});
     if(!payment.ok){const data=await payment.json().catch(()=>null);alert(data?.error||'Payment could not be completed. Please try again.');return;}
     window.dispatchEvent(new Event('drivedrop-bookings-updated'));
     window.location.assign('/customer');
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
