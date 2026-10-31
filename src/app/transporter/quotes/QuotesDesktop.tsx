'use client';
import {MobileJobCard} from '@/app/components/MobileTransportDesign';
import {useState} from 'react';
import Link from 'next/link';
import Requote from '../../components/TransporterRequoteEnhancer';
import DateActions from '../../components/TransporterCollectionDateActions';
import {sortQuotes,quoteCollectionDate} from '@/lib/quote-order';
import s from './quotes.module.css';
import CompactRow from '../../components/TransporterCompactRow';
const label=(s:string)=>s.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
function Icon({name}:{name:string}){const paths:Record<string,string>={car:'M3 15v-4l3-1 3-5h7l4 5 3 1v4h-3m-4 0H8M8 10h11M8 15a2 2 0 1 1-4 0 2 2 0 0 1 4 0m13 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0',van:'M2 17V4h13l7 7v6h-3M6 17h9M15 4v7h7M7 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0m12 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0',all:'M5 2h14v20H5ZM8 7h8M8 12h8M8 17h5',pending:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M12 6v6l4 3',accepted:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0m-15-1 3 3 7-7',declined:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M8 8l8 8M16 8l-8 8',calendar:'M4 4h16v18H4ZM8 2v5m8-5v5M4 10h16',people:'M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M2 21v-4c0-5 12-5 12 0v4M17 4a3 3 0 0 1 0 6m0 3c4 0 5 2 5 4v4',pin:'M19 9c0 6-7 13-7 13S5 15 5 9a7 7 0 0 1 14 0ZM15 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0'};
return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]||paths.all}/></svg>}
function QuoteTime({value, fallback}:{value?:string|null;fallback:string}){
 if(!value)return <>{fallback}</>;
 const date=new Date(value);
 if(Number.isNaN(date.getTime()))return <>{fallback}</>;
 return <time dateTime={value}>{date.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/London'})}<small>{date.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'})} UK time</small></time>;
}
export default function QuotesDesktop({quotes,loading,error,onUpdate,onCancel,onRetry,embedded=false,unreadQuote,onQuoteOpened}:{unreadQuote?:(q:any)=>boolean;onQuoteOpened?:(q:any)=>void;embedded?:boolean;quotes:any[];loading:boolean;error:string;onUpdate:(id:string,value:any)=>void;onCancel:(id:string,value:any)=>void;onRetry:()=>void}){
 const[expanded,setExpanded]=useState<Record<string,boolean>>({});
 const[filter,setFilter]=useState('ALL');
 const rows=sortQuotes(quotes.filter(q=>filter==='ALL'||q.status===filter));
 const Container=embedded?'div':'main';
 return <Container className={s.page+(embedded?' '+s.embedded:'')}><header><h1>My quotes</h1><p>{embedded?'Jobs you have quoted on':'Review your quotes, adjust your offer and keep track of customer responses.'}</p></header>
 {!embedded&&<nav className={s.summary} aria-label="Filter quotes">{['ALL','PENDING','ACCEPTED','DECLINED'].map(key=><button key={key} onClick={()=>setFilter(key)} aria-pressed={filter===key} className={filter===key?s.active:''}><Icon name={key.toLowerCase()}/><span>{key==='ALL'?'All quotes':label(key)}<strong>{key==='ALL'?quotes.length:quotes.filter(q=>q.status===key).length}</strong></span></button>)}</nav>}
 {!embedded&&<div className={s.heading}><h2>Your quotes</h2></div>}
 {error&&<p role="alert">{error} <button onClick={onRetry}>Try again</button></p>}
 {loading?<p>Loading submitted quotes…</p>:!rows.length?<div className={s.empty}><h2>No {filter==='ALL'?'submitted':filter.toLowerCase()} quotes</h2><p>Your transporter quotes will appear here as soon as you submit them.</p></div>:<section className={s.cards}>{rows.map(q=>{
 const editable=q.status==='PENDING'&&['OPEN','QUOTED'].includes(q.job.status);
 const count=q.job._count?.quotes??0;
 const windowFrom=q.proposedCollectionDate?q.proposedCollectionFrom:q.job.collectionFrom,windowUntil=q.proposedCollectionDate?q.proposedCollectionUntil:q.job.collectionUntil;
 return <article className={s.card+' tdQuoteCard'+(expanded[q.id]?'':' tdQuoteClosed')+(unreadQuote?.(q)?' hasUnreadCardActivity':'')} key={q.id}><MobileJobCard job={q.job} ownQuote={q} quoteCard={embedded} open={!!expanded[q.id]} onToggle={()=>{if(!expanded[q.id])onQuoteOpened?.(q);setExpanded(current=>({...current,[q.id]:!current[q.id]}))}}/><button type="button" className="tdCompactToggle" aria-expanded={!!expanded[q.id]} onClick={()=>{if(!expanded[q.id])onQuoteOpened?.(q);setExpanded(current=>({...current,[q.id]:!current[q.id]}))}}><CompactRow kind="quotes" collectionWindow={{from:windowFrom,until:windowUntil}} job={q.job} date={quoteCollectionDate(q)} count={count} price={q.pricePence} open={!!expanded[q.id]}/></button><div className="tdQuoteActions">
 {editable&&<Requote showActionIcons mobileEditLabel={embedded?'Edit quote':undefined} jobId={q.job.id} quote={q} onUpdated={updated=>onUpdate(q.id,updated)} onCancelled={result=>onCancel(q.id,result)}/>}
 {q.status==='ACCEPTED'&&q.booking&&<Link className={s.delivery+' tdQuoteDelivery'} href={(q.booking.status==='DELIVERED'?'/transporter/delivered':'/transporter?view=deliveries')+'#booking-'+encodeURIComponent(q.booking.id)}>View active delivery</Link>}
 </div><div className="tdExpandedBody tdQuoteBody" hidden={!expanded[q.id]}>
 {embedded&&<div className={s.mobileDetails}>
  <h3>Quote details</h3>
  <dl className={s.quoteMeta}>
   <div><dt>Customer</dt><dd>{q.job.customer?.name||'Not provided'}</dd></div>
   <div><dt>Registration</dt><dd>{q.job.registration||'Not provided'}</dd></div>
   <div><dt>Quote sent</dt><dd><QuoteTime value={q.createdAt} fallback="Not available"/></dd></div>
   <div><dt>Valid until</dt><dd><QuoteTime value={q.expiresAt} fallback="No expiry set"/></dd></div>
   {q.proposedCollectionDate&&<div><dt>{q.dateNegotiationStatus==='COUNTERED'?'Customer proposed':'Proposed collection'}</dt><dd>{new Date(q.proposedCollectionDate).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/London'})}{(windowFrom||windowUntil)&&<small>{windowFrom&&windowUntil?`${windowFrom}–${windowUntil}`:windowFrom?`From ${windowFrom}`:`Until ${windowUntil}`} UK time</small>}</dd></div>}
  </dl>
  <section className={s.quoteMessage}><h3>Your message</h3><p>{q.message||'No message added to this quote.'}</p></section>
 </div>}
 <div className="tdQuoteSummary">
  <div className="tdQuoteMessage"><h3>Your message to the customer</h3><p>{q.message||'No message added to this quote.'}</p></div>
  <div className="tdQuoteExpiry"><Icon name="pending"/><div><small>Quote expires · UK time</small>{q.expiresAt?<time dateTime={q.expiresAt}><strong>{new Date(q.expiresAt).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'})}</strong><span>{new Date(q.expiresAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'})}</span></time>:<strong>No expiry set</strong>}</div></div>
 </div>
 <div className="tdCardEnd"><span>Customer · <b>{q.job.customer.name}</b></span><span>{q.status==='PENDING'?'Awaiting the customer’s response':label(q.status)}</span></div></div>
 {editable&&q.dateNegotiationStatus==='COUNTERED'&&q.proposedCollectionDate&&<DateActions quoteId={q.id} customerDate={q.proposedCollectionDate} onUpdated={update=>onUpdate(q.id,update)}/>}
 </article>})}</section>}</Container>
}
