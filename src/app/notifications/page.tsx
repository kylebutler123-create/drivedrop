'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import NotificationDesignIcon from '../components/NotificationDesignIcon';
import '../customer-notifications-polish.css';

type Notification={id:string;type:string;title:string;body:string;href:string|null;readAt:string|null;createdAt:string};
const icon=(type:string)=>type==='QUOTE'?'£':type==='BOOKING'?'✓':type==='PAYMENT'?'£':type==='DELIVERY'?'🚗':type==='MESSAGE'?'💬':type==='DISPUTE'?'!':type==='REVIEW'?'★':type==='VERIFICATION'?'🛡️':'🔔';
const destination=(n:Notification)=>n.type==='QUOTE'?'/customer?view=quotes#quote-requests':n.type==='BOOKING'?'/transporter?view=deliveries':n.type==='PAYMENT'?(n.title==='Payout released'?(n.href?.startsWith('/transporter?view=completed')?n.href:'/transporter?view=completed'):n.href||'/transporter?view=deliveries'):n.type==='DELIVERY'?'/customer?view=bookings':n.type==='MESSAGE'?'/messages':n.type==='VERIFICATION'?null:n.href;
const tone=(type:string)=>type==='DISPUTE'?'danger':type==='PAYMENT'||type==='QUOTE'?'finance':type==='VERIFICATION'?'compliance':type==='DELIVERY'||type==='BOOKING'?'delivery':'standard';

export default function NotificationsPage(){
 const[items,setItems]=useState<Notification[]>([]),[loading,setLoading]=useState(true),[expanded,setExpanded]=useState<string|null>(null);
 const[desktopAutoRead,setDesktopAutoRead]=useState(false),[readError,setReadError]=useState<string|null>(null);
 const marking=useRef(new Set<string>());
 useEffect(()=>{
  const media=window.matchMedia('(min-width:1024px)');
  const sync=()=>setDesktopAutoRead(media.matches&&!!document.querySelector('.approvedWorkspaceNav[data-role="customer"]'));
  sync();media.addEventListener('change',sync);
  return()=>media.removeEventListener('change',sync);
 },[]);
 async function load(){const r=await fetch('/api/notifications',{cache:'no-store'});if(r.ok){const d=await r.json();setItems(d.notifications||[])}setLoading(false)}
 useEffect(()=>{load();const t=setInterval(load,5000);return()=>clearInterval(t)},[]);
 async function mark(id:string){
  if(marking.current.has(id))return;
  marking.current.add(id);setReadError(null);
  try{
   const response=await fetch('/api/notifications',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id})});
   if(!response.ok)throw new Error('Unable to mark notification');
   setItems(x=>x.map(n=>n.id===id?{...n,readAt:n.readAt||new Date().toISOString()}:n));
   window.dispatchEvent(new Event('drivedrop:notifications-read'));
  }catch{setReadError('Could not mark the notification as read. Close and reopen it to try again.');}
  finally{marking.current.delete(id);}
 }
 async function markAll(){await fetch('/api/notifications',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({all:true})});setItems(x=>x.map(n=>({...n,readAt:n.readAt||new Date().toISOString()})));window.dispatchEvent(new Event('drivedrop:notifications-read'))}
 const unread=items.filter(n=>!n.readAt).length;
 const grouped=useMemo(()=>{const now=new Date(),todayKey=now.toDateString();const today:Notification[]=[],earlier:Notification[]=[];items.forEach(n=>(new Date(n.createdAt).toDateString()===todayKey?today:earlier).push(n));return{today,earlier}},[items]);
 const renderGroup=(title:string,rows:Notification[])=><>{rows.length>0&&<section className="notificationGroup"><div className="notificationGroupHeading"><h2>{title}</h2><span>{rows.length}</span></div><div className="notificationList">{rows.map(n=>{const href=destination(n),open=expanded===n.id,isUnread=!n.readAt;return <article key={n.id} className={`dashboardCard notificationCard ${isUnread?'isUnread':''} ${open?'isExpanded':''} ${tone(n.type)}`}><button type="button" className="notificationSummary" onClick={()=>{setExpanded(open?null:n.id);if(!open&&isUnread&&desktopAutoRead)void mark(n.id)}} aria-expanded={open}><span className="notificationIcon"><span className="notificationLegacyVisual">{icon(n.type)}</span><span className="notificationDesktopVisual"><NotificationDesignIcon type={n.type}/></span></span><span className="notificationSummaryCopy"><span className="notificationMetaLine"><b>{n.title}</b>{isUnread&&<span className="notificationNewBadge">New</span>}</span><small><span className="notificationLegacyVisual">{new Date(n.createdAt).toLocaleString('en-GB')}</span><span className="notificationDesktopVisual"><time dateTime={n.createdAt}>{new Date(n.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})} · {new Date(n.createdAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</time></span></small></span><span className="notificationType">{n.type.replaceAll('_',' ').toLowerCase()}</span><span className="notificationChevron"><span className="notificationLegacyVisual">{open?'−':'+'}</span><span className="notificationDesktopVisual"><NotificationDesignIcon type="CHEVRON"/></span></span></button>{open&&<div className="notificationExpanded"><p>{n.body}</p><div className="notificationActions">{href&&<Link className="btn light" href={href} onClick={()=>{if(isUnread)void mark(n.id)}}>{n.type==='ACCOUNT'&&href.startsWith('/messages')?'Message DriveDrop Support':'View related activity'}<span className="notificationDesktopVisual"><NotificationDesignIcon type="ARROW"/></span></Link>}{isUnread&&!desktopAutoRead&&<button className="textAction" onClick={()=>mark(n.id)}><span className="notificationDesktopVisual"><NotificationDesignIcon type="CHECK"/></span>Mark as read</button>}</div></div>}</article>})}</div></section>}</>;
 return <main className="shell dashboardShell notificationsPage"><Link className="backLink" href="/">← Back</Link><header className="dashboardHero notificationsHero"><div><span className="dashboardEyebrow">Account activity</span><h1>Notifications</h1><p>Important DriveDrop updates about quotes, bookings, payments, deliveries, messages and account actions.</p></div><div className="adminHeroBadge notificationHeroBadge"><span className="notificationDesktopVisual notificationUnreadIcon"><NotificationDesignIcon type="BELL"/></span><span className="notificationLegacyVisual">Unread</span><strong>{unread}</strong><small className="notificationLegacyVisual">Notification{unread===1?'':'s'}</small><small className="notificationDesktopVisual">Unread notification{unread===1?'':'s'}</small></div></header><div className="notificationToolbar"><div><span className="dashboardEyebrow dark">Activity centre</span><h2>Recent activity</h2></div>{unread>0&&<button className="btn light" onClick={markAll}><span className="notificationDesktopVisual"><NotificationDesignIcon type="CHECK_ALL"/></span>Mark all as read</button>}</div>{readError&&<p className="formNotice errorNotice" role="alert">{readError}</p>}{loading?<div className="dashboardCard">Loading notifications…</div>:items.length===0?<div className="dashboardCard emptyState"><div><span className="notificationLegacyVisual">🔔</span><span className="notificationDesktopVisual"><NotificationDesignIcon type="BELL"/></span></div><h3>No notifications yet</h3><p>Important marketplace activity will appear here.</p></div>:<>{renderGroup('Today',grouped.today)}{renderGroup('Earlier',grouped.earlier)}</>}</main>;
}
