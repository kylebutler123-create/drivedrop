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
  <style jsx>{`
    .adminControlNavGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:18px 0 10px}
    .adminControlNavCard{appearance:none;width:100%;min-height:108px;display:grid;grid-template-columns:44px minmax(0,1fr) 24px;align-items:center;gap:12px;padding:15px 16px;border:1px solid #d8e1ea;border-radius:16px;background:#fff;color:#10233f;text-align:left;box-shadow:0 8px 24px rgba(16,35,63,.07);cursor:pointer;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease,background .18s ease,color .18s ease;text-decoration:none}
    .adminControlNavCard:hover{transform:translateY(-1px);border-color:#c6d2df;box-shadow:0 11px 28px rgba(16,35,63,.11)}
    .adminControlNavCard.isActive{background:#071a33;color:#fff;border:2px solid #ff7a18;box-shadow:0 12px 30px rgba(7,26,51,.2)}
    .adminControlNavIcon{width:44px;height:44px;border-radius:13px;display:grid;place-items:center;background:#fff3e9;color:#b9560c;font-size:19px;font-weight:900}
    .adminControlNavCard.isActive .adminControlNavIcon{background:rgba(255,255,255,.12);color:#fff}
    .adminControlNavCopy{min-width:0;display:grid;gap:2px}
    .adminControlNavCopy strong{font-size:10px;line-height:1.2;text-transform:uppercase;letter-spacing:.07em;color:#b9560c}
    .adminControlNavCard.isActive .adminControlNavCopy strong{color:#ffb16f}
    .adminControlNavCopy b{font-size:15px;line-height:1.25;color:inherit}
    .adminControlNavCopy small{font-size:9px;line-height:1.4;color:#718196;white-space:normal}
    .adminControlNavCard.isActive .adminControlNavCopy small{color:#cad6e4}
    .adminControlNavArrow{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:#f3f6f9;color:#4b627a;font-size:13px;font-weight:900}
    .adminControlNavCard.isActive .adminControlNavArrow{background:#ff7a18;color:#fff}
    @media(max-width:980px){.adminControlNavGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:620px){.adminControlNavGrid{grid-template-columns:1fr;gap:9px}.adminControlNavCard{min-height:88px;grid-template-columns:38px minmax(0,1fr) 22px;padding:12px 13px;border-radius:14px}.adminControlNavIcon{width:38px;height:38px;border-radius:11px;font-size:17px}.adminControlNavCopy b{font-size:14px}.adminControlNavCopy small{font-size:8px}}
  `}</style>
 </>
}
