'use client';
import {useEffect,useRef,useState} from 'react';

type Hit={id:string;suggestion:string};
export default function AddressAutocomplete({name,label}:{name:string;label:string}){
 const [value,setValue]=useState(''),[hits,setHits]=useState<Hit[]>([]),[open,setOpen]=useState(false),[loading,setLoading]=useState(false);
 const [lookupMessage,setLookupMessage]=useState<string|null>(null);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const requestVersion=useRef(0);
 const activeRequest=useRef<AbortController|null>(null);
 const field=useRef<HTMLDivElement|null>(null);
 function cancelPending(){
  requestVersion.current+=1;
  if(timer.current!==null){clearTimeout(timer.current);timer.current=null}
  activeRequest.current?.abort();activeRequest.current=null;
 }
 useEffect(()=>()=>cancelPending(),[]);
 useEffect(()=>{
  if(!open)return;
  const onOutsidePointer=(event:PointerEvent)=>{
   if(event.target instanceof Node&&!field.current?.contains(event.target))setOpen(false);
  };
  document.addEventListener('pointerdown',onOutsidePointer);
  return()=>document.removeEventListener('pointerdown',onOutsidePointer);
 },[open]);
 function useEnteredAddress(){
  cancelPending();
  setOpen(false);setHits([]);setLoading(false);
  setLookupMessage('Using your entered address.');
 }
 function change(v:string){
  cancelPending();
  const version=requestVersion.current;
  setValue(v);setOpen(true);setHits([]);setLoading(false);setLookupMessage(null);
  if(v.trim().length<3)return;
  timer.current=setTimeout(async()=>{
   timer.current=null;
   const controller=new AbortController();activeRequest.current=controller;
   setLoading(true);
   try{
    const response=await fetch('/api/address/search?q='+encodeURIComponent(v),{signal:controller.signal});
    const data=await response.json();
    if(version!==requestVersion.current)return;
    if(!response.ok||!Array.isArray(data?.hits))throw new Error('Address lookup unavailable');
    setHits(data.hits.filter((hit:any):hit is Hit=>typeof hit?.id==='string'&&!!hit.id&&typeof hit.suggestion==='string'&&!!hit.suggestion.trim()));
   }catch{
    if(version===requestVersion.current){
     setHits([]);setLookupMessage('Address lookup is unavailable. You can still type the full address manually.');
    }
   }finally{
    if(version===requestVersion.current){setLoading(false);activeRequest.current=null}
   }
  },250);
 }
 async function choose(h:Hit){
  cancelPending();
  const version=requestVersion.current;
  const controller=new AbortController();activeRequest.current=controller;
  setOpen(false);setHits([]);setLoading(false);setLookupMessage(null);setValue(h.suggestion);
  try{
   const response=await fetch('/api/address/resolve?id='+encodeURIComponent(h.id),{signal:controller.signal});
   const data=await response.json();
   if(version!==requestVersion.current)return;
   if(!response.ok||typeof data?.address!=='string'||!data.address.trim())throw new Error('Address lookup unavailable');
   setValue(data.address);
  }catch{
   if(version===requestVersion.current)setLookupMessage('We could not load the full address. Please check and complete it manually.');
  }finally{
   if(version===requestVersion.current)activeRequest.current=null;
  }
 }
 return <div className="field addressField" ref={field} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setOpen(false)}} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();setOpen(false)}}}><label>{label}</label><input name={name} value={value} onChange={e=>change(e.target.value)} onFocus={()=>setOpen(true)} autoComplete="off" placeholder="Start typing an address or postcode" required aria-autocomplete="list"/>{open&&(value.trim().length>0||loading||hits.length>0)&&<div className="addressSuggestions">{value.trim().length>0&&<button type="button" style={{fontWeight:700,color:'#b9560c',background:'#fff8f1'}} onPointerDown={e=>e.preventDefault()} onMouseDown={e=>e.preventDefault()} onClick={useEnteredAddress}>Use address as entered</button>}{loading&&<div className="addressStatus">Finding addresses…</div>}{!loading&&hits.map(h=><button type="button" key={h.id} onPointerDown={e=>e.preventDefault()} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(h)}>{h.suggestion}</button>)}</div>}<small className="muted" role={lookupMessage?'status':undefined}>{lookupMessage||'Can’t find it? Type the full address and choose “Use address as entered”.'}</small></div>
}
