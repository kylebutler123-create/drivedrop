'use client';
import {useEffect,useRef,useState} from 'react';
function Signature({onChange}:{onChange:(f:File|null)=>void}){const ref=useRef<HTMLCanvasElement>(null),drawing=useRef(false);useEffect(()=>{const c=ref.current,ctx=c?.getContext('2d');if(!c||!ctx)return;ctx.lineWidth=3;ctx.lineCap='round';ctx.strokeStyle='#10233f';const point=(e:PointerEvent)=>{const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height}};const down=(e:PointerEvent)=>{drawing.current=true;c.setPointerCapture(e.pointerId);const p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y)};const move=(e:PointerEvent)=>{if(!drawing.current)return;const p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke()};const up=()=>{if(!drawing.current)return;drawing.current=false;c.toBlob(b=>onChange(b?new File([b],'collection-signature.png',{type:'image/png'}):null),'image/png')};c.addEventListener('pointerdown',down);c.addEventListener('pointermove',move);c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);return()=>{c.removeEventListener('pointerdown',down);c.removeEventListener('pointermove',move);c.removeEventListener('pointerup',up);c.removeEventListener('pointercancel',up)}},[onChange]);return <div className="podSignature"><canvas ref={ref} width={900} height={260}/><button type="button" className="textAction" onClick={()=>{const c=ref.current;c?.getContext('2d')?.clearRect(0,0,c.width,c.height);onChange(null)}}>Clear signature</button></div>}
const PHOTO_REQUEST_BUDGET=3*1024*1024;

async function loadPhoto(file:File){
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();
  image.decoding='async';
  await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('This collection photo could not be read. Please choose another image.'));image.src=url});
  return image;
 }catch(error){throw error}finally{URL.revokeObjectURL(url)}
}

async function preparePhoto(file:File,targetBytes:number){
 if(file.size<=targetBytes)return file;
 const image=await loadPhoto(file);
 const longest=Math.max(image.naturalWidth,image.naturalHeight);
 let scale=Math.min(1,1600/longest);
 let smallest:Blob|null=null;
 for(let attempt=0;attempt<6;attempt+=1){
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
  canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const context=canvas.getContext('2d');
  if(!context)throw new Error('This device could not prepare the collection photo. Please try another image.');
  context.drawImage(image,0,0,canvas.width,canvas.height);
  const quality=Math.max(.5,.82-attempt*.06);
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
  if(!blob)throw new Error('This device could not prepare the collection photo. Please try another image.');
  if(!smallest||blob.size<smallest.size)smallest=blob;
  if(blob.size<=targetBytes)return new File([blob],file.name.replace(/\.[^.]+$/,'.jpg'),{type:'image/jpeg',lastModified:file.lastModified});
  scale*=.8;
 }
 if(!smallest||smallest.size>targetBytes)throw new Error('The selected photos are too large to submit together. Please choose fewer photos and try again.');
 return new File([smallest],file.name.replace(/\.[^.]+$/,'.jpg'),{type:'image/jpeg',lastModified:file.lastModified});
}

async function preparePhotos(files:File[]){
 const target=Math.floor(PHOTO_REQUEST_BUDGET/files.length);
 return Promise.all(files.map(file=>preparePhoto(file,target)));
}

function Form({booking,onDone}:{booking:any,onDone:()=>void|Promise<void>}){const inFlight=useRef(false);const[open,setOpen]=useState(false),[releasedBy,setReleasedBy]=useState(''),[condition,setCondition]=useState(''),[damage,setDamage]=useState(''),[photos,setPhotos]=useState<File[]>([]),[signature,setSignature]=useState<File|null>(null),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');async function submit(e:React.FormEvent){e.preventDefault();if(inFlight.current)return;if(!releasedBy.trim()||!condition||!signature||photos.length<1||!confirmed){setMsg('Add the releasing person, vehicle condition, collection photos and signature, then confirm the report.');return}inFlight.current=true;setBusy(true);setMsg('Preparing collection photos…');try{const preparedPhotos=await preparePhotos(photos);const f=new FormData();f.set('bookingId',booking.id);f.set('releasedBy',releasedBy);f.set('condition',condition);f.set('damageNotes',damage);f.set('confirmed',String(confirmed));f.set('signature',signature);preparedPhotos.forEach(p=>f.append('photos',p));setMsg('Submitting collection report…');const r=await fetch('/api/bookings/proof-of-collection',{method:'POST',body:f});const d=await r.json().catch(()=>null);if(!r.ok){setMsg(d?.error||'Unable to submit collection report. Your details are still here.');return}if(d?.ok!==true||typeof d.submittedAt!=='string'||!Number.isFinite(Date.parse(d.submittedAt))){setMsg('We could not verify the saved collection. Refresh and check this booking before submitting again.');return}setMsg('Collection report submitted. Vehicle is now in transit.');await onDone()}catch(error){setMsg(error instanceof Error?error.message:'The connection was interrupted. Your report details are still here; please try again.')}finally{inFlight.current=false;setBusy(false)}}return <div data-poc="true">{!open?<button type="button" className="btn orange fullBtn" onClick={()=>setOpen(true)} aria-expanded={open}>Complete collection</button>:<form className="infoPanel podPanel" onSubmit={submit} aria-busy={busy}><fieldset disabled={busy} style={{border:0,padding:0,margin:0,minWidth:0}}><div className="subHeading"><h3>Proof of collection</h3><button type="button" className="textAction" onClick={()=>setOpen(false)}>Close</button></div><p className="muted">Record the vehicle condition before transport begins.</p><div className="field"><label>PERSON RELEASING VEHICLE</label><input required minLength={2} maxLength={120} value={releasedBy} onChange={e=>setReleasedBy(e.target.value)}/></div><div className="field"><label>VEHICLE CONDITION</label><select required value={condition} onChange={e=>setCondition(e.target.value)}><option value="">Select condition</option><option value="NO_DAMAGE">No existing damage observed</option><option value="EXISTING_DAMAGE">Existing damage present</option></select></div>{condition==='EXISTING_DAMAGE'&&<div className="field"><label>EXISTING DAMAGE NOTES</label><textarea required rows={4} maxLength={1500} value={damage} onChange={e=>setDamage(e.target.value)} placeholder="Describe scratches, dents, marks or other existing damage"/></div>}<div className="field"><label>COLLECTION PHOTOS</label><input required type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>{setPhotos(Array.from(e.target.files||[]).slice(0,8));setMsg('')}}/><small className="muted">Add clear photos of the vehicle and any existing damage. Up to 8 photos.</small></div><div className="field"><label>RELEASE SIGNATURE</label><Signature onChange={setSignature}/></div><label className="podConfirm"><input required type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I confirm the vehicle has been collected and this condition report is accurate.</label>{msg&&<div className={msg.startsWith('Collection')?'formNotice successNotice':'formNotice errorNotice'}>{msg}</div>}<button type="submit" className="btn orange fullBtn" disabled={busy}>{busy?'Submitting…':'Submit proof & complete collection'}</button></fieldset></form>}</div>}
export default function TransporterProofOfCollectionEnhancer({booking,onDone}:{booking:any,onDone:()=>void|Promise<void>}){
 return <Form booking={booking} onDone={onDone}/>;
}
