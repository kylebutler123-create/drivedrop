'use client';
import {FormEvent,useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';

type Attachment={id:string;mimeType:string;createdAt?:string};
type Booking={id:string;status:string;customer:{id:string;name:string};transporter:{id:string;name:string};job:{vehicleMake:string;vehicleModel:string;collection:string;delivery:string};messages:{id:string;body:string;createdAt:string;sender:{name:string;role:string}}[]};
type Me={id:string;name:string;role:'CUSTOMER'|'TRANSPORTER'|'ADMIN'};
type Message={id:string;body:string;createdAt:string;readAt?:string|null;senderId?:string;sender:{name:string;role:string};attachments?:Attachment[]};
type InboxView='ALL'|'UNREAD';
const label=(s:string)=>s.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
const bookingReference=(value:any)=>{const id=String(value??'').trim();return id?`DD-${id.slice(-8).toUpperCase()}`:'Not available'};
const latestBookingMessage=(booking:Booking)=>{let latest=booking.messages?.[0];for(const message of booking.messages||[]){if(!latest||Date.parse(message.createdAt)>Date.parse(latest.createdAt))latest=message}return latest};
const latestMessageTime=(booking:Booking)=>{const time=Date.parse(latestBookingMessage(booking)?.createdAt||'');return Number.isFinite(time)?time:0};

export default function MessagesPage(){
 const[me,setMe]=useState<Me|null>(null),[bookings,setBookings]=useState<Booking[]>([]),[selectedId,setSelectedId]=useState<string|null>(null),[messages,setMessages]=useState<Message[]>([]),[unreadByBooking,setUnreadByBooking]=useState<Record<string,number>>({});
 const[loading,setLoading]=useState(true),[sending,setSending]=useState(false),[deleting,setDeleting]=useState(false),[body,setBody]=useState(''),[notice,setNotice]=useState(''),[images,setImages]=useState<File[]>([]);const fileRef=useRef<HTMLInputElement>(null);const linkedBookingId=useRef<string|null>(null);
 const activeBookingId=useRef<string|null>(null);
 const adminRecipient=useRef<{bookingId:string;recipientId:string}|null>(null);
 const messageRequest=useRef<AbortController|null>(null);
 const sendInFlight=useRef(false);
 const mounted=useRef(false);
 const [messagesLoading,setMessagesLoading]=useState(false);
 const [messageLoadError,setMessageLoadError]=useState('');
 const [inboxView,setInboxView]=useState<InboxView>('ALL');
 const [searchQuery,setSearchQuery]=useState('');

 function changeConversation(id:string|null){
  if(activeBookingId.current===id)return;
  activeBookingId.current=id;
  messageRequest.current?.abort();
  messageRequest.current=null;
  setMessages([]);
  setMessagesLoading(id!==null);
  setMessageLoadError('');
  setBody('');
  setImages([]);
  setNotice('');
  if(fileRef.current)fileRef.current.value='';
  setSelectedId(id);
 }

 async function loadBookings(preferredId?:string|null){const[m,b]=await Promise.all([fetch('/api/me',{cache:'no-store'}),fetch('/api/my-bookings?scope=messages',{cache:'no-store'})]);if(m.ok)setMe(await m.json());if(b.ok){const rows=await b.json();setBookings(rows);const current=activeBookingId.current;changeConversation(current&&rows.some((r:Booking)=>r.id===current)?current:preferredId&&rows.some((r:Booking)=>r.id===preferredId)?preferredId:null)}setLoading(false)}
 async function loadUnread(){const r=await fetch('/api/messages/unread-count',{cache:'no-store'});if(r.ok){const d=await r.json();setUnreadByBooking(d.byBooking||{})}}
 async function markRead(bookingId:string){const r=await fetch('/api/bookings/messages',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({bookingId})});if(r.ok){setUnreadByBooking(x=>({...x,[bookingId]:0}));window.dispatchEvent(new Event('drivedrop:messages-read'))}}

 async function loadMessages(bookingId:string){
  if(!mounted.current||activeBookingId.current!==bookingId||messageRequest.current)return;
  const controller=new AbortController();
  messageRequest.current=controller;
  const isCurrent=()=>!controller.signal.aborted&&messageRequest.current===controller&&activeBookingId.current===bookingId;
  try{
   const r=await fetch(`/api/bookings/messages?bookingId=${encodeURIComponent(bookingId)}`,{cache:'no-store',signal:controller.signal});
   const rows=await r.json();
   if(!isCurrent())return;
   if(!r.ok||!Array.isArray(rows))throw new Error('Unable to load messages');
   setMessages(rows);
   setMessageLoadError('');
   await markRead(bookingId).catch(()=>{});
  }catch{
   if(isCurrent())setMessageLoadError('Unable to load this conversation. We will try again shortly.');
  }finally{
   if(messageRequest.current===controller){
    messageRequest.current=null;
    setMessagesLoading(false);
   }
  }
 }


 function selectBooking(id:string){
  if(sendInFlight.current||deleting)return;
  if(adminRecipient.current?.bookingId!==id)adminRecipient.current=null;
  const isClosing=id===activeBookingId.current;
  if((body.trim()||images.length)&&!window.confirm(isClosing?'Close conversation? Your unsent message and selected pictures will be cleared.':'Switch conversations? Your unsent message and selected pictures will be cleared.'))return;
  changeConversation(isClosing?null:id);
 }

 useEffect(()=>{mounted.current=true;const params=new URLSearchParams(window.location.search);linkedBookingId.current=params.get('bookingId');const recipientId=params.get('recipientId');adminRecipient.current=linkedBookingId.current&&recipientId?{bookingId:linkedBookingId.current,recipientId}:null;loadBookings(linkedBookingId.current);loadUnread();const t=setInterval(()=>{loadBookings();loadUnread()},5000);return()=>{mounted.current=false;clearInterval(t);messageRequest.current?.abort();messageRequest.current=null}},[]);
 useEffect(()=>{
  if(loading||!selectedId||selectedId!==linkedBookingId.current)return;
  const frame=window.requestAnimationFrame(()=>{
   document.getElementById('selected-conversation')?.closest('.conversationEntry')?.scrollIntoView({behavior:'smooth',block:'start'});
   linkedBookingId.current=null;
  });
  return()=>window.cancelAnimationFrame(frame);
 },[loading,selectedId]);
 useEffect(()=>{
  if(!selectedId)return;
  void loadMessages(selectedId);
  const t=setInterval(()=>void loadMessages(selectedId),3000);
  return()=>{
   clearInterval(t);
   messageRequest.current?.abort();
   messageRequest.current=null;
  };
 },[selectedId]);
 const selected=useMemo(()=>bookings.find(b=>b.id===selectedId)||null,[bookings,selectedId]);
 const adminRecipientLabel=useMemo(()=>{if(me?.role!=='ADMIN'||!selected||adminRecipient.current?.bookingId!==selected.id)return null;const id=adminRecipient.current.recipientId;if(id===selected.customer.id)return`Customer · ${selected.customer.name}`;if(id===selected.transporter.id)return`Transporter · ${selected.transporter.name}`;return null},[me,selected]);
 const sortedBookings=useMemo(()=>[...bookings].sort((a,b)=>latestMessageTime(b)-latestMessageTime(a)),[bookings]);
 const normalizedSearch=searchQuery.trim().toLowerCase();
 const visibleBookings=useMemo(()=>sortedBookings.filter(b=>{
  if(inboxView==='UNREAD'&&!((unreadByBooking[b.id]||0)>0||b.id===selectedId))return false;
  if(!normalizedSearch)return true;
  const other=me?.role==='CUSTOMER'?b.transporter.name:b.customer.name;
  return [b.job.vehicleMake,b.job.vehicleModel,`${b.job.vehicleMake} ${b.job.vehicleModel}`,other,bookingReference(b.id)].some(value=>value.toLowerCase().includes(normalizedSearch));
 }),[inboxView,sortedBookings,unreadByBooking,selectedId,normalizedSearch,me?.role]);

 async function deleteConversation(bookingId:string){
  if(deleting||sending)return;
  const draftWarning=body.trim()||images.length?' Any unsent message or selected pictures will be discarded.':'';
  if(!window.confirm(`Delete this conversation from your inbox? It will remain available to the other person and return if a new message is sent.${draftWarning}`))return;
  setDeleting(true);
  setNotice('');
  try{
   const r=await fetch('/api/bookings/messages',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({bookingId})});
   const d=await r.json().catch(()=>null);
   if(!r.ok){setNotice(typeof d?.error==='string'?d.error:'Unable to delete conversation');return}
   changeConversation(null);
   setBookings(x=>x.filter(b=>b.id!==bookingId));
   setUnreadByBooking(x=>{const next={...x};delete next[bookingId];return next});
   window.dispatchEvent(new Event('drivedrop:messages-read'));
  }catch{
   if(mounted.current)setNotice('Unable to delete conversation. Please try again.');
  }finally{
   if(mounted.current)setDeleting(false);
  }
 }

 async function send(e:FormEvent){
  e.preventDefault();
  const bookingId=activeBookingId.current;
  if(sendInFlight.current||!bookingId||bookingId!==selectedId||(!body.trim()&&!images.length))return;
  sendInFlight.current=true;
  setSending(true);
  setNotice('');
  try{
   const f=new FormData();
   f.set('bookingId',bookingId);
   if(me.role==='ADMIN'&&adminRecipient.current?.bookingId===bookingId)f.set('recipientId',adminRecipient.current.recipientId);
   f.set('body',body);
   images.forEach(img=>f.append('images',img));
   const r=await fetch('/api/bookings/messages',{method:'POST',body:f});
   const d=await r.json().catch(()=>null);
   if(!mounted.current||activeBookingId.current!==bookingId)return;
   if(!r.ok){setNotice(typeof d?.error==='string'?d.error:'Unable to send message');return;}
   if(typeof d?.id!=='string'||typeof d?.createdAt!=='string'||!d?.sender){
    setNotice('We could not confirm the sent message. Check this conversation before trying again.');
    return;
   }
   // A poll started before sending must not replace the newly sent message.
   messageRequest.current?.abort();
   messageRequest.current=null;
   setBody('');
   setImages([]);
   if(fileRef.current)fileRef.current.value='';
   setMessages(x=>x.some(m=>m.id===d.id)?x:[...x,d]);
   setBookings(x=>x.map(b=>b.id===bookingId&&!b.messages?.some(m=>m.id===d.id)?{...b,messages:[...(b.messages||[]),d]}:b));
   setMessagesLoading(false);
   await loadMessages(bookingId);
  }catch{
   if(mounted.current&&activeBookingId.current===bookingId)setNotice('We could not confirm whether your message was sent. Check your connection and this conversation before trying again.');
  }finally{
   sendInFlight.current=false;
   if(mounted.current)setSending(false);
  }
 }
 if(loading)return <main className="shell dashboardShell"><div className="dashboardCard">Loading conversations…</div></main>;
 if(!me)return <main className="shell dashboardShell"><div className="dashboardCard"><h1>Messages</h1><p>Please sign in to view booking conversations.</p><Link className="btn orange" href="/login">Sign in</Link></div></main>;
 const dashboard=me.role==='CUSTOMER'?'/customer':me.role==='TRANSPORTER'?'/transporter':'/admin';
 const unreadTotal=Object.values(unreadByBooking).reduce((n,v)=>n+v,0);
 return <main className="shell dashboardShell messagesShell"><Link className="backLink" href={dashboard}>← Back to dashboard</Link><header className="dashboardHero messagesHero"><div><span className="dashboardEyebrow">Booking conversations</span><h1>Your messages</h1><p>Keep customer and transporter communication together with the relevant vehicle delivery.</p></div><div className="messagesHeroStats"><button type="button" onClick={()=>setInboxView('ALL')} aria-pressed={inboxView==='ALL'} className={inboxView==='ALL'?'isActive':''}><span>Conversations</span><strong>{bookings.length}</strong></button><button type="button" onClick={()=>setInboxView('UNREAD')} aria-pressed={inboxView==='UNREAD'} className={inboxView==='UNREAD'?'isActive':''}><span>Unread</span><strong>{unreadTotal}</strong></button></div></header>{bookings.length===0?<div className="dashboardCard emptyState"><div>💬</div><h3>No booking conversations yet</h3><p>Messages become available once a quote has been accepted and a booking is created.</p></div>:<div className="messagesLayout"><section className="dashboardCard conversationListPanel"><div className="conversationListHeading"><div><span className="dashboardEyebrow dark">Inbox</span><h2>Conversations</h2></div><span>{visibleBookings.length}</span></div><div className="conversationSearch"><span aria-hidden="true">⌕</span><input type="search" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search vehicle, person or reference" aria-label="Search conversations"/>{searchQuery&&<button type="button" onClick={()=>setSearchQuery('')} aria-label="Clear conversation search">Clear</button>}</div><div className="conversationList">{visibleBookings.length===0?<div className="emptyState conversationFilterEmpty"><div>{normalizedSearch?'⌕':'✓'}</div><h3>{normalizedSearch?'No conversations found':'No unread conversations'}</h3><p>{normalizedSearch?'Try a vehicle, person’s name or delivery reference.':'You are all caught up.'}</p></div>:visibleBookings.map(b=>{const other=me.role==='CUSTOMER'?b.transporter.name:b.customer.name;const latest=latestBookingMessage(b);const active=b.id===selectedId;const unread=unreadByBooking[b.id]||0;return <div key={b.id} className="conversationEntry"><button type="button" onClick={()=>selectBooking(b.id)} disabled={sending||deleting} aria-expanded={active} aria-controls={active?'selected-conversation':undefined} className={`conversationCard ${active?'isActive':''} ${unread?'hasUnread':''}`}><div className="conversationTop"><div><span className="conversationVehicle">{b.job.vehicleMake} {b.job.vehicleModel}</span><small>{other}</small><small className="conversationCardReference">{bookingReference(b.id)}</small></div><div className="conversationMeta">{unread>0&&<span className="conversationUnread">{unread}</span>}<span>{label(b.status)}</span></div></div><p>{latest?(latest.body==='Photo'?'📷 Picture message':latest.body):'No messages yet'}</p>{latest&&<small className="conversationTime">{new Date(latest.createdAt).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</small>}</button>{active&&<section id="selected-conversation" className="dashboardCard conversationPanel inlineConversationPanel">{selected?<><div className="messageStream">{messagesLoading?<p className="muted" role="status">Loading messages…</p>:messageLoadError&&messages.length===0?<p className="formNotice errorNotice" role="alert">{messageLoadError}</p>:messages.length===0?<div className="emptyState messageEmpty"><div>💬</div><h3>Start the conversation</h3><p>Send a message or picture about this delivery.</p></div>:messages.map(m=>{const mine=m.senderId===me.id||m.sender.name===me.name;return <div key={m.id} className={`messageRow ${mine?'mine':'theirs'}`}><div className="messageBubble messageBubblePolished"><div className="messageSender">{mine?'You':m.sender.name}</div>{m.body&&m.body!=='Photo'&&<span className="messageBody">{m.body}</span>}{m.attachments&&m.attachments.length>0&&<div className={`messageAttachmentGrid count${Math.min(m.attachments.length,4)}`}>{m.attachments.map(a=><a key={a.id} href={`/api/messages/attachments/${a.id}`} target="_blank" rel="noreferrer" className="messageAttachment"><img src={`/api/messages/attachments/${a.id}`} alt="Message attachment"/></a>)}</div>}<small className="messageTimestamp">{new Date(m.createdAt).toLocaleString('en-GB')}</small></div></div>})}</div>{adminRecipientLabel&&<div className="formNotice" role="status"><strong>Message recipient · {adminRecipientLabel}</strong><div style={{marginTop:4,fontSize:11,fontWeight:600}}>This message remains in the booking conversation for dispute transparency.</div></div>}<form onSubmit={send} className="messageComposer"><div className="messageComposerTop"><div className="field messageTextField"><label>MESSAGE</label><textarea rows={3} maxLength={2000} disabled={sending} value={body} onChange={e=>setBody(e.target.value)} placeholder="Write a message about this booking…"/></div><div className="messagePictureControl"><label className="messageAttachButton">📷 Add pictures<input ref={fileRef} disabled={sending} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>{const files=Array.from(e.target.files||[]).slice(0,4);setImages(files);if((e.target.files?.length||0)>4)setNotice('You can attach up to 4 pictures per message.')}}/></label><small>JPG, PNG or WebP · up to 4</small></div></div>{images.length>0&&<div className="selectedAttachments">{images.map((img,i)=><span key={`${img.name}-${i}`}>📷 {img.name.length>24?`${img.name.slice(0,21)}…`:img.name}</span>)}<button type="button" className="textAction" disabled={sending} onClick={()=>{setImages([]);if(fileRef.current)fileRef.current.value=''}}>Remove pictures</button></div>}{notice&&<div className="formNotice errorNotice">{notice}</div>}<div className="messageComposerActions"><button type="button" className="textAction dangerAction" disabled={sending||deleting} onClick={()=>deleteConversation(selected.id)}>{deleting?'Deleting…':'Delete conversation'}</button><button className="btn orange" disabled={sending||deleting||(!body.trim()&&!images.length)}>{sending?'Sending…':images.length?`Send ${images.length>1?'message & pictures':'message & picture'}`:'Send message'}</button></div></form></>:<div className="emptyState messageSelectEmpty"><div>💬</div><h3>Select a conversation</h3><p>Choose a booking to read and reply to messages.</p></div>}</section>}</div>})}</div></section></div>}</main>;
}
