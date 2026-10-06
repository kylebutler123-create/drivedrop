'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import TransporterSummaryDecoration from './TransporterSummaryDecoration';

export default function TransporterQuotesSummary(){
 const[count,setCount]=useState<number|null>(null);
 useEffect(()=>{
  let stopped=false;
  const controller=new AbortController();
  async function refresh(){try{const response=await fetch('/api/my-quotes',{cache:'no-store',signal:controller.signal});if(response.ok){const rows=await response.json();if(!stopped&&Array.isArray(rows))setCount(rows.length)}}catch{/* Keep the link available if the count cannot load. */}}
  void refresh();const timer=window.setInterval(refresh,30000);
  return()=>{stopped=true;controller.abort();window.clearInterval(timer)};
 },[]);
 return <Link href="/transporter/quotes" className="transporterQuotesSummary" data-my-quotes-summary="true" aria-label={count===null?'My quotes':`My quotes, ${count} quotes`}><strong>{count??'—'}</strong><span>My quotes</span><TransporterSummaryDecoration icon="file"/></Link>;
}
