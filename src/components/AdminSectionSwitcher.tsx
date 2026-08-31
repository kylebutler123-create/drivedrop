'use client';
import Link from 'next/link';
import {ReactNode,useState} from 'react';

type View='ALL'|'USERS'|'VERIFICATION'|'DISPUTES';

const cardStyle=(active:boolean)=>({cursor:'pointer',background:active?'#071a33':'#ffffff',border:active?'2px solid #ff7a18':'1px solid #cfd9e5',boxShadow:active?'0 10px 28px rgba(7,26,51,.20)':'0 8px 24px rgba(16,35,63,.10)',color:active?'#ffffff':'#10233f',transition:'all .18s ease'} as const);
const labelStyle=(active:boolean)=>({color:active?'#ffffff':'#52667e',fontWeight:800} as const);

export default function AdminSectionSwitcher({userCount,transporterCount,disputeCount,userSection,verificationSection,disputeSection,operationsSection}:{userCount:number;transporterCount:number;disputeCount:number;userSection:ReactNode;verificationSection:ReactNode;disputeSection:ReactNode;operationsSection:ReactNode}){
 const[view,setView]=useState<View>('ALL');
 const toggle=(next:Exclude<View,'ALL'>)=>setView(view===next?'ALL':next);
 const showUsers=view==='ALL'||view==='USERS';
 const showVerification=view==='ALL'||view==='VERIFICATION';
 const showDisputes=view==='ALL'||view==='DISPUTES';
 return <>
  <div className="dashboardSummary adminSectionSummary">
   <div role="button" tabIndex={0} aria-pressed={view==='USERS'} onClick={()=>toggle('USERS')} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle('USERS')}}} style={cardStyle(view==='USERS')}><strong>{userCount}</strong><span style={labelStyle(view==='USERS')}>User manager</span></div>
   <div role="button" tabIndex={0} aria-pressed={view==='VERIFICATION'} onClick={()=>toggle('VERIFICATION')} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle('VERIFICATION')}}} style={cardStyle(view==='VERIFICATION')}><strong>{transporterCount}</strong><span style={labelStyle(view==='VERIFICATION')}>Transporter verification</span></div>
   <div role="button" tabIndex={0} aria-pressed={view==='DISPUTES'} onClick={()=>toggle('DISPUTES')} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle('DISPUTES')}}} style={cardStyle(view==='DISPUTES')}><strong>{disputeCount}</strong><span style={labelStyle(view==='DISPUTES')}>Dispute management</span></div>
   <Link href="/admin/payouts" className="adminReviewNavCard" style={{...cardStyle(false),textDecoration:'none',display:'flex',flexDirection:'column',justifyContent:'center'}}><strong>£</strong><span style={labelStyle(false)}>Payouts</span></Link>
   <Link href="/admin/review-disputes" className="adminReviewNavCard" style={{...cardStyle(false),textDecoration:'none',display:'flex',flexDirection:'column',justifyContent:'center'}}><strong>★</strong><span style={labelStyle(false)}>Review moderation</span></Link>
  </div>
  {view!=='ALL'&&<div className="dashboardFilterBar"><span>Showing {view==='USERS'?'user manager':view==='VERIFICATION'?'transporter verification':'dispute management'} only</span><button className="textAction" onClick={()=>setView('ALL')}>Show everything</button></div>}
  {showUsers&&userSection}
  {showVerification&&verificationSection}
  {showDisputes&&disputeSection}
  {view==='ALL'&&operationsSection}
 </>
}
