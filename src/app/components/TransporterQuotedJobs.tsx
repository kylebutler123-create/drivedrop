'use client';
import useDesktopCardActivity,{quoteActivityVersion} from './useDesktopCardActivity';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {RequestRow} from './AvailabilityPanel';
import {isPendingRequest} from '@/lib/availability-time';
import QuotesDesktop from '../transporter/quotes/QuotesDesktop';
import {dashboardQuotedJobs} from '@/lib/quote-order';

export default function TransporterQuotedJobs({selected,onCountChange,onUnreadChange,availabilityRows}:{availabilityRows:RequestRow[]|null;selected:boolean;onCountChange:(count:number)=>void;onUnreadChange:(unread:boolean)=>void}){
 const[quotes,setQuotes]=useState<any[]>([]),[loaded,setLoaded]=useState(false),[error,setError]=useState('');
 const activity=useDesktopCardActivity('transporter-quotes');
 const hasUnread=quotes.some(q=>activity.unread(q.id,quoteActivityVersion([q])));
 useEffect(()=>{onUnreadChange(hasUnread)},[hasUnread,onUnreadChange]);
 const sequence=useRef(0),mounted=useRef(false);
 const refresh=useCallback(async()=>{
  const request=++sequence.current;
  try{
   const response=await fetch('/api/my-quotes',{cache:'no-store'});
   if(!response.ok)throw Error('Unable to load quoted jobs.');
   const data=await response.json();if(!Array.isArray(data))throw Error('Invalid quotes response.');
   if(!mounted.current||request!==sequence.current)return;
   const next=dashboardQuotedJobs(data);setQuotes(next);onCountChange(next.length);setLoaded(true);setError('');
  }catch{if(mounted.current&&request===sequence.current)setError('Unable to refresh your quoted jobs. Please try again.')}
 },[onCountChange]);
 useEffect(()=>{mounted.current=true;void refresh();window.addEventListener('drivedrop-availability-updated',refresh);window.addEventListener('drivedrop-quotes-updated',refresh);window.addEventListener('focus',refresh);const timer=window.setInterval(refresh,30000);return()=>{mounted.current=false;window.removeEventListener('drivedrop-availability-updated',refresh);window.removeEventListener('drivedrop-quotes-updated',refresh);window.removeEventListener('focus',refresh);++sequence.current;window.clearInterval(timer)}},[refresh]);
 useEffect(()=>{if(selected)void refresh()},[selected,refresh]);
 function update(id:string,value:any){++sequence.current;setQuotes(rows=>rows.map(q=>q.id===id?{...q,...value}:q));void refresh()}
 function cancel(id:string){++sequence.current;setQuotes(rows=>rows.filter(q=>q.id!==id));onCountChange(Math.max(0,quotes.length-1));void refresh()}
 if(!selected)return null;
 const mobileRequests=activity.desktop ? null : availabilityRows;
 const pending=mobileRequests?.filter(isPendingRequest)??[];
 const reserved=new Set(pending.map(row=>row.quoteId));
 // An availability refresh may finish before the quote list reflects a booking or decline.
 for(const row of mobileRequests??[])if(row.job.selectedQuoteStatus!=='PENDING')reserved.add(row.quoteId);
 const offers=quotes.filter(q=>!reserved.has(q.id));
 if(pending.length&&!offers.length&&!error)return null;
 const loading=!loaded||(!activity.desktop&&availabilityRows===null);
 return <section id="my-quoted-jobs" aria-label="Jobs you have quoted on"><QuotesDesktop unreadQuote={q=>activity.unread(q.id,quoteActivityVersion([q]))} onQuoteOpened={q=>activity.mark(q.id,quoteActivityVersion([q]))} embedded quotes={offers} loading={loading&&!error} error={error} onUpdate={update} onCancel={cancel} onRetry={refresh}/></section>;
}
