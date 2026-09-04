'use client';
import {useEffect} from 'react';

export default function CustomerQuoteRequestNavigator(){
 useEffect(()=>{
  const onHeaderClick=(event:MouseEvent)=>{
   const target=event.target as Element|null;
   const link=target?.closest('.customerTop a') as HTMLAnchorElement|null;
   if(!link||link.target==='_blank'||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const href=link.getAttribute('href');
   if(!href||href.startsWith('#'))return;
   event.preventDefault();
   window.location.assign(link.href);
  };
  document.addEventListener('click',onHeaderClick,true);
  return()=>document.removeEventListener('click',onHeaderClick,true);
 },[]);
 return null;
}
