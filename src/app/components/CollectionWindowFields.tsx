'use client';
import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {ukParts,ukInstant} from '@/lib/availability-time';
const periods=['Night','Morning','Afternoon','Evening'];
const ranges=['00:00–05:30','06:00–11:30','12:00–17:30','18:00–23:30'];
const clock=(n:number)=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
const minutes=(s:string)=>Number(s.slice(0,2))*60+Number(s.slice(3));
export function Icon({name}:{name:'clock'|'calendar'|'chevron'|'close'|'check'}){
 return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{name==='clock'?<><circle cx="12" cy="12" r="10"/><path d="M12 6v6h4"/></>:name==='calendar'?<><path d="M8 2v4M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></>:name==='chevron'?<path d="m6 9 6 6 6-6"/>:name==='close'?<path d="m18 6-12 12M6 6l12 12"/>:<path d="m20 6-11 11-5-5"/>}</svg>;
}
export default function CollectionWindowFields({date,from='',until='',required=false,dateField}:{date:string;from?:string|null;until?:string|null;required?:boolean;dateField?:ReactNode}){
 const id=useId(),root=useRef<HTMLFieldSetElement>(null),startButton=useRef<HTMLButtonElement>(null),endButton=useRef<HTMLButtonElement>(null);
 const [start,setStart]=useState(from||''),[end,setEnd]=useState(until||''),[active,setActive]=useState<'from'|'until'>('from'),[open,setOpen]=useState(false),[period,setPeriod]=useState(1),[error,setError]=useState(''),[saved,setSaved]=useState(false),[now,setNow]=useState<Date|null>(null);
 const day=date.slice(0,10),sameDay=!!now&&day===ukParts(now).date,mustFill=required||sameDay;
 useEffect(()=>{setNow(new Date());const timer=setInterval(()=>setNow(new Date()),30000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{setStart(from||'');setEnd(until||'');setSaved(false);setOpen(false);setError('');},[from,until]);
 useEffect(()=>{setSaved(false);setError('');},[day]);
 function invalid(a=start,b=end,allowUndated=false){if(!a&&!b)return mustFill?'Select both an Available from and Available until time.':'';if(!a||!b||a>=b)return 'Available until must be later than Available from.';if(!day)return allowUndated?'':'Choose a collection date before submitting your request.';try{const current=new Date();if(ukInstant(day,b)<=current)return 'Choose a later collection window.';ukInstant(day,a);}catch{return 'Choose valid collection times for this date.';}return '';}
 useEffect(()=>{const form=root.current?.closest('form');if(!form)return;const reset=()=>{setStart(from||'');setEnd(until||'');setOpen(false);setSaved(false);setError('');};const submit=(e:Event)=>{const message=invalid();if(message){e.preventDefault();e.stopImmediatePropagation();setError(message);setOpen(true);setActive(!start?'from':'until');setPeriod(!start?1:Math.min(3,Math.floor((minutes(start)+30)/360)));startButton.current?.focus();}};form.addEventListener('reset',reset);form.addEventListener('submit',submit,true);return()=>{form.removeEventListener('reset',reset);form.removeEventListener('submit',submit,true);};});
 function show(which:'from'|'until'){setNow(new Date());setActive(which);setPeriod((which==='from'?start:end)?Math.floor(minutes(which==='from'?start:end)/360):which==='until'&&start?Math.min(3,Math.floor((minutes(start)+30)/360)):1);setOpen(true);setSaved(false);}
 function close(){setOpen(false);(active==='from'?startButton:endButton).current?.focus();}
 const formattedDate=/^\d{4}-\d{2}-\d{2}$/.test(day)?new Date(day+'T12:00:00Z').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'}):'Select a collection date';
 return <fieldset ref={root} className={`availabilityWindow ddCollection${dateField?' ddCollectionCombined':''}`} aria-label={dateField?'Collection date & time':'Collection window'} onKeyDown={e=>{if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();close();}}}>
  <input type="hidden" name="collectionFrom" value={start}/><input type="hidden" name="collectionUntil" value={end}/>
  <header><span className="dd-icon"><Icon name="clock"/></span><div><h2>{dateField?'Collection date & time':'Collection window'}</h2><p>{dateField?'Choose your collection date and when your vehicle will be available.':'Choose when your vehicle will be ready for collection.'}</p></div></header>
  {!dateField&&<div className="dd-date"><Icon name="calendar"/><span>{formattedDate}</span><span className="dd-zone">UK time</span></div>}
  <div className="dd-fields">{dateField}{(['from','until'] as const).map(which=><div key={which}><label id={`${id}-${which}-label`}>{which==='from'?'Available from':'Available until'}</label><button ref={which==='from'?startButton:endButton} type="button" className={`dd-field ${(which==='from'?start:end)?'has-value':''}`} aria-labelledby={`${id}-${which}-label ${id}-${which}-value`} aria-expanded={open&&active===which} aria-controls={`${id}-picker`} onClick={()=>show(which)}><Icon name="clock"/><span id={`${id}-${which}-value`}>{(which==='from'?start:end)||'Select time'}</span><Icon name="chevron"/></button></div>)}</div>
  {open&&<section className="dd-picker" id={`${id}-picker`} aria-label="Choose collection times"><div className="dd-picker-heading"><strong>{active==='from'?'Choose your earliest collection time':'Choose your latest collection time'}</strong><button type="button" className="dd-close" aria-label="Close time picker" onClick={close}><Icon name="close"/></button></div>
   <div className="dd-periods" aria-label="Time of day">{periods.map((name,i)=><button type="button" key={name} aria-pressed={period===i} onClick={()=>setPeriod(i)}>{name}<span>{ranges[i]}</span></button>)}</div>
   <div className="dd-slots" aria-label="Times in 30-minute intervals">{Array.from({length:12},(_,i)=>{const n=period*360+i*30,t=clock(n);let disabled=active==='until'&&!!start&&t<=start||active==='from'&&n===1410;if(now&&day){try{disabled=disabled||ukInstant(day,t)<=now;}catch{disabled=true;}}return <button key={t} type="button" className="dd-slot" aria-pressed={t===(active==='from'?start:end)} disabled={disabled} onClick={()=>{setError('');setSaved(false);if(active==='from'){setStart(t);if(end&&end<=t)setEnd('');setActive('until');setPeriod(Math.min(3,Math.floor((n+30)/360)));endButton.current?.focus();}else setEnd(t);}}>{t}</button>;})}</div>
   <footer><span className="dd-hint" aria-live="polite">{start&&end?`${start} – ${end} · UK time`:start?`From ${start} · now select an end time.`:'Select a start time, then an end time.'}</span><button type="button" className="dd-apply" disabled={!start||!end} onClick={()=>{const message=invalid(start,end,true);if(message){setError(message);return;}setError('');setSaved(true);close();}}>Use this window <Icon name="check"/></button></footer>
   {error&&<p className="availabilityError" role="alert">{error}</p>}
  </section>}
  {saved&&<div className="dd-saved" aria-live="polite">Collection window: {start} – {end} · {formattedDate}</div>}
  <div className="dd-helper"><span>{mustFill?'UK time · Both collection times are required.':'Optional · Leave both times blank to arrange a window later.'}</span>{!mustFill&&(start||end)&&<button type="button" onClick={()=>{setStart('');setEnd('');setSaved(false);setError('');setOpen(false);}}>Clear times</button>}</div>
  {error&&!open&&<p className="availabilityError" role="alert">{error}</p>}
 </fieldset>;
}
