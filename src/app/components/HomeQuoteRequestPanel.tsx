'use client';
import CollectionWindowFields from './CollectionWindowFields';

import {FormEvent,useEffect,useLayoutEffect,useRef,useState} from 'react';
import Link from 'next/link';
import '../home-quote-approved-polish.css';
import {useRouter} from 'next/navigation';
import {createPortal} from 'react-dom';
import AddressAutocomplete from './AddressAutocomplete';
import {vehicleTypes} from '@/lib/vehicle-types';
import {transportTypes} from '@/lib/transport-types';
import {enclosedTransportCompatibilityMessage,isTransportVehicleCompatible} from '@/lib/transport-compatibility';

type Props={expanded:boolean;onExpandChange:(expanded:boolean)=>void;wizard?:boolean};
type AccountMode='create'|'login';

function CollectionDatePicker({value,onChange,disabled}:{value:string;onChange:(date:string)=>void;disabled:boolean}){
  const [open,setOpen]=useState(false);
  const [month,setMonth]=useState(()=>{const today=new Date();return new Date(today.getFullYear(),today.getMonth(),1)});
  const [position,setPosition]=useState({top:0,left:0});
  const container=useRef<HTMLDivElement>(null);
  const popup=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    if(!open)return;
    const place=()=>{
      const rect=container.current?.getBoundingClientRect();
      if(!rect)return;
      const width=popup.current?.offsetWidth??250;
      const height=popup.current?.offsetHeight??250;
      const roomBelow=window.innerHeight-rect.bottom-12;
      const roomAbove=rect.top-12;
      const preferredTop=roomBelow>=height||roomBelow>=roomAbove?rect.bottom+6:rect.top-height-6;
      setPosition({top:Math.max(12,Math.min(preferredTop,window.innerHeight-height-12)),left:Math.max(12,Math.min(rect.left,window.innerWidth-width-12))});
    };
    place();
    window.addEventListener('resize',place);
    document.addEventListener('scroll',place,true);
    return()=>{window.removeEventListener('resize',place);document.removeEventListener('scroll',place,true)};
  },[open,month]);
  useEffect(()=>{
    if(!open)return;
    const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!container.current?.contains(event.target)&&!popup.current?.contains(event.target))setOpen(false)};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};
    document.addEventListener('pointerdown',outside);
    document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)};
  },[open]);
  const firstDay=(new Date(month.getFullYear(),month.getMonth(),1).getDay()+6)%7;
  const days=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  const label=value?new Date(`${value}T12:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'Select date';
  return <div className="field homeQuoteCalendarField" ref={container}>
    <span className="homeQuoteFieldLabel" id="home-quote-date-label"><span className="homeQuoteDateLegacyLabel">COLLECTION DATE</span><span className="homeQuoteDatePolishLabel">Collection date</span></span>
    <input type="hidden" name="collectionDate" value={value}/>
    <button type="button" className="homeQuoteDateButton" aria-label={`Collection date: ${label}`} aria-expanded={open} aria-haspopup="dialog" onClick={()=>setOpen(current=>!current)} disabled={disabled}>{label}<span aria-hidden="true">▦</span></button>
    {open&&createPortal(<div ref={popup} className="homeQuoteCalendar" role="dialog" aria-label="Choose collection date" style={position}>
      <div className="homeQuoteCalendarHeader"><button type="button" aria-label="Previous month" onClick={()=>setMonth(current=>new Date(current.getFullYear(),current.getMonth()-1,1))}>‹</button><strong>{month.toLocaleDateString('en-GB',{month:'long',year:'numeric'})}</strong><button type="button" aria-label="Next month" onClick={()=>setMonth(current=>new Date(current.getFullYear(),current.getMonth()+1,1))}>›</button></div>
      <div className="homeQuoteCalendarDays">{['M','T','W','T','F','S','S'].map((day,index)=><span key={index} aria-hidden="true">{day}</span>)}{Array.from({length:firstDay},(_,index)=><span key={`empty-${index}`}/>)}{Array.from({length:days},(_,index)=>{const day=index+1;const date=`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;return <button type="button" key={day} aria-label={new Date(`${date}T12:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})} aria-pressed={value===date} onClick={()=>{onChange(date);setOpen(false)}}>{day}</button>})}</div>
    </div>,document.body)}
  </div>;
}

export default function HomeQuoteRequestPanel({expanded,onExpandChange,wizard=false}:Props){
  const router=useRouter();
  const [desktop,setDesktop]=useState(false);
  useEffect(()=>{const media=window.matchMedia('(min-width:1024px)');const sync=()=>setDesktop(media.matches);sync();media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync)},[]);
  const polished=desktop&&!wizard;
  const fieldLabel=(label:string)=>polished?label:label.toUpperCase();
  const [step,setStep]=useState(1);
  const [draft,setDraft]=useState<Record<string,string>>({});
  const formRef=useRef<HTMLFormElement>(null);
  function updateDraft(){if(formRef.current)setDraft(Object.fromEntries(Array.from(new FormData(formRef.current).entries()).map(([key,value])=>[key,String(value)])))}
  function nextStep(){
    const names=step===1?['collection','delivery']:step===2?['vehicleType','vehicleMake','vehicleModel','running']:step===3?['transportType']:[];
    for(const name of names){const input=formRef.current?.elements.namedItem(name);if(input instanceof HTMLInputElement||input instanceof HTMLSelectElement){if(!input.reportValidity())return}}
    if(step===1&&!collectionDate){setError('Choose a collection date from the calendar.');return}
    if(step===3&&incompatible){setError(enclosedTransportCompatibilityMessage);return}
    updateDraft();setError('');setStep(current=>Math.min(4,current+1));
  }
  const [accountMode,setAccountMode]=useState<AccountMode>('create');
  const [authenticated,setAuthenticated]=useState(false);
  const [showPassword,setShowPassword]=useState(false);
  const [submitting,setSubmitting]=useState(false);
  const [error,setError]=useState('');
  const [vehicleType,setVehicleType]=useState<string>('');
  const [transportType,setTransportType]=useState<string>('');
  const [collectionDate,setCollectionDate]=useState('');
  const requestInFlight=useRef(false);
  const incompatible=transportType!==''&&vehicleType!==''&&!isTransportVehicleCompatible(transportType,vehicleType);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(wizard&&window.matchMedia('(min-width:1024px)').matches&&step<4){nextStep();return}
    if(!expanded){onExpandChange(true);return}
    if(requestInFlight.current)return;
    const form=event.currentTarget;
    if(!form.reportValidity())return;
    if(!collectionDate){setError('Choose a collection date from the calendar.');return}
    const fields=new FormData(form);
    if(!isTransportVehicleCompatible(fields.get('transportType'),fields.get('vehicleType'))){
      return;
    }
    requestInFlight.current=true;
    setSubmitting(true);
    setError('');
    let accountReady=authenticated;
    try{
      if(!authenticated){
        const path=accountMode==='create'?'/api/auth/register':'/api/auth/login';
        const account=accountMode==='create'
          ?{name:fields.get('name'),phone:fields.get('phone'),email:fields.get('email'),password:fields.get('password'),role:'CUSTOMER'}
          :{email:fields.get('email'),password:fields.get('password')};
        const response=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(account)});
        const result=await response.json().catch(()=>null);
        if(!response.ok){
          setError(typeof result?.error==='string'?result.error:'We could not access your account. Check your details and try again.');
          return;
        }
        if(result?.role!=='CUSTOMER'){
          setError('Please use a customer account to request vehicle transport quotes.');
          return;
        }
        setAuthenticated(true);
        accountReady=true;
      }
      const job={
        collection:fields.get('collection'),
        delivery:fields.get('delivery'),
        collectionDate:fields.get('collectionDate'),collectionFrom:fields.get('collectionFrom')||undefined,collectionUntil:fields.get('collectionUntil')||undefined,
        transportType:fields.get('transportType'),
        vehicleType:fields.get('vehicleType'),
        vehicleMake:fields.get('vehicleMake'),
        vehicleModel:fields.get('vehicleModel'),
        registration:fields.get('registration')||'',
        running:fields.get('running')==='true',
      };
      const response=await fetch('/api/jobs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(job)});
      const result=await response.json().catch(()=>null);
      if(!response.ok||typeof result?.id!=='string'||result?.status!=='OPEN'){
        setError(response.status>=500?'We could not confirm whether your request was saved. Check Your quote requests before trying again.':typeof result?.error==='string'?result.error:'We could not submit your request. Check the details and try again.');
        return;
      }
      router.push('/customer?view=quotes');
      router.refresh();
    }catch{
      setError(accountReady?'We could not confirm whether your request was saved. Check Your quote requests before trying again.':'The connection was interrupted. If your account was created, choose Login before trying again.');
    }finally{
      requestInFlight.current=false;
      setSubmitting(false);
    }
  }

  const content = <>
    {wizard&&<div className="approvedWizard approvedWizardProgress" aria-label="Quote request progress">{['Delivery Details','Vehicle Details','Transport Type','Review & Quote'].map((label,index)=><div key={label} className={step===index+1?'current':step>index+1?'complete':''} aria-current={step===index+1?'step':undefined}><b>{step>index+1?'✓':index+1}</b><span>{label}</span></div>)}</div>}
    <nav className="desktopQuotePurpose" aria-label="Transport purpose">
      <span className="isActive"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m5 10 2-5h10l2 5M4 10h16v9H4zM7 19v2m10-2v2M6 14h3m6 0h3"/></svg>I need to move a vehicle</span>
      <Link href="/for-transporters" prefetch={false}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M2 5h12v12H2zM14 9h5l3 4v4h-8"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>I want to deliver vehicles</Link>
    </nav>
    <div className="quotePanelHeader homeQuoteHeading">
      <div><strong>Get vehicle transport quotes</strong><span>Takes about 60 seconds</span></div>
      <button type="button" className="homeQuoteExpand" aria-label={expanded?'Collapse account details':'Expand account details'} aria-expanded={expanded} aria-controls="home-quote-extra" disabled={submitting} onClick={()=>{setError('');onExpandChange(!expanded)}}>{expanded?'−':'+'}</button>
    </div>
    <form ref={formRef} noValidate={wizard} className="quoteForm homeQuoteForm homeQuoteApproved" onChange={wizard?updateDraft:undefined} onSubmit={submit} aria-busy={submitting}>
      {wizard&&<section className="approvedWizard approvedWizardReview"><h2>Review your request</h2>{[['collection','Collection'],['delivery','Delivery'],['vehicleType','Vehicle type'],['vehicleMake','Make'],['vehicleModel','Model'],['registration','Registration'],['running','Running condition'],['transportType','Transport type']].map(([key,label])=><div key={key}><span>{label}</span><strong>{key==='running'?(draft[key]==='true'?'Runs and drives':'Non-running'):key==='transportType'?transportTypes.find(type=>type.value===draft[key])?.label:draft[key]||'Not specified'}</strong></div>)}<div><span>Collection date</span><strong>{collectionDate?new Date(collectionDate+'T12:00:00').toLocaleDateString('en-GB'):'Not specified'}</strong></div><button type="button" className="btn light" onClick={()=>setStep(1)}>Edit request</button></section>}
      <div className="homeQuoteSection homeQuoteVehicle">
          <strong>Vehicle details</strong>
          <div className="homeQuoteFieldGrid">
            <div className="field homeQuoteWide"><label htmlFor="home-quote-vehicle-type">{fieldLabel('Vehicle type')}</label><select id="home-quote-vehicle-type" name="vehicleType" value={vehicleType} onChange={event=>setVehicleType(event.target.value)} required disabled={submitting}><option value="" disabled>Select vehicle type</option>{vehicleTypes.map(type=><option key={type} value={type}>{type}</option>)}</select></div>
            <div className="field"><label htmlFor="home-quote-make">{fieldLabel('Make')}</label><input id="home-quote-make" name="vehicleMake" placeholder={polished?'e.g. Ford':undefined} required disabled={submitting}/></div>
            <div className="field"><label htmlFor="home-quote-model">{fieldLabel('Model')}</label><input id="home-quote-model" name="vehicleModel" placeholder={polished?'e.g. Focus':undefined} required disabled={submitting}/></div>
            <div className="field"><label htmlFor="home-quote-registration">{fieldLabel('Registration')}</label><input id="home-quote-registration" name="registration" maxLength={20} placeholder="e.g. AB12 CDE" autoCapitalize="characters" disabled={submitting}/></div>
            <div className="field"><label htmlFor="home-quote-running">{fieldLabel('Running condition')}</label><select id="home-quote-running" name="running" defaultValue="" required disabled={submitting}><option value="" disabled>{polished?'Select running condition':'Select'}</option><option value="true">Runs and drives</option><option value="false">Non-running</option></select></div>
          </div>
      </div>
      <div className={`homeQuoteSection homeQuoteTransport${expanded?'':' desktopCompactLocations'}`}>
        <strong>{wizard&&step===3?'Transport Type':'Collection & delivery'}</strong>
        <div className="quoteGrid homeQuoteLocations">
          <AddressAutocomplete name="collection" label={fieldLabel('Collection')} desktopPlaceholder={!wizard?'Town or postcode':undefined}/>
          <AddressAutocomplete name="delivery" label={fieldLabel('Delivery')} desktopPlaceholder={!wizard?'Town or postcode':undefined}/>
        </div>
        <div className="homeQuoteFieldGrid homeQuoteDateTransport">
          <CollectionDatePicker value={collectionDate} onChange={date=>{setCollectionDate(date);setError('')}} disabled={submitting}/><CollectionWindowFields date={collectionDate}/>
          <div className="field"><label htmlFor="home-quote-transport-type">{fieldLabel('Transport type')}</label><select id="home-quote-transport-type" name="transportType" value={transportType} onChange={event=>setTransportType(event.target.value)} required disabled={submitting}><option value="" disabled>Select transport type</option>{transportTypes.map(type=><option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
        </div>
      </div>
      {expanded&&incompatible&&<div className="formNotice errorNotice homeQuoteCompatibility" role="alert">{enclosedTransportCompatibilityMessage}</div>}
      <div id="home-quote-extra" className="homeQuoteExtra" hidden={!expanded}>
        <div className="homeQuoteSection">
          <strong>Your customer account</strong>
          {authenticated?<p className="homeQuoteAccountReady">Customer account ready. Your request can now be submitted.</p>:<>
            <div className="homeQuoteAccountTabs" role="group" aria-label="Customer account access">
              <button type="button" className={accountMode==='create'?'active':''} aria-pressed={accountMode==='create'} onClick={()=>{setAccountMode('create');setError('')}}>Create account</button>
              <button type="button" className={accountMode==='login'?'active':''} aria-pressed={accountMode==='login'} onClick={()=>{setAccountMode('login');setError('')}}>Login</button>
            </div>
            <div className="homeQuoteFieldGrid">
              {accountMode==='create'&&<>
                <div className="field"><label htmlFor="home-quote-name">{fieldLabel('Name')}</label><input id="home-quote-name" name="name" placeholder={polished?'Your name':undefined} minLength={2} required={expanded} disabled={submitting}/></div>
                <div className="field"><label htmlFor="home-quote-phone">{fieldLabel('Phone number')}</label><input id="home-quote-phone" type="tel" name="phone" placeholder={polished?'Phone number':undefined} autoComplete="tel" inputMode="tel" minLength={7} maxLength={30} required={expanded} disabled={submitting}/></div>
              </>}
              <div className={`field${accountMode==='login'?' homeQuoteWide':''}`}><label htmlFor="home-quote-email">{fieldLabel('Email address')}</label><input id="home-quote-email" type="email" name="email" placeholder={polished?'Your email address':undefined} autoComplete="email" required={expanded} disabled={submitting}/></div>
              <div className={`field${accountMode==='login'?' homeQuoteWide':''}`}><label htmlFor="home-quote-password">{fieldLabel('Password')}</label><div className="password-wrap"><input id="home-quote-password" type={showPassword?'text':'password'} name="password" placeholder={polished?(accountMode==='create'?'Create a password':'Enter your password'):undefined} autoComplete={accountMode==='login'?'current-password':'new-password'} minLength={accountMode==='create'?8:undefined} required={expanded} disabled={submitting}/><button type="button" className="password-toggle" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?'Hide':'Show'}</button></div></div>
              {accountMode==='create'&&<div className="field homeQuoteWide"><label htmlFor="home-quote-account-type">{fieldLabel('Account type')}</label><select id="home-quote-account-type" disabled defaultValue="CUSTOMER"><option value="CUSTOMER">Customer</option></select></div>}
            </div>
          </>}
        </div>
        {authenticated&&error&&<Link className="homeQuoteRequestLink" href="/customer?view=quotes">Check Your quote requests →</Link>}
      </div>
      {error&&<div className="formNotice errorNotice homeQuoteError" role="alert">{error}</div>}
      {wizard&&<div className="approvedWizard approvedWizardControls"><button type="button" className="btn light" onClick={()=>step>1?setStep(current=>current-1):window.location.assign('/')}>← Back</button>{step<4&&<button type="button" className="btn orange" onClick={nextStep}>Continue →</button>}</div>}
      <button type={expanded?'submit':'button'} className="btn orange quoteCta" disabled={submitting} onClick={expanded?undefined:()=>onExpandChange(true)}>{submitting?'Submitting request…':'Get My Quotes'}</button>
      {!wizard&&<button type="button" className="homeQuoteExpand approvedInlineExpand" aria-label={expanded?'Collapse quote details':'Expand quote details'} aria-expanded={expanded} aria-controls="home-quote-extra" disabled={submitting} onClick={()=>{setError('');onExpandChange(!expanded)}}>{expanded?'−':'+'}</button>}
      <p className="quoteSmall">{polished?'Free quotes · No obligation':'No payment required to request quotes.'}</p>
    </form>
    {wizard&&<aside className="approvedQuoteSummary"><h2>Your Quote</h2><small>Step {step} of 4</small><hr/>{[['collection','Collection'],['delivery','Delivery'],['vehicleType','Vehicle'],['transportType','Transport type']].map(([key,label])=><div key={key}><strong>{label}</strong><span>{key==='transportType'?(transportTypes.find(type=>type.value===draft[key])?.label||'Not yet specified'):draft[key]||'Not yet specified'}</span></div>)}<p>Compare transport quotes<br/>in your customer account.</p></aside>}
  </>;
  return wizard?<div className="approvedWizardHost" data-step={step}>{content}</div>:content;
}

