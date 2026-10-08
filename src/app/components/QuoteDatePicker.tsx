'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Icon} from './CollectionWindowFields';
import '../quote-date-picker.css';

export default function QuoteDatePicker({id,name,label,withTime=false,disabled=false,describedBy}:{id:string;name:string;label:string;withTime?:boolean;disabled?:boolean;describedBy?:string}){
 const [value,setValue]=useState(''),[open,setOpen]=useState(false),[day,setDay]=useState(''),[hour,setHour]=useState(''),[minute,setMinute]=useState('');
 const [month,setMonth]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1));
 const [position,setPosition]=useState({top:0,left:0});
 const trigger=useRef<HTMLButtonElement>(null),popup=useRef<HTMLDivElement>(null);
 function close(){setOpen(false);trigger.current?.focus();}
 function show(){const date=value.slice(0,10);setDay(date);setHour(value.slice(11,13));setMinute(value.slice(14,16));if(date)setMonth(new Date(date+'T12:00:00'));setOpen(true);}
 useEffect(()=>{const form=trigger.current?.closest('form');const reset=()=>{setValue('');setOpen(false);setDay('');setHour('');setMinute('');};form?.addEventListener('reset',reset);return()=>form?.removeEventListener('reset',reset)},[]);
 useEffect(()=>{if(disabled)setOpen(false)},[disabled]);
 useLayoutEffect(()=>{
  if(!open)return;
  const place=()=>{const rect=trigger.current?.getBoundingClientRect();if(!rect)return;const height=popup.current?.offsetHeight||350,width=popup.current?.offsetWidth||300;const below=window.innerHeight-rect.bottom-12;const top=below>=height||below>=rect.top?rect.bottom+6:rect.top-height-6;setPosition({top:Math.max(12,Math.min(top,window.innerHeight-height-12)),left:Math.max(12,Math.min(rect.left,window.innerWidth-width-12))})};
  place();popup.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"],.quotePickerDays button')?.focus();
  window.addEventListener('resize',place);document.addEventListener('scroll',place,true);return()=>{window.removeEventListener('resize',place);document.removeEventListener('scroll',place,true)};
 },[open,month]);
 useEffect(()=>{if(!open)return;const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!popup.current?.contains(event.target)&&!trigger.current?.contains(event.target))setOpen(false)};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside)},[open]);
 const format=(date:string)=>new Date(date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
 const display=value?format(value.slice(0,10))+(withTime?' · '+value.slice(11)+' UK':''):withTime?'Select date and time':'Select date';
 const offset=(new Date(month.getFullYear(),month.getMonth(),1).getDay()+6)%7,days=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
 return <><input type="hidden" name={name} value={value} disabled={disabled}/><button ref={trigger} id={id} type="button" className={'quotePickerTrigger'+(value?' hasValue':'')} disabled={disabled} aria-label={`${label}: ${display}`} aria-describedby={describedBy} aria-haspopup="dialog" aria-expanded={open} aria-controls={id+'-picker'} onClick={()=>open?close():show()}><span>{display}</span><Icon name="calendar"/></button>
 {open&&createPortal(<div ref={popup} id={id+'-picker'} className="quotePickerPopup" role="dialog" aria-label={label} style={position} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();close()}if(event.key==='Tab'){const nodes=Array.from(popup.current?.querySelectorAll<HTMLElement>('button:not(:disabled),select:not(:disabled)')||[]);const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}}}>
 <div className="quotePickerTitle"><strong>{label}</strong><button type="button" aria-label="Close calendar" onClick={close}><Icon name="close"/></button></div>
 <div className="quotePickerMonth"><button type="button" aria-label="Previous month" onClick={()=>setMonth(current=>new Date(current.getFullYear(),current.getMonth()-1,1))}>‹</button><strong aria-live="polite">{month.toLocaleDateString('en-GB',{month:'long',year:'numeric'})}</strong><button type="button" aria-label="Next month" onClick={()=>setMonth(current=>new Date(current.getFullYear(),current.getMonth()+1,1))}>›</button></div>
 <div className="quotePickerDays">{['M','T','W','T','F','S','S'].map((text,i)=><span key={i} aria-hidden="true">{text}</span>)}{Array.from({length:offset},(_,i)=><span key={'blank'+i}/>)}{Array.from({length:days},(_,i)=>{const date=`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`;return <button key={date} type="button" aria-label={format(date)} aria-pressed={day===date} onClick={()=>{setDay(date);if(!withTime){setValue(date);close()}}}>{i+1}</button>})}</div>
 {withTime&&<div className="quotePickerTime"><span><Icon name="clock"/>Expiry time · UK</span><label>Hour<select aria-label="Expiry hour" value={hour} onChange={e=>setHour(e.target.value)}><option value="" disabled>Hour</option>{Array.from({length:24},(_,i)=>String(i).padStart(2,'0')).map(t=><option key={t}>{t}</option>)}</select></label><label>Minute<select aria-label="Expiry minute" value={minute} onChange={e=>setMinute(e.target.value)}><option value="" disabled>Minute</option>{Array.from({length:60},(_,i)=>String(i).padStart(2,'0')).map(t=><option key={t}>{t}</option>)}</select></label></div>}
 <div className="quotePickerFooter"><button type="button" onClick={()=>{setValue('');close()}}>Clear</button>{withTime&&<button className="quotePickerApply" type="button" disabled={!day||!hour||!minute} onClick={()=>{setValue(`${day}T${hour}:${minute}`);close()}}>Use date &amp; time</button>}</div>
 </div>,document.body)}</>;
}
