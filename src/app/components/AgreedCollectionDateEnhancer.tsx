'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {getSharedBookings} from './shared-bookings-client';

type Booking={id:string;job:{vehicleMake:string;vehicleModel:string;collection:string;delivery:string;collectionDate:string}};

export default function AgreedCollectionDateEnhancer(){
 const pathname=usePathname();
 useEffect(()=>{
  if(pathname!=='/customer'&&pathname!=='/transporter')return;
  let cancelled=false;
  let timer:ReturnType<typeof setTimeout>|null=null;
  let observer:MutationObserver|null=null;
  let bookings:Booking[]=[];

  function apply(){
   if(cancelled||!bookings.length)return;
   document.querySelectorAll<HTMLElement>('.bookingCard').forEach(card=>{
    const heading=card.querySelector('h2')?.textContent?.trim()||'';
    const route=Array.from(card.querySelectorAll('.routeVisual b')).map(x=>x.textContent?.trim()||'');
    const match=bookings.find(b=>`${b.job.vehicleMake} ${b.job.vehicleModel}`.trim()===heading&&(!route[0]||b.job.collection===route[0])&&(!route[1]||b.job.delivery===route[1]));
    if(!match)return;
    const date=new Date(match.job.collectionDate).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
    const existing=card.querySelector<HTMLElement>('.agreedCollectionDate');
    if(existing){const strong=existing.querySelector('strong');if(strong)strong.textContent=date;if(pathname==='/transporter')card.dispatchEvent(new CustomEvent('drivedrop:agreed-date-ready',{bubbles:false}));return;}
    const row=document.createElement('div');
    row.className='agreedCollectionDate';
    row.innerHTML='<span>Agreed collection date</span><strong></strong>';
    const strong=row.querySelector('strong');if(strong)strong.textContent=date;
    const bookingTop=card.querySelector('.bookingTop');
    bookingTop?.insertAdjacentElement('afterend',row);
    if(pathname==='/transporter')card.dispatchEvent(new CustomEvent('drivedrop:agreed-date-ready',{bubbles:false}));
   });
  }

  async function load(){
   try{bookings=await getSharedBookings();if(!cancelled)apply()}catch{}
  }
  const schedule=()=>{if(timer)clearTimeout(timer);timer=setTimeout(apply,80)};
  void load();
  observer=new MutationObserver(schedule);
  observer.observe(document.body,{childList:true,subtree:true});
  return()=>{cancelled=true;if(timer)clearTimeout(timer);observer?.disconnect()};
 },[pathname]);
 return null;
}
