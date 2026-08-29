'use client';
import {useEffect} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';

export default function CustomerQuoteRequestNavigator(){
 const pathname=usePathname();
 const searchParams=useSearchParams();
 useEffect(()=>{
  if(pathname!=='/customer'||searchParams.get('view')!=='quotes')return;
  let attempts=0;
  const findAndScroll=()=>{
   const el=document.getElementById('quote-requests');
   if(el){el.scrollIntoView({behavior:'smooth',block:'start'});return true;}
   attempts+=1;
   return attempts>20;
  };
  if(findAndScroll())return;
  const t=setInterval(()=>{if(findAndScroll())clearInterval(t)},150);
  return()=>clearInterval(t);
 },[pathname,searchParams]);
 return null;
}
