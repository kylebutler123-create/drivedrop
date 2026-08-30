'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

export default function TransporterCancelDeliveryEnhancer(){
 const pathname=usePathname();
 useEffect(()=>{
  if(pathname!=='/transporter')return;
  let cancelled=false;
  let busy=false;
  async function enhance(){
   if(busy||cancelled)return;
   busy=true;
   try{
    const response=await fetch('/api/my-bookings',{cache:'no-store'});
    if(!response.ok||cancelled)return;
    const bookings=await response.json();
    if(!Array.isArray(bookings))return;
    const cards=Array.from(document.querySelectorAll<HTMLElement>('article.transporterBooking'));
    cards.forEach((card,index)=>{
      const booking=bookings[index];
      if(!booking||!['CONFIRMED','COLLECTION_SCHEDULED'].includes(booking.status))return;
      if(card.querySelector('[data-cancel-delivery]'))return;
      const actions=card.querySelector<HTMLElement>('.actionButtons');
      if(!actions)return;
      const button=document.createElement('button');
      button.type='button';
      button.className='btn light';
      button.dataset.cancelDelivery='true';
      button.textContent='Cancel delivery';
      button.addEventListener('click',async()=>{
        const reason=window.prompt('Reason for cancelling this delivery:')?.trim();
        if(!reason)return;
        if(!window.confirm('Cancel this delivery? The customer request will be reopened for new quotes.'))return;
        button.disabled=true;
        button.textContent='Cancelling…';
        try{
          const result=await fetch('/api/bookings/status',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({bookingId:booking.id,status:'CANCELLED',note:reason})});
          const data=await result.json().catch(()=>null);
          if(!result.ok){window.alert(data?.error||'Unable to cancel delivery');button.disabled=false;button.textContent='Cancel delivery';return;}
          window.location.reload();
        }catch{
          window.alert('Unable to cancel delivery. Please try again.');
          button.disabled=false;
          button.textContent='Cancel delivery';
        }
      });
      actions.appendChild(button);
    });
   }catch{}finally{busy=false}
  }
  enhance();
  const timer=window.setInterval(enhance,1500);
  return()=>{cancelled=true;window.clearInterval(timer)};
 },[pathname]);
 return null;
}
