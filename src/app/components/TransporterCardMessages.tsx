'use client';
import {FormEvent,useEffect,useRef,useState} from 'react';
import MessageIcon from './MessageDesignIcon';
import '../transporter-card-messages.css';

type Message={id:string;body:string;createdAt:string;senderId?:string;sender:{name:string;role:string};attachments?:{id:string}[]};
export function imageSelectionError(files:File[]){
 if(files.length>4)return 'You can attach up to 4 images per message.';
 if(files.some(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)))return 'Choose JPG, PNG or WebP images.';
 if(files.some(file=>file.size<=0||file.size>8*1024*1024))return 'Each image must be non-empty and 8 MB or smaller.';
 return '';
}
export default function TransporterCardMessages({bookingId,customerName,transporterId}:{bookingId:string;customerName:string;transporterId:string}){
 const [open,setOpen]=useState(false),[messages,setMessages]=useState<Message[]>([]),[body,setBody]=useState(''),[images,setImages]=useState<File[]>([]),[sending,setSending]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[loadError,setLoadError]=useState(''),[sent,setSent]=useState(false);
 const details=useRef<HTMLDetailsElement>(null),fileInput=useRef<HTMLInputElement>(null),inFlight=useRef(false),mounted=useRef(false),request=useRef<AbortController|null>(null);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;request.current?.abort();}},[]);
 useEffect(()=>{
  if(!open)return;
  let disposed=false;
  const visible=()=>window.matchMedia('(min-width:1024px)').matches&&!!details.current?.getClientRects().length&&!document.hidden;
  async function refresh(){
   if(disposed||!visible()||request.current||inFlight.current)return;
   const controller=new AbortController();request.current=controller;setLoading(true);
   try{
    const response=await fetch(`/api/bookings/messages?bookingId=${encodeURIComponent(bookingId)}`,{cache:'no-store',signal:controller.signal});
    const rows=await response.json();
    if(disposed||controller.signal.aborted)return;
    if(!response.ok||!Array.isArray(rows))throw new Error('Unable to load messages');
    setMessages(rows);setLoadError('');
    if(visible()){
     const read=await fetch('/api/bookings/messages',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({bookingId}),signal:controller.signal});
     if(read.ok&&!disposed)window.dispatchEvent(new Event('drivedrop:messages-read'));
    }
   }catch{if(!disposed&&!controller.signal.aborted)setLoadError('Unable to refresh messages. We will try again shortly.');}
   finally{if(request.current===controller){request.current=null;if(!disposed)setLoading(false);}}
  }
  void refresh();const timer=window.setInterval(refresh,5000);window.addEventListener('focus',refresh);
  return()=>{disposed=true;window.clearInterval(timer);window.removeEventListener('focus',refresh);request.current?.abort();request.current=null;};
 },[open,bookingId]);
 async function send(event:FormEvent){
  event.preventDefault();if(inFlight.current||(!body.trim()&&!images.length))return;
  inFlight.current=true;setSending(true);setError('');setSent(false);
  // Cancel any older read so it cannot overwrite the newly sent message.
  request.current?.abort();request.current=null;setLoading(false);
  try{
   const form=new FormData();form.set('bookingId',bookingId);form.set('body',body.trim());images.forEach(file=>form.append('images',file));
   const response=await fetch('/api/bookings/messages',{method:'POST',body:form});
   const result=await response.json().catch(()=>null);
   if(!mounted.current)return;
   if(!response.ok){setError(typeof result?.error==='string'?result.error:'Unable to send. Your message and images have been kept.');return;}
   if(typeof result?.id!=='string'||typeof result?.createdAt!=='string'||!result?.sender){setError('Unable to confirm sending. Check the conversation before trying again.');return;}
   setMessages(current=>current.some(message=>message.id===result.id)?current:[...current,result]);
   setBody('');setImages([]);setSent(true);if(fileInput.current)fileInput.current.value='';
  }catch{if(mounted.current)setError('Unable to confirm sending. Your draft is saved here; check the conversation before retrying.');}
  finally{inFlight.current=false;if(mounted.current)setSending(false);}
 }
 return <details ref={details} className="tdFourMessages tdCardMessages" onToggle={event=>setOpen(event.currentTarget.open)}>
  <summary>Customer messages</summary>
  <div className="tdThreadHistory" aria-live="polite">
   {loading&&!messages.length&&<p role="status">Loading messages…</p>}
   {loadError&&<p role="alert">{loadError}</p>}
   {!loading&&!loadError&&!messages.length&&<p>No messages yet. Send a message or image about this delivery.</p>}
   {messages.map(message=><div key={message.id} className={`tdThreadMessage${message.senderId===transporterId?' isSent':''}`}>
    <div className="tdThreadMeta"><strong>{message.senderId===transporterId?'You':message.sender.name}</strong><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString('en-GB',{timeZone:'Europe/London',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})}</time></div>
    {message.body&&message.body!=='Photo'&&<p>{message.body}</p>}
    {!!message.attachments?.length&&<div className="tdThreadImages">{message.attachments.map((image,index)=><a key={image.id} href={`/api/messages/attachments/${encodeURIComponent(image.id)}`} target="_blank" rel="noreferrer"><img src={`/api/messages/attachments/${encodeURIComponent(image.id)}`} alt={`Message image ${index+1}`} loading="lazy"/></a>)}</div>}
   </div>)}
  </div>
  <form className="tdReplyCompose" onSubmit={send} aria-busy={sending}>
   <label htmlFor={`reply-${bookingId}`}>Reply to {customerName.split(' ')[0]}</label>
   <textarea id={`reply-${bookingId}`} rows={2} maxLength={2000} value={body} disabled={sending} onChange={event=>{setBody(event.target.value);setSent(false);}} placeholder="Write a message to your customer…"/>
   {images.map((file,index)=><div className="tdReplyAttachment" key={`${file.name}-${index}`}><MessageIcon name="image"/><span>{file.name}</span><button type="button" disabled={sending} aria-label={`Remove ${file.name}`} onClick={()=>setImages(current=>current.filter((_,i)=>i!==index))}>×</button></div>)}
   <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={sending} aria-label="Choose message images" onChange={event=>{const selected=Array.from(event.target.files||[]);event.target.value='';if(!selected.length)return;const next=[...images,...selected];const issue=imageSelectionError(next);setError(issue);if(!issue){setImages(next);setSent(false);}}}/>
   <div className="tdReplyActions"><button type="button" className="tdAttachImage" disabled={sending} onClick={()=>fileInput.current?.click()}><MessageIcon name="imagePlus"/>Add image</button><button type="submit" className="tdSendReply" disabled={sending||(!body.trim()&&!images.length)}><MessageIcon name="send"/>{sending?'Sending…':'Send'}</button></div>
   {error&&<p className="tdReplyError" role="alert">{error}</p>}{sent&&<p className="tdReplySuccess" role="status">Message sent.</p>}
  </form>
 </details>;
}
