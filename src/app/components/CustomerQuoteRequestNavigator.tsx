'use client';
import {useEffect} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';

export default function CustomerQuoteRequestNavigator(){
 const pathname=usePathname();
 const searchParams=useSearchParams();
 useEffect(()=>{
  if(pathname!=='/customer'||searchParams.get('view')!=='quotes')return;
  let attempts=0;
  const activate=()=>{
   const quoteButton=document.querySelector('.dashboardSummary [role="button"]:first-child') as HTMLElement|null;
   const quoteSection=document.getElementById('quote-requests');
   if(quoteButton){quoteButton.click();setTimeout(()=>document.getElementById('quote-requests')?.scrollIntoView({behavior:'smooth',block:'start'}),180);return true;}
   if(quoteSection){quoteSection.scrollIntoView({behavior:'smooth',block:'start'});return true;}
   attempts+=1;
   return attempts>30;
  };
  const first=setTimeout(()=>{if(activate())return;const t=setInterval(()=>{if(activate())clearInterval(t)},150);},350);
  return()=>clearTimeout(first);
 },[pathname,searchParams]);
 return null;
}
