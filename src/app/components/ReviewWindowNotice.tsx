'use client';
import {useEffect,useState} from 'react';
import {customerCanDispute,disputeDeadline,inPayoutReviewWindow,reviewDateLabel} from '@/lib/payout-policy';
import '../review-window.css';
export function useReviewClock(){
 const[now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const tick=()=>setNow(Date.now());const timer=setInterval(tick,1000);window.addEventListener('focus',tick);return()=>{clearInterval(timer);window.removeEventListener('focus',tick)}},[]);
 return now;
}
export default function ReviewWindowNotice({booking,role,now,onReport,activeDispute=false}:{booking:any;role:'customer'|'transporter'|'admin';now:number;onReport?:()=>void;activeDispute?:boolean}){
 const deadline=disputeDeadline(booking.customerConfirmedAt);
 if(deadline===null)return null;
 const customer=role==='customer';
 if(customer&&(!customerCanDispute(booking,now)||activeDispute))return null;
 if(!customer&&!inPayoutReviewWindow(booking,booking.payment?.events||[],now))return null;
 return <div className={`reviewWindowNotice ${customer?'customerReviewWindow':''}`} role="note" style={{display:'flex',gridColumn:'1 / -1'}}>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
  <div><strong>{customer?`Report an issue before ${reviewDateLabel(deadline)}`:`Eligible for payout after ${reviewDateLabel(deadline)}, subject to any dispute.`}</strong><small>{customer?`Delivery confirmed on ${reviewDateLabel(deadline-24*60*60*1000)} · UK time`:role==='admin'?'Manual release after the hold. An approved dispute resolution allows earlier release.':'Payout is manually released by DriveDrop once eligible.'}</small></div>
  {customer&&onReport&&<button type="button" onClick={onReport}>Report an issue</button>}
  {role==='admin'&&<button type="button" disabled>Release payout</button>}
 </div>;
}
