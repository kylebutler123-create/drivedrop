'use client';
import {FormEvent,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';

type Booking={id:string;status:string;customer:{name:string};transporter:{name:string};job:{vehicleMake:string;vehicleModel:string;collection:string;delivery:string};messages:{id:string;body:string;createdAt:string;sender:{name:string;role:string}}[]};
type Me={id:string;name:string;role:'CUSTOMER'|'TRANSPORTER'|'ADMIN'};
type Message={id:string;body:string;createdAt:string;readAt?:string|null;senderId?:string;sender:{name:string;role:string}};
const label=(s:string)=>s.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());

export default function MessagesPage(){
 const[me,setMe]=useState<Me|null>(null);
 const[bookings,setBookings]=useState<Booking[]>([]);
 const[selectedId,setSelectedId]=useState<string|null>(null);
 const[messages,setMessages]=useState<Message[]>([]);
 const[unreadByBooking,setUnreadByBooking]=useState<Record<string,number>>({});
 const[loading,setLoading]=useState(true);
 const[sending,setSending]=useState(false);
 const[body,setBody]=useState('');
 const[notice,setNotice]=useState('');

 async function loadBookings(){
  const[m,b]=await Promise.all([fetch('/api/me',{cache:'no-store'}),fetch('/api/my-bookings',{cache:'no-store'})]);
  if(m.ok)setMe(await m.json());
  if(b.ok){const rows=await b.json();setBookings(rows);setSelectedId(x=>x&&rows.some((r:Booking)=>r.id===x)?x:null);}
  setLoading(false);
 }
 async function loadUnread(){
  const r=await fetch('/api/messages/unread-count',{cache:'no-store'});
  if(r.ok){const d=await r.json();setUnreadByBooking(d.byBooking||{});}
 }
 async function markRead(bookingId:string){
  const r=await fetch('/api/bookings/messages',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({bookingId})});
  if(r.ok){setUnreadByBooking(x=>({...x,[bookingId]:0}));window.dispatchEvent(new Event('drivedrop:messages-read'));}
 }
 async function loadMessages(bookingId:string){
  const r=await fetch(`/api/bookings/messages?bookingId=${encodeURIComponent(bookingId)}`,{cache:'no-store'});
  if(r.ok){setMessages(await r.json());await markRead(bookingId)}
 }
 function selectBooking(id:string){
  setSelectedId(id);
  setNotice('');
  setTimeout(()=>document.getElementById('selected-conversation')?.scrollIntoView({behavior:'smooth',block:'start'}),50);
 }
 useEffect(()=>{loadBookings();loadUnread();const t=setInterval(()=>{loadBookings();loadUnread()},5000);return()=>clearInterval(t)},[]);
 useEffect(()=>{if(!selectedId){setMessages([]);return}loadMessages(selectedId);const t=setInterval(()=>loadMessages(selectedId),3000);return()=>clearInterval(t)},[selectedId]);

 const selected=useMemo(()=>bookings.find(b=>b.id===selectedId)||null,[bookings,selectedId]);
 async function send(e:FormEvent){
  e.preventDefault();if(!selectedId||!body.trim())return;setSending(true);setNotice('');
  try{const r=await fetch('/api/bookings/messages',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({bookingId:selectedId,body})});const d=await r.json().catch(()=>({}));if(!r.ok){setNotice(d.error||'Unable to send message');return}setBody('');setMessages(x=>[...x,d]);await loadMessages(selectedId)}finally{setSending(false)}
 }
 if(loading)return <main className="shell dashboardShell"><div className="dashboardCard">Loading conversations…</div></main>;
 if(!me)return <main className="shell dashboardShell"><div className="dashboardCard"><h1>Messages</h1><p>Please sign in to view booking conversations.</p><Link className="btn orange" href="/login">Sign in</Link></div></main>;
 const dashboard=me.role==='CUSTOMER'?'/customer':me.role==='TRANSPORTER'?'/transporter':'/admin';
 return <main className="shell dashboardShell"><Link className="backLink" href={dashboard}>← Back to dashboard</Link><header className="dashboardHero"><div><span className="dashboardEyebrow">Booking conversations</span><h1>Your messages</h1><p>Keep customer and transporter communication together with the relevant vehicle delivery.</p></div><div className="adminHeroBadge"><span>Conversations</span><strong>{bookings.length}</strong><small>Booking{bookings.length===1?'':'s'}</small></div></header>{bookings.length===0?<div className="dashboardCard emptyState"><div>💬</div><h3>No booking conversations yet</h3><p>Messages become available once a quote has been accepted and a booking is created.</p></div>:<div style={{display:'grid',gridTemplateColumns:'1fr',gap:18,alignItems:'start'}}><section className="dashboardCard" style={{padding:12}}><h3 style={{padding:'4px 8px 10px'}}>Conversations</h3>{bookings.map(b=>{const other=me.role==='CUSTOMER'?b.transporter.name:b.customer.name;const latest=b.messages?.[b.messages.length-1];const active=b.id===selectedId;const unread=unreadByBooking[b.id]||0;return <button type="button" key={b.id} onClick={()=>selectBooking(b.id)} aria-pressed={active} style={{width:'100%',textAlign:'left',border:active?'2px solid #ff7a18':unread?'2px solid #ff7a18':'1px solid #d8e0ea',background:active?'#fff8f2':unread?'#fff2e6':'#fff',borderRadius:14,padding:14,marginBottom:8,cursor:'pointer',boxShadow:unread&&!active?'0 0 0 3px rgba(255,122,24,.10)':'none'}}><div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'center'}}><strong>{b.job.vehicleMake} {b.job.vehicleModel}</strong><div style={{display:'flex',alignItems:'center',gap:8}}>{unread>0&&<span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',minWidth:24,height:24,padding:'0 7px',borderRadius:999,background:'#ff7a18',color:'#fff',fontSize:12,fontWeight:800}}>{unread}</span>}<small>{label(b.status)}</small></div></div><div className="muted" style={{marginTop:5,fontWeight:unread?700:400}}>{other}</div><div className="muted" style={{marginTop:5,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',fontWeight:unread?700:400}}>{latest?latest.body:'No messages yet'}</div>{unread>0&&<div style={{marginTop:7,fontSize:12,fontWeight:800,color:'#b94e00'}}>New unread message{unread===1?'':'s'}</div>}</button>})}</section><section id="selected-conversation" className="dashboardCard" style={{scrollMarginTop:90}}>{selected?<><div className="bookingTop"><div><span className="statusPill">{label(selected.status)}</span><h2>{selected.job.vehicleMake} {selected.job.vehicleModel}</h2><p className="bookingPartner">{me.role==='CUSTOMER'?'Transporter':'Customer'} · <b>{me.role==='CUSTOMER'?selected.transporter.name:selected.customer.name}</b></p></div></div><div className="routeVisual compactRoute"><div><i>●</i><span><small>Collection</small><b>{selected.job.collection}</b></span></div><div className="routeLine"/><div><i>●</i><span><small>Delivery</small><b>{selected.job.delivery}</b></span></div></div><div style={{marginTop:18,maxHeight:480,overflowY:'auto',padding:'4px 2px'}}>{messages.length===0?<div className="emptyState" style={{padding:'28px 10px'}}><div>💬</div><h3>Start the conversation</h3><p>Send a message about this delivery.</p></div>:messages.map(m=>{const mine=m.senderId===me.id||m.sender.name===me.name;return <div key={m.id} style={{display:'flex',justifyContent:mine?'flex-end':'flex-start',marginBottom:10}}><div className="messageBubble" style={{maxWidth:'78%',background:mine?'#fff4e8':undefined}}><b>{mine?'You':m.sender.name}</b><span>{m.body}</span><small className="muted">{new Date(m.createdAt).toLocaleString('en-GB')}</small></div></div>})}</div><form onSubmit={send} className="infoPanel" style={{marginTop:14}}><div className="field"><label>MESSAGE</label><textarea rows={3} maxLength={2000} value={body} onChange={e=>setBody(e.target.value)} placeholder="Write a message about this booking…"/></div>{notice&&<div className="formNotice errorNotice">{notice}</div>}<div className="actionButtons"><button className="btn orange" disabled={sending||!body.trim()}>{sending?'Sending…':'Send message'}</button></div></form></>:<div className="emptyState" style={{padding:'36px 10px'}}><div>💬</div><h3>Select a conversation</h3><p>Choose a booking above to read and reply to messages.</p></div>}</section></div>}</main>;
}
