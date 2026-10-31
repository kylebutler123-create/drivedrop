'use client';
import {useEffect,useId,useRef,useState} from 'react';
import type {ReactNode} from 'react';

type Hit={id:string;suggestion:string};
export default function AddressAutocomplete({name,label,desktopPlaceholder,placeholder,initialValue='',compact=false,manualEntry=false}:{name:string;label:ReactNode;desktopPlaceholder?:string;placeholder?:string;initialValue?:string;compact?:boolean;manualEntry?:boolean}){
 const inputId=useId();
 const pointerActive=useRef(false);
 const [desktopPrompt,setDesktopPrompt]=useState(false);
 useEffect(()=>{
  if(!desktopPlaceholder)return;
  const media=window.matchMedia('(min-width:1024px)');
  const sync=()=>setDesktopPrompt(media.matches&&document.body.classList.contains('approvedDesktop'));
  sync();media.addEventListener('change',sync);
  return()=>media.removeEventListener('change',sync);
 },[desktopPlaceholder]);
 const hintId=inputId+'-hint';
 const [value,setValue]=useState(initialValue),[hits,setHits]=useState<Hit[]>([]),[open,setOpen]=useState(false),[loading,setLoading]=useState(false);
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
 useEffect(()=>{if(manualEntry){cancelPending();setOpen(false);setHits([]);setLoading(false);setLookupMessage(null)}},[manualEntry]);
 useEffect(()=>{
  if(!open)return;
  const beginPointer=()=>{pointerActive.current=true};
  const endPointer=()=>{pointerActive.current=false};
  const onOutsidePointer=(event:MouseEvent)=>{
   endPointer();
   if(event.target instanceof Node&&!field.current?.contains(event.target))setOpen(false);
  };
  // Compact results occupy space: wait for the click before collapsing them.
  const outsideEvent=compact?'click':'pointerdown';
  document.addEventListener(outsideEvent,onOutsidePointer);
  if(compact){document.addEventListener('pointerdown',beginPointer,true);document.addEventListener('keydown',endPointer,true);document.addEventListener('pointercancel',endPointer)}
  return()=>{document.removeEventListener(outsideEvent,onOutsidePointer);document.removeEventListener('pointerdown',beginPointer,true);document.removeEventListener('keydown',endPointer,true);document.removeEventListener('pointercancel',endPointer);endPointer()};
 },[open,compact]);
 function useEnteredAddress(){
  cancelPending();
  setOpen(false);setHits([]);setLoading(false);
  setLookupMessage('Using your entered address.');
 }
 function change(v:string){
  cancelPending();
  const version=requestVersion.current;
  setValue(v);setOpen(true);setHits([]);setLoading(false);setLookupMessage(null);
  if(manualEntry){setOpen(false);return}
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
 return <div className={"field addressField"+(compact?" compactAddressField":"")} ref={field} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null)&&!(compact&&pointerActive.current))setOpen(false)}} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();setOpen(false)}}}><label htmlFor={inputId}>{label}</label><span className="addressInputWrap" style={compact?undefined:{display:'contents'}}>{compact&&<svg className="addressPin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.6"/></svg>}<input id={inputId} aria-describedby={!compact||lookupMessage?hintId:undefined} name={name} value={value} onChange={e=>change(e.target.value)} onFocus={()=>setOpen(!manualEntry)} autoComplete="off" placeholder={placeholder||(desktopPrompt?desktopPlaceholder:"Start typing an address or postcode")} required aria-autocomplete={manualEntry?"none":"list"}/></span>{open&&(value.trim().length>0||loading||hits.length>0)&&<div className="addressSuggestions">{value.trim().length>0&&<button type="button" style={{fontWeight:700,color:'#b9560c',background:'#fff8f1'}} onPointerDown={e=>e.preventDefault()} onMouseDown={e=>e.preventDefault()} onClick={useEnteredAddress}>Use address as entered</button>}{loading&&<div className="addressStatus">Finding addresses…</div>}{!loading&&hits.map(h=><button type="button" key={h.id} onPointerDown={e=>e.preventDefault()} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(h)}>{h.suggestion}</button>)}</div>}{(!compact||lookupMessage)&&<small id={hintId} className="muted" role={lookupMessage?'status':undefined}>{lookupMessage||'Can’t find it? Type the full address and choose “Use address as entered”.'}</small>}</div>
}
