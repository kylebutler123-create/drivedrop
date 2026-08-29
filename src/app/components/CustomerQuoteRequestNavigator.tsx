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
  let interval:ReturnType<typeof setInterval>|undefined;
  const activate=()=>{
   const button=document.querySelector(route.button) as HTMLElement|null;
   if(button)button.click();
   const target=document.querySelector(route.target) as HTMLElement|null;
   if(target){setTimeout(()=>target.scrollIntoView({behavior:'smooth',block:'start'}),180);return true;}
   attempts+=1;
   return attempts>30;
  };
  const first=setTimeout(()=>{
   if(activate())return;
   interval=setInterval(()=>{if(activate()&&interval)clearInterval(interval)},150);
  },350);
  return()=>{clearTimeout(first);if(interval)clearInterval(interval)};
 },[pathname,searchParams]);
 return null;
}
