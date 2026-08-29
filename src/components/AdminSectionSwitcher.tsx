'use client';
import {ReactNode,useState} from 'react';

type View='ALL'|'USERS'|'VERIFICATION'|'DISPUTES';

export default function AdminSectionSwitcher({userCount,transporterCount,disputeCount,userSection,verificationSection,disputeSection,operationsSection}:{userCount:number;transporterCount:number;disputeCount:number;userSection:ReactNode;verificationSection:ReactNode;disputeSection:ReactNode;operationsSection:ReactNode}){
 const[view,setView]=useState<View>('ALL');
 const toggle=(next:Exclude<View,'ALL'>)=>setView(view===next?'ALL':next);
 const showUsers=view==='ALL'||view==='USERS';
 const showVerification=view==='ALL'||view==='VERIFICATION';
 const showDisputes=view==='ALL'||view==='DISPUTES';
 return <>
  <div className="dashboardSummary adminSectionSummary">
   <div role="button" tabIndex={0} aria-pressed={view==='USERS'} onClick={()=>toggle('USERS')} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle('USERS')}}} style={{cursor:'pointer'}}><strong>{userCount}</strong><span>User manager</span></div>
   <div role="button" tabIndex={0} aria-pressed={view==='VERIFICATION'} onClick={()=>toggle('VERIFICATION')} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle('VERIFICATION')}}} style={{cursor:'pointer'}}><strong>{transporterCount}</strong><span>Transporter verification</span></div>
   <div role="button" tabIndex={0} aria-pressed={view==='DISPUTES'} onClick={()=>toggle('DISPUTES')} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle('DISPUTES')}}} style={{cursor:'pointer'}}><strong>{disputeCount}</strong><span>Dispute management</span></div>
  </div>
  {view!=='ALL'&&<div className="dashboardFilterBar"><span>Showing {view==='USERS'?'user manager':view==='VERIFICATION'?'transporter verification':'dispute management'} only</span><button className="textAction" onClick={()=>setView('ALL')}>Show everything</button></div>}
  {showUsers&&userSection}
  {showVerification&&verificationSection}
  {showDisputes&&disputeSection}
  {view==='ALL'&&operationsSection}
 </>
}
