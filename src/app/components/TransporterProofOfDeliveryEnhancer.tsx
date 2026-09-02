'use client';
import {useEffect,useRef,useState} from 'react';



function SignaturePad({onChange}:{onChange:(file:File|null)=>void}){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const drawing=useRef(false);
 const getPoint=(e:PointerEvent)=>{const c=canvasRef.current!;const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*(c.width/r.width),y:(e.clientY-r.top)*(c.height/r.height)}};
 useEffect(()=>{const c=canvasRef.current;if(!c)return;const ctx=c.getContext('2d');if(!ctx)return;ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#10233f';const down=(e:PointerEvent)=>{drawing.current=true;c.setPointerCapture(e.pointerId);const p=getPoint(e);ctx.beginPath();ctx.moveTo(p.x,p.y)};const move=(e:PointerEvent)=>{if(!drawing.current)return;const p=getPoint(e);ctx.lineTo(p.x,p.y);ctx.stroke()};const up=()=>{if(!drawing.current)return;drawing.current=false;c.toBlob(blob=>onChange(blob?new File([blob],'recipient-signature.png',{type:'image/png'}):null),'image/png')};c.addEventListener('pointerdown',down);c.addEventListener('pointermove',move);c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);return()=>{c.removeEventListener('pointerdown',down);c.removeEventListener('pointermove',move);c.removeEventListener('pointerup',up);c.removeEventListener('pointercancel',up)}} ,[onChange]);
 const clear=()=>{const c=canvasRef.current;const ctx=c?.getContext('2d');if(c&&ctx){ctx.clearRect(0,0,c.width,c.height);onChange(null)}};
 return <div className="podSignature"><canvas ref={canvasRef} width={900} height={260} aria-label="Recipient signature pad"/><button type="button" className="textAction" onClick={clear}>Clear signature</button></div>
}

function PodForm({booking,onDone}:{booking:any,onDone:()=>void|Promise<void>}){
 const inFlight=useRef(false);const[open,setOpen]=useState(false);const[recipient,setRecipient]=useState('');const[notes,setNotes]=useState('');const[photos,setPhotos]=useState<File[]>([]);const[signature,setSignature]=useState<File|null>(null);const[confirmed,setConfirmed]=useState(false);const[busy,setBusy]=useState(false);const[message,setMessage]=useState<string|null>(null);

 async function submit(e:React.FormEvent){
  e.preventDefault();
  if(inFlight.current)return;
  if(!recipient.trim()||!signature||photos.length<1||!confirmed){setMessage('Add the recipient name, delivery photos and signature, then confirm the handover.');return}
  inFlight.current=true;setBusy(true);setMessage(null);
  try{
   const f=new FormData();f.set('bookingId',booking.id);f.set('recipientName',recipient);f.set('notes',notes);f.set('confirmed',String(confirmed));f.set('signature',signature);photos.forEach(p=>f.append('photos',p));
   const r=await fetch('/api/bookings/proof-of-delivery',{method:'POST',body:f});
   const d=await r.json().catch(()=>null);
   if(!r.ok){setMessage(typeof d?.error==='string'?d.error:'Unable to submit proof of delivery. Your details are still here.');return}
   if(d?.ok!==true||typeof d.submittedAt!=='string'||!Number.isFinite(Date.parse(d.submittedAt))){setMessage('We could not verify the saved delivery. Refresh and check this booking before submitting again.');return}
   setMessage('Proof of delivery submitted successfully.');
   await onDone();
  }catch{setMessage('The connection was interrupted. Refresh and check whether this delivery is completed before submitting again.')}
  finally{inFlight.current=false;setBusy(false)}
 }

 return <div className="podMount" data-pod-mount="true">{!open?<button type="button" className="btn orange fullBtn" onClick={()=>setOpen(true)}>Complete delivery</button>:<form className="infoPanel podPanel" onSubmit={submit} aria-busy={busy}><fieldset disabled={busy} style={{border:0,padding:0,margin:0,minWidth:0}}><div className="subHeading"><h3>Proof of delivery</h3><button type="button" className="textAction" onClick={()=>setOpen(false)}>Close</button></div><p className="muted">Add delivery evidence and the recipient’s signature before completing this booking.</p><div className="field"><label>RECIPIENT NAME</label><input value={recipient} onChange={e=>setRecipient(e.target.value)} minLength={2} maxLength={120} required placeholder="Name of person receiving vehicle"/></div><div className="field"><label>DELIVERY PHOTOS</label><input type="file" accept="image/jpeg,image/png,image/webp" multiple required onChange={e=>setPhotos(Array.from(e.target.files||[]).slice(0,6))}/><small className="muted">1–6 photos. JPG, PNG or WebP.</small></div><div className="field"><label>RECIPIENT SIGNATURE</label><SignaturePad onChange={setSignature}/></div><div className="field"><label>DELIVERY NOTES</label><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4} maxLength={1000} placeholder="Optional condition, access or handover notes"/></div><label className="podConfirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} required/> I confirm the vehicle has been delivered to the recipient.</label>{message&&<div role={message.startsWith('Proof')?'status':'alert'} className={message.startsWith('Proof')?'formNotice successNotice':'formNotice errorNotice'}>{message}</div>}<button className="btn orange fullBtn" disabled={busy||!signature||photos.length===0}>{busy?'Submitting…':'Submit proof & complete delivery'}</button></fieldset></form>}</div>
}

export default function TransporterProofOfDeliveryEnhancer({booking,onDone}:{booking:any,onDone:()=>void|Promise<void>}){
 return <PodForm booking={booking} onDone={onDone}/>;
}
