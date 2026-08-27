'use client';
import {useRef,useState} from 'react';

export default function EvidenceUpload({bookingId,type,onUploaded}:{bookingId:string,type:'COLLECTION'|'DELIVERY',onUploaded:()=>void|Promise<void>}){
 const input=useRef<HTMLInputElement>(null);const[busy,setBusy]=useState(false);
 async function upload(file?:File){if(!file)return;const note=prompt('Photo note (optional):')||'';const form=new FormData();form.set('bookingId',bookingId);form.set('type',type);form.set('file',file);if(note)form.set('note',note);setBusy(true);try{const r=await fetch('/api/bookings/evidence',{method:'POST',body:form});const d=await r.json().catch(()=>null);if(!r.ok){alert(d?.error||'Unable to upload photo');return;}await onUploaded();}finally{setBusy(false);if(input.current)input.current.value=''}}
 return <span style={{display:'inline-block',marginRight:8,marginBottom:8,marginTop:4}}><input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e=>upload(e.target.files?.[0])}/><button className="btn orange" disabled={busy} onClick={()=>input.current?.click()}>{busy?'Uploading…':`Add ${type==='COLLECTION'?'collection':'delivery'} photo`}</button></span>
}
