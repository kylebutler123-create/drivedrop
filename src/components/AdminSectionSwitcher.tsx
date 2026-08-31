'use client';
import Link from 'next/link';
import {ReactNode,useState} from 'react';

type View='ALL'|'USERS'|'VERIFICATION'|'DISPUTES'|'OPERATIONS';
const labels:Record<Exclude<View,'ALL'>,string>={USERS:'User manager',VERIFICATION:'Transporter verification',DISPUTES:'Dispute management',OPERATIONS:'Bookings & deliveries'};

export default function AdminSectionSwitcher({userCount,transporterCount,disputeCount,userSection,verificationSection,disputeSection,operationsSection}:{userCount:number;transporterCount:number;disputeCount:number;userSection:ReactNode;verificationSection:ReactNode;disputeSection:ReactNode;operationsSection:ReactNode}){
 const[view,setView]=useState<View>('ALL');
 const toggle=(next:Exclude<View,'ALL'>)=>setView(view===next?'ALL':next);
 const showUsers=view==='ALL'||view==='USERS';
 const showVerification=view==='ALL'||view==='VERIFICATION';
 const showDisputes=view==='ALL'||view==='DISPUTES';
 const showOperations=view==='ALL'||view==='OPERATIONS';
 const filterCard=(key:Exclude<View,'ALL'>,icon:string,value:string|number,subtitle:string)=>{const active=view===key;return <button type="button" className={`adminControlNavCard ${active?'isActive':''}`} aria-pressed={active} onClick={()=>toggle(key)}><span className="adminControlNavIcon">{icon}</span><span className="adminControlNavCopy"><strong>{value}</strong><b>{labels[key]}</b><small>{subtitle}</small></span><span className="adminControlNavArrow">{active?'−':'→'}</span></button>};
 return <>
  <div className="adminControlNavGrid">
   {filterCard('USERS','👥',userCount,'Manage customer & transporter accounts')}
   {filterCard('VERIFICATION','✓',transporterCount,'Review transporter compliance')}
   {filterCard('DISPUTES','🛡️',disputeCount,'Review protected booking disputes')}
   {filterCard('OPERATIONS','🚗','View','Bookings, deliveries & evidence')}
   <Link href="/admin/payouts" className="adminControlNavCard"><span className="adminControlNavIcon">£</span><span className="adminControlNavCopy"><strong>Finance</strong><b>Payouts</b><small>Ready, held & paid transporter funds</small></span><span className="adminControlNavArrow">→</span></Link>
   <Link href="/admin/review-disputes" className="adminControlNavCard"><span className="adminControlNavIcon">★</span><span className="adminControlNavCopy"><strong>Reviews</strong><b>Review moderation</b><small>Moderate challenged customer feedback</small></span><span className="adminControlNavArrow">→</span></Link>
  </div>
  {view!=='ALL'&&<div className="dashboardFilterBar"><span>Showing {labels[view as Exclude<View,'ALL'>].toLowerCase()} only</span><button className="textAction" onClick={()=>setView('ALL')}>Show everything</button></div>}
  {showUsers&&userSection}
  {showVerification&&verificationSection}
  {showDisputes&&disputeSection}
  {showOperations&&operationsSection}
 </>
}
