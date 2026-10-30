'use client';

import {useEffect,useId,useRef,useState} from 'react';
import Icon from './ApprovedIcon';
import type {JobLocationHit,JobOrigin} from '@/lib/job-locations';

export type NearbyState={count:number;total:number;active:boolean;origin:string;radius:number;busy:boolean;error:string;unlocated:number};
export type NearbyAction={type:'search'|'clear'|'radius'|'reset'|'cancel';origin?:JobOrigin;radius?:number};
const radii=[10,25,50,75,100,150,200];
const postcodePattern=/^(?:GIR\s?0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})$/i;
const initialState:NearbyState={count:0,total:0,active:false,origin:'',radius:25,busy:false,error:'',unlocated:0};

export default function MobileNearbyJobs({loaded,filtersOpen,onToggleFilters}:{loaded:boolean;filtersOpen:boolean;onToggleFilters:()=>void}){
 const id=useId(),host=useRef<HTMLDivElement>(null),input=useRef<HTMLInputElement>(null);
 const [value,setValue]=useState(''),[selected,setSelected]=useState<JobOrigin|null>(null),[radius,setRadius]=useState(25);
 const [hits,setHits]=useState<JobLocationHit[]>([]),[open,setOpen]=useState(false),[loading,setLoading]=useState(false),[activeHit,setActiveHit]=useState(-1);
 const [notice,setNotice]=useState(''),[locating,setLocating]=useState(false),[state,setState]=useState<NearbyState>(initialState);
 const generation=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|null>(null),request=useRef<AbortController|null>(null);
 function action(detail:NearbyAction){host.current?.closest('#available-jobs')?.dispatchEvent(new CustomEvent('drivedrop:nearby-action',{detail}))}
 function cancelSuggestions(){generation.current++;if(timer.current)clearTimeout(timer.current);timer.current=null;request.current?.abort();request.current=null;setLoading(false);setLocating(false)}
 useEffect(()=>{
  const section=host.current?.closest('#available-jobs');
  const update=(event:Event)=>{const detail=(event as CustomEvent<NearbyState>).detail;setState(detail);setRadius(detail.radius)};
  section?.addEventListener('drivedrop:nearby-state',update);
  section?.dispatchEvent(new CustomEvent('drivedrop:nearby-ready'));
  return()=>{generation.current++;if(timer.current)clearTimeout(timer.current);request.current?.abort();section?.removeEventListener('drivedrop:nearby-state',update)};
 },[]);
 function change(next:string){
  cancelSuggestions();action({type:'cancel'});setValue(next);setSelected(null);setHits([]);setActiveHit(-1);setOpen(true);setNotice('');
  if(!next.trim()){action({type:'clear'});return}
  if(next.trim().length<3)return;
  const version=generation.current;
  timer.current=setTimeout(async()=>{
   const controller=new AbortController();request.current=controller;setLoading(true);
   try{
    const response=await fetch('/api/jobs/locations?q='+encodeURIComponent(next.trim()),{signal:controller.signal});
    const data=await response.json();
    if(version!==generation.current)return;
    if(!response.ok||!Array.isArray(data.hits))throw new Error(data.error||'Location lookup is unavailable. Enter a full postcode or try again.');
    setHits(data.hits);if(!data.hits.length)setNotice('No matching places. Try a nearby town or a full postcode.');
   }catch(error){if(version===generation.current)setNotice(error instanceof Error?error.message:'Location lookup is unavailable. Please try again.')}
   finally{if(version===generation.current){setLoading(false);request.current=null}}
  },300);
 }
 function choose(hit:JobLocationHit){cancelSuggestions();action({type:'cancel'});setValue(hit.name);setSelected(hit.origin);setHits([]);setOpen(false);setActiveHit(-1);setNotice('');input.current?.focus()}
 function clear(){cancelSuggestions();setValue('');setSelected(null);setHits([]);setOpen(false);setNotice('');setActiveHit(-1);action({type:'clear'});input.current?.focus()}
 function find(){
  const origin=selected||(postcodePattern.test(value.trim())?{kind:'postcode' as const,postcode:value.trim()}:null);
  if(!origin){setNotice('Choose a location from the suggestions, or enter a full postcode.');setOpen(true);input.current?.focus();return}
  cancelSuggestions();setSelected(origin);setOpen(false);setNotice('');action({type:'search',origin,radius});
 }
 function useLocation(){
  cancelSuggestions();action({type:'cancel'});setNotice('');setOpen(false);
  if(!navigator.geolocation){setNotice('Your location is unavailable. Enter a town, city or postcode.');return}
  setLocating(true);const version=generation.current;
  navigator.geolocation.getCurrentPosition(position=>{
   if(generation.current!==version)return;
   setLocating(false);setValue('Your location');setSelected({kind:'coordinates',point:{lat:position.coords.latitude,lon:position.coords.longitude},label:'your location'});setHits([]);setNotice('');
  },error=>{
   if(generation.current!==version)return;
   setLocating(false);setNotice(error.code===1?'Location access was declined. Enter a town, city or postcode.':'Your location could not be found. Try again or enter a postcode.');
  },{timeout:10000,maximumAge:60000});
 }
 const choosing=open&&hits.length>0&&!state.active;
 const changed=state.active&&!!value.trim()&&value.trim().toLowerCase()!==state.origin.toLowerCase();
 const message=notice||state.error||(changed?'Location changed — tap Find jobs to update your results.':'');
 return <div ref={host} className="ddMobileOnly ddNearbyJobs">
  <form className="ddNearbyPanel" onSubmit={event=>{event.preventDefault();find()}}>
   <div className="ddNearbyPlace" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null)){setOpen(false);setActiveHit(-1)}}}>
    <label htmlFor={id}>Collection near</label>
    <div className="ddNearbyInput"><Icon name="location"/><input ref={input} id={id} role="combobox" aria-expanded={open&&hits.length>0} aria-controls={id+'-places'} aria-autocomplete="list" aria-activedescendant={open&&activeHit>=0?id+'-place-'+activeHit:undefined} aria-describedby={message?id+'-notice':undefined} autoComplete="off" value={value} placeholder="Town, city or postcode" maxLength={100} onChange={event=>change(event.target.value)} onFocus={()=>{if(hits.length)setOpen(true)}} onKeyDown={event=>{
     if(event.key==='Escape'){setOpen(false);setActiveHit(-1)}
     if((event.key==='ArrowDown'||event.key==='ArrowUp')&&hits.length){event.preventDefault();setOpen(true);setActiveHit(current=>event.key==='ArrowDown'?(current+1)%hits.length:current<0?hits.length-1:(current-1+hits.length)%hits.length)}
     if(event.key==='Enter'&&open&&activeHit>=0&&hits[activeHit]){event.preventDefault();choose(hits[activeHit])}
    }}/>{value&&<button className="ddNearbyClear" type="button" aria-label="Clear location" onClick={clear}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>}</div>
    {open&&hits.length>0&&<ul id={id+'-places'} className="ddNearbySuggestions" role="listbox" aria-label="Matching locations">{hits.map((hit,index)=><li key={hit.id} id={id+'-place-'+index} role="option" aria-selected={activeHit===index} onPointerDown={event=>event.preventDefault()} onClick={()=>choose(hit)}><Icon name="location"/><span><strong>{hit.name}</strong><small>{hit.description}</small></span></li>)}</ul>}
    {loading&&<p className="ddNearbyNotice" role="status">Finding locations…</p>}
   </div>
   <button type="button" className="ddNearbyLocate" onClick={useLocation} disabled={locating}><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m3 10 18-7-7 18-3-8z"/></svg>{locating?'Finding your location…':'Use my location'}</button>
   <div className="ddNearbyActions"><label htmlFor={id+'-radius'}>Within<select id={id+'-radius'} disabled={state.busy} value={radius} onChange={event=>{const next=Number(event.target.value);setRadius(next);action({type:'radius',radius:next})}}>{radii.map(miles=><option key={miles} value={miles}>{miles} miles</option>)}</select></label><button type="submit" className="ddNearbyFind" disabled={state.busy||locating||!loaded}><Icon name="search"/>{state.busy?'Finding jobs…':'Find jobs'}</button></div>
   {message&&<p id={id+'-notice'} className="ddNearbyNotice" role="status">{message}</p>}
  </form>
  <p className="ddNearbyChooseHint" hidden={!choosing}>Choose a location to find nearby collections.</p>
  <div className="ddNearbyResults" hidden={choosing} aria-live="polite"><strong>{!loaded?'Loading jobs…':state.active?`${state.count} ${state.count===1?'job':'jobs'} within ${state.radius} miles`:`${state.count} ${state.count===1?'job':'jobs'} available`}</strong>{state.active&&<span>of {state.origin}</span>}{state.active&&state.unlocated>0&&<small>{state.unlocated} {state.unlocated===1?'collection location could':'collection locations could'} not be checked.</small>}</div>
  <div className="ddNearbyToolbar" hidden={choosing}><select data-mobile-job-sort="true" aria-label="Sort jobs" defaultValue="COLLECTION_DATE"><option value="COLLECTION_DATE">Soonest first</option><option value="NEAREST">Nearest collection</option><option value="NEWEST">Newest request</option></select><button type="button" aria-expanded={filtersOpen} aria-controls="dd-job-filters" onClick={onToggleFilters}><Icon name="filter"/>Filters</button></div>
  {loaded&&state.total>0&&state.count===0&&!state.busy&&<div className="ddNearbyEmpty" role="status"><strong>No jobs match your search</strong><p>{state.active?'Try a wider radius or clear your filters.':'Try another vehicle or transport type.'}</p><div>{state.active&&state.radius<200&&<button type="button" onClick={()=>action({type:'radius',radius:radii.find(value=>value>state.radius)})}>Increase to {radii.find(value=>value>state.radius)} miles</button>}<button type="button" onClick={()=>{clear();action({type:'reset'})}}>Clear filters</button></div></div>}
 </div>;
}
