'use client';
import Link from 'next/link';
import {ReactNode,useState} from 'react';

type View='ALL'|'USERS'|'VERIFICATION'|'DISPUTES'|'OPERATIONS';
const labels:Record<Exclude<View,'ALL'>,string>={USERS:'User manager',VERIFICATION:'Transporter verification',DISPUTES:'Dispute management',OPERATIONS:'Bookings & deliveries'};
const gridStyle={display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:12,margin:'18px 0 10px'} as const;
const baseCard={width:'100%',minHeight:106,display:'grid',gridTemplateColumns:'44px minmax(0,1fr) 24px',alignItems:'center',gap:12,padding:'15px 16px',border:'1px solid #d8e1ea',borderRadius:16,background:'#fff',color:'#10233f',textAlign:'left',boxShadow:'0 8px 24px rgba(16,35,63,.07)',cursor:'pointer',textDecoration:'none'} as const;
const activeCard={...baseCard,background:'#071a33',color:'#fff',border:'2px solid #ff7a18',boxShadow:'0 12px 30px rgba(7,26,51,.20)'} as const;
const iconStyle={width:44,height:44,borderRadius:13,display:'grid',placeItems:'center',background:'#fff3e9',color:'#b9560c',fontSize:19,fontWeight:900} as const;
const activeIcon={...iconStyle,background:'rgba(255,255,255,.12)',color:'#fff'} as const;
const copyStyle={minWidth:0,display:'grid',gap:2} as const;
const kickerStyle={fontSize:10,lineHeight:1.2,textTransform:'uppercase',letterSpacing:'.07em',color:'#b9560c'} as const;
const activeKicker={...kickerStyle,color:'#ffb16f'} as const;
const titleStyle={fontSize:15,lineHeight:1.25,color:'inherit'} as const;
const subStyle={fontSize:9,lineHeight:1.4,color:'#718196',whiteSpace:'normal'} as const;
const activeSub={...subStyle,color:'#cad6e4'} as const;
const arrowStyle={width:24,height:24,borderRadius:'50%',display:'grid',placeItems:'center',background:'#f3f6f9',color:'#4b627a',fontSize:13,fontWeight:900} as const;
const activeArrow={...arrowStyle,background:'#ff7a18',color:'#fff'} as const;

export default function AdminSectionSwitcher({userCount,transporterCount,disputeCount,userSection,verificationSection,disputeSection,operationsSection}:{userCount:number;transporterCount:number;disputeCount:number;userSection:ReactNode;verificationSection:ReactNode;disputeSection:ReactNode;operationsSection:ReactNode}){
 const[view,setView]=useState<View>('ALL');
 const toggle=(next:Exclude<View,'ALL'>)=>setView(view===next?'ALL':next);
 const showUsers=view==='ALL'||view==='USERS';
 const showVerification=view==='ALL'||view==='VERIFICATION';
 const showDisputes=view==='ALL'||view==='DISPUTES';
 const showOperations=view==='ALL'||view==='OPERATIONS';
 const filterCard=(key:Exclude<View,'ALL'>,icon:string,value:string|number,subtitle:string)=>{const active=view===key;return <button type="button" aria-pressed={active} onClick={()=>toggle(key)} style={active?activeCard:baseCard}><span style={active?activeIcon:iconStyle}>{icon}</span><span style={copyStyle}><strong style={active?activeKicker:kickerStyle}>{value}</strong><b style={titleStyle}>{labels[key]}</b><small style={active?activeSub:subStyle}>{subtitle}</small></span><span style={active?activeArrow:arrowStyle}>{active?'−':'→'}</span></button>};
 const linkCard=(href:string,icon:string,kicker:string,title:string,subtitle:string)=><Link href={href} style={baseCard}><span style={iconStyle}>{icon}</span><span style={copyStyle}><strong style={kickerStyle}>{kicker}</strong><b style={titleStyle}>{title}</b><small style={subStyle}>{subtitle}</small></span><span style={arrowStyle}>→</span></Link>;
 return <>
  <div style={gridStyle}>
   {filterCard('USERS','👥',userCount,'Manage customer & transporter accounts')}
   {filterCard('VERIFICATION','✓',transporterCount,'Review transporter compliance')}
   {filterCard('DISPUTES','🛡️',disputeCount,'Review protected booking disputes')}
   {filterCard('OPERATIONS','🚗','View','Bookings, deliveries & evidence')}
   {linkCard('/admin/payouts','£','Finance','Payouts','Ready, held & paid transporter funds')}
   {linkCard('/admin/review-disputes','★','Reviews','Review moderation','Moderate challenged customer feedback')}
  </div>
  {view!=='ALL'&&<div className="dashboardFilterBar"><span>Showing {labels[view as Exclude<View,'ALL'>].toLowerCase()} only</span><button className="textAction" onClick={()=>setView('ALL')}>Show everything</button></div>}
  {showUsers&&userSection}
  {showVerification&&verificationSection}
  {showDisputes&&disputeSection}
  {showOperations&&operationsSection}
 </>
}
