'use client';
import {selectionStatusLabel,type ConfirmationSelection} from '@/lib/quote-selection-state';
import {useState} from 'react';
import Link from 'next/link';
import {offeredCollection,sortCustomerQuotes,type QuoteSort} from '@/lib/customer-quote-display';

export default function CustomerDesktopQuotes({job,busyQuoteId,onSelect,notice,selectionRequest}:{selectionRequest?:ConfirmationSelection;job:any;busyQuoteId:string|null;onSelect:(quote:any)=>void;notice:{quoteId:string;type:'error'|'success';text:string}|null}){
 const[sort,setSort]=useState<QuoteSort>('date');
 if(!job.quotes.length)return null;
 return <section className="customerSimpleQuotes" aria-label="Transporter quotes">
  <div className="simpleQuotesToolbar"><div><h3>Choose your transporter</h3><p>Each quote shows the collection date and time offered by that transporter.</p></div><label>Sort by <select value={sort} onChange={e=>setSort(e.target.value as QuoteSort)}><option value="date">Soonest collection</option><option value="price">Price: Low to high</option><option value="rating">Highest rated</option></select></label></div>
  {selectionRequest&&<p className="simpleQuoteNotice" role="status">A confirmation request is already in progress for this vehicle. <a href="#availability-requests">View your request</a> to check its status or continue an unfinished payment.</p>}
  {sortCustomerQuotes(job.quotes,job,sort).map((q:any)=>{
   const schedule=offeredCollection(q,job),d=new Date(schedule.date);
   const date=Number.isFinite(d.getTime())?d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).replace(',',''):'Date unavailable';
   const rating=q.transporter.averageRating==null?null:Number(q.transporter.averageRating),reviews=Number(q.transporter.reviewCount)||0;
   const rated=rating!==null&&Number.isFinite(rating)&&reviews>0;
   const verified=q.transporter.verificationStatus==='APPROVED'||q.transporter.transporterVerification?.status==='APPROVED';
   const countered=q.dateNegotiationStatus==='COUNTERED';
   const expired=q.expiresAt&&new Date(q.expiresAt).getTime()<=Date.now();
   return <article className="simpleQuote" key={q.id}>
    <div className="simpleQuoteDate"><small>COLLECTION</small><strong>{date}</strong><span className="simpleQuoteTime"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>{schedule.from&&schedule.until?<span>{schedule.from} – {schedule.until} <small>UK time</small></span>:<span>Time to be arranged</span>}</span></div>
    <div className="simpleQuotePrice"><strong>{new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(q.pricePence/100)}</strong><small>Total price</small></div>
    <div className="simpleQuoteTransporter"><strong>{q.transporter.businessName||q.transporter.personName||q.transporter.name}</strong><div className="simpleQuoteRating">{rated?<><span className="simpleQuoteStars" aria-hidden="true">{'★'.repeat(Math.max(0,Math.min(5,Math.round(rating!))))}{'☆'.repeat(5-Math.max(0,Math.min(5,Math.round(rating!))))}</span><span><b>{rating!.toFixed(1)}</b> · {reviews} review{reviews===1?'':'s'}</span></>:<span>New transporter · No reviews yet</span>}</div><small className={verified?'simpleQuoteVerified':'simpleQuoteUnverified'}>{verified?'✓ DriveDrop Verified':'Verification pending'}</small></div>
    <div className="simpleQuoteActions"><Link className="simpleQuoteProfile" href={`/transporter/profile/${encodeURIComponent(q.transporter.id)}`}>View profile</Link><button type="button" className="simpleQuoteSelect" disabled={!!selectionRequest||busyQuoteId!==null||q.status!=='PENDING'||!!expired||countered} onClick={()=>onSelect(q)}>{selectionRequest?selectionStatusLabel(selectionRequest,q.id):busyQuoteId===q.id?'Checking…':'Select quote'}</button></div>
    {countered&&<p className="simpleQuoteNotice">An earlier date request is awaiting the transporter’s response.</p>}
    {expired&&<p className="simpleQuoteNotice">This quote has expired.</p>}
    {notice&&notice.quoteId===q.id&&<p className="simpleQuoteNotice" role={notice.type==='error'?'alert':'status'}>{notice.text}</p>}
   </article>;
  })}
 </section>;
}
