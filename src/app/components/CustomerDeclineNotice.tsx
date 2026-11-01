'use client';
import {useEffect,useState} from 'react';
import type {RequestRow} from './AvailabilityPanel';
import {declineDismissalKey,latestDecline,latestConfirmationIssue,isNoticeDismissed,dismissNotice} from '@/lib/decline-notice';

function releaseMessage(request:RequestRow){
 if(!request.paymentProvider)return '';
 const amount=new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',minimumFractionDigits:request.pricePence%100===0?0:2}).format(request.pricePence/100);
 if(request.paymentState==='RELEASED')return `Your ${amount} payment authorisation was cancelled. `;
 if(request.paymentState==='RELEASE_PENDING')return `Your ${amount} payment authorisation is being cancelled. `;
 return '';
}

export default function CustomerDeclineNotice({rows,jobId,customerId,quoteCount,ended=false,mobileCard=false}:{rows:RequestRow[];jobId:string;customerId?:string;quoteCount:number;ended?:boolean;mobileCard?:boolean}){
 const request=ended?latestConfirmationIssue(rows,jobId):latestDecline(rows,jobId);
 const key=customerId&&request?declineDismissalKey(customerId,request.id):null;
 const[stored,setStored]=useState<{key:string;dismissed:boolean}|null>(null);
 useEffect(()=>{
  if(!key){setStored(null);return;}
  const read=()=>setStored({key,dismissed:isNoticeDismissed(key)});
  read();
  const sync=(event:StorageEvent)=>{if(event.key===key||event.key===null)read()};
  window.addEventListener('storage',sync);window.addEventListener('drivedrop:customer-notice-dismissed',read);return()=>{window.removeEventListener('storage',sync);window.removeEventListener('drivedrop:customer-notice-dismissed',read)};
 },[key]);
 if(!request||!key||stored?.key!==key||stored.dismissed)return null;
 function dismiss(){setStored({key:key!,dismissed:true});dismissNotice(key!);}
 if(mobileCard){
  const remaining=request.job.availableQuoteCount;
  const nextStep=remaining===1?'You can choose the remaining quote.':remaining>1?'You can choose another quote.':'Your request is still open for new quotes.';
  return <div className="ddQuoteDeclineNotice" role="status">
   <div>
    <strong>{request.transporterName || 'The transporter'} couldn’t confirm collection.</strong>
    <p>{releaseMessage(request)}{nextStep}</p>
   </div>
   <button type="button" aria-label="Dismiss transporter decline message" onClick={dismiss}>×</button>
  </div>;
 }
 return <div className="availabilityDeclinedBanner customerRequestDeclineNotice" role="status">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3v1"/></svg>
  <div><strong>{ended?(request.status==='PAYMENT_FAILED'?'Payment unsuccessful — booking not confirmed':'Confirmation request expired'):`${request.transporterName} couldn’t confirm availability.`}</strong><p>{ended?`${request.job.vehicleMake} ${request.job.vehicleModel}: No booking was confirmed. Review your quotes before trying again.`:quoteCount>0?'Please choose another quote.':'Your request is still open for new quotes.'}</p>{ended&&request.paymentState==='RELEASE_PENDING'&&<small>Payment authorisation release is being processed.</small>}{ended&&request.paymentState==='RELEASED'&&<small>Payment authorisation has been cancelled. Your bank may take time to remove the hold.</small>}</div>
  <button type="button" className="declineNoticeDismiss" aria-label={ended?'Dismiss confirmation message':'Dismiss transporter decline message'} onClick={dismiss}>{ended?'×':'Dismiss'}</button>
 </div>;
}
