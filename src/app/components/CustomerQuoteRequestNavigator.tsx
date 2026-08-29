'use client';
import {useEffect} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';

export default function CustomerQuoteRequestNavigator(){
 const pathname=usePathname();
 const searchParams=useSearchParams();
 useEffect(()=>{
  const view=searchParams.get('view');
  const route=pathname==='/customer'&&view==='quotes'
   ?{button:'.dashboardSummary [role="button"]:first-child',target:'#quote-requests'}
   :pathname==='/customer'&&view==='bookings'
    ?{button:'.dashboardSummary [role="button"]:nth-child(2)',target:'.bookingCard'}
    :pathname==='/transporter'&&view==='deliveries'
     ?{button:'.dashboardSummary [role="button"]:first-child',target:'.bookingCard'}
     :null;
  if(!route)return;
  let attempts=0;
  let activated=false;
  const t=setInterval(()=>{
   if(!activated){
    const button=document.querySelector(route.button) as HTMLElement|null;
    if(button){button.click();activated=true;}
   }
   if(activated){
    const target=document.querySelector(route.target) as HTMLElement|null;
    if(target){target.scrollIntoView({behavior:'auto',block:'start'});clearInterval(t);return;}
   }
   attempts+=1;
   if(attempts>40)clearInterval(t);
  },100);
  return()=>clearInterval(t);
 },[pathname,searchParams]);
 return null;
}
