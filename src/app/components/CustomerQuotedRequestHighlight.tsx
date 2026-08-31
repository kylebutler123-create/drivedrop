'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

export default function CustomerQuotedRequestHighlight(){
 const pathname=usePathname();
 useEffect(()=>{
  if(pathname!=='/customer')return;
  let scheduled=false;
  const scan=()=>{
   scheduled=false;
   document.querySelectorAll<HTMLElement>('#quote-requests .quoteRequestCard').forEach(card=>{
    const count=Number(card.querySelector('.quoteCount strong')?.textContent?.trim()||0);
    card.classList.toggle('hasCustomerQuotes',count>0);
    const top=card.querySelector('.bookingTop>div:first-child');
    const existing=card.querySelector('.quotesReceivedBadge');
    if(count>0&&!existing&&top){
     const badge=document.createElement('span');
     badge.className='quotesReceivedBadge';
     badge.textContent=count===1?'✓ Quote received':`✓ ${count} quotes received`;
     top.insertBefore(badge,top.querySelector('h2'));
    }else if(count===0&&existing){existing.remove()}
    else if(count>0&&existing){existing.textContent=count===1?'✓ Quote received':`✓ ${count} quotes received`}
   });
  };
  const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(scan)};
  schedule();
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  return()=>observer.disconnect();
 },[pathname]);
 return null;
}
