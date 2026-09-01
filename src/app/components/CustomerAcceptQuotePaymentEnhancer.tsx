'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

export default function CustomerAcceptQuotePaymentEnhancer(){
 const pathname=usePathname();
 useEffect(()=>{
  if(pathname!=='/customer')return;
  let stopped=false;
  const markButtons=()=>{
   if(stopped)return;
   document.querySelectorAll<HTMLButtonElement>('.quoteOffer button').forEach(button=>{
    if(button.textContent?.trim()==='Accept quote')button.textContent='Accept quote & pay';
   });
   document.querySelectorAll<HTMLElement>('.bookingCard').forEach(card=>{
    const status=card.querySelector<HTMLElement>('.statusPill')?.textContent?.trim().toLowerCase();
    if(status==='pending payment')card.style.display='none';
   });
  };
  const observer=new MutationObserver(markButtons);
  observer.observe(document.body,{childList:true,subtree:true});
  markButtons();
  return()=>{stopped=true;observer.disconnect()};
 },[pathname]);
 return null;
}
