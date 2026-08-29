'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

type Booking={id:string;job:{vehicleMake:string;vehicleModel:string;collection:string;delivery:string;collectionDate:string}};

export default function AgreedCollectionDateEnhancer(){
 const pathname=usePathname();
 useEffect(()=>{
  if(pathname!=='/customer'&&pathname!=='/transporter')return;
  let cancelled=false;
  let timer:ReturnType<typeof setTimeout>|null=null;
  let observer:MutationObserver|null=null;

  async function apply(){
   const r=await fetch('/api/my-bookings',{cache:'no-store'});
   if(!r.ok||cancelled)return;
   const bookings:Booking[]=await r.json();
   document.querySelectorAll<HTMLElement>('.bookingCard').forEach(card=>{
    const heading=card.querySelector('h2')?.textContent?.trim()||'';
    const route=Array.from(card.querySelectorAll('.routeVisual b')).map(x=>x.textContent?.trim()||'');
    const match=bookings.find(b=>`${b.job.vehicleMake} ${b.job.vehicleModel}`.trim()===heading&&(!route[0]||b.job.collection===route[0])&&(!route[1]||b.job.delivery===route[1]));
    if(!match)return;
    const existing=card.querySelector<HTMLElement>('.agreedCollectionDate');
    const date=new Date(match.job.collectionDate).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
    if(existing){existing.querySelector('strong')!.textContent=date;return;}
    const row=document.createElement('div');
    row.className='agreedCollectionDate';
    row.innerHTML='<span>Agreed collection date</span><strong></strong>';
    row.querySelector('strong')!.textContent=date;
    const bookingTop=card.querySelector('.bookingTop');
    bookingTop?.insertAdjacentElement('afterend',row);
   });
  }

  const schedule=()=>{if(timer)clearTimeout(timer);timer=setTimeout(()=>void apply(),80)};
  void apply();
  observer=new MutationObserver(schedule);
  observer.observe(document.body,{childList:true,subtree:true});
  const interval=setInterval(()=>void apply(),5000);
  return()=>{cancelled=true;if(timer)clearTimeout(timer);observer?.disconnect();clearInterval(interval)};
 },[pathname]);
 return null;
}
