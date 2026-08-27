'use client';
import {useEffect,useRef,useState} from 'react';

type Hit={id:string;suggestion:string};
export default function AddressAutocomplete({name,label}:{name:string;label:string}){
 const [value,setValue]=useState(''),[hits,setHits]=useState<Hit[]>([]),[open,setOpen]=useState(false),[loading,setLoading]=useState(false);const timer=useRef<any>(null);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 function change(v:string){setValue(v);setOpen(true);clearTimeout(timer.current);if(v.trim().length<3){setHits([]);return}timer.current=setTimeout(async()=>{setLoading(true);try{const r=await fetch('/api/address/search?q='+encodeURIComponent(v));const d=await r.json();setHits(r.ok?d.hits||[]:[])}finally{setLoading(false)}},250)}
 async function choose(h:Hit){setOpen(false);setValue(h.suggestion);const r=await fetch('/api/address/resolve?id='+encodeURIComponent(h.id));const d=await r.json();if(r.ok)setValue(d.address||h.suggestion)}
 return <div className="field addressField"><label>{label}</label><input name={name} value={value} onChange={e=>change(e.target.value)} onFocus={()=>setOpen(true)} autoComplete="off" placeholder="Start typing an address or postcode" required aria-autocomplete="list"/>{open&&(loading||hits.length>0)&&<div className="addressSuggestions">{loading&&<div className="addressStatus">Finding addresses…</div>}{!loading&&hits.map(h=><button type="button" key={h.id} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(h)}>{h.suggestion}</button>)}</div>}<small className="muted">Can’t find it? You can type the address manually.</small></div>
}
