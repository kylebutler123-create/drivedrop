'use client';
import {useEffect,useState} from 'react';
import type {RequestRow} from './AvailabilityPanel';
import {declineDismissalKey,latestDecline} from '@/lib/decline-notice';

export default function CustomerDeclineNotice({rows,jobId,customerId,quoteCount}:{rows:RequestRow[];jobId:string;customerId?:string;quoteCount:number}){
 const request=latestDecline(rows,jobId);
 const key=customerId&&request?declineDismissalKey(customerId,request.id):null;
 const[stored,setStored]=useState<{key:string;dismissed:boolean}|null>(null);
 useEffect(()=>{
  if(!key){setStored(null);return;}
  const read=()=>{let dismissed=false;try{dismissed=localStorage.getItem(key)==='1'}catch{}setStored({key,dismissed})};
  read();
  const sync=(event:StorageEvent)=>{if(event.key===key||event.key===null)read()};
  window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);
 },[key]);
 if(!request||!key||stored?.key!==key||stored.dismissed)return null;
 function dismiss(){setStored({key:key!,dismissed:true});try{localStorage.setItem(key!,'1')}catch{/* Keep dismissed for this visit if browser storage is unavailable. */}}
 return <div className="availabilityDeclinedBanner customerRequestDeclineNotice" role="status">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3v1"/></svg>
  <div><strong>{request.transporterName} couldn’t confirm availability.</strong><p>{quoteCount>0?'Please choose another quote.':'Your request is still open for new quotes.'}</p></div>
  <button type="button" className="declineNoticeDismiss" aria-label="Dismiss transporter decline message" onClick={dismiss}>×</button>
 </div>;
}
