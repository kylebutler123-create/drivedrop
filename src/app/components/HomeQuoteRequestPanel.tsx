'use client';

import {FormEvent,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import AddressAutocomplete from './AddressAutocomplete';
import {vehicleTypes} from '@/lib/vehicle-types';
import {transportTypes} from '@/lib/transport-types';
import {enclosedTransportCompatibilityMessage,isTransportVehicleCompatible} from '@/lib/transport-compatibility';

type Props={expanded:boolean;onExpandChange:(expanded:boolean)=>void};
type AccountMode='create'|'login';

export default function HomeQuoteRequestPanel({expanded,onExpandChange}:Props){
  const router=useRouter();
  const [accountMode,setAccountMode]=useState<AccountMode>('create');
  const [authenticated,setAuthenticated]=useState(false);
  const [showPassword,setShowPassword]=useState(false);
  const [submitting,setSubmitting]=useState(false);
  const [error,setError]=useState('');
  const requestInFlight=useRef(false);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!expanded){onExpandChange(true);return}
    if(requestInFlight.current)return;
    const form=event.currentTarget;
    if(!form.reportValidity())return;
    const fields=new FormData(form);
    if(!isTransportVehicleCompatible(fields.get('transportType'),fields.get('vehicleType'))){
      setError(enclosedTransportCompatibilityMessage);
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
        collectionDate:fields.get('collectionDate'),
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

  return <>
    <div className="quotePanelHeader homeQuoteHeading">
      <div><strong>Get vehicle transport quotes</strong><span>Takes about 60 seconds</span></div>
      <button type="button" className="homeQuoteExpand" aria-expanded={expanded} aria-controls="home-quote-extra" disabled={submitting} onClick={()=>{setError('');onExpandChange(!expanded)}}>{expanded?'Collapse ↑':'Expand ↓'}</button>
    </div>
    <form className="quoteForm homeQuoteForm" onSubmit={submit} aria-busy={submitting}>
      <div className="quoteVehicleField">
        <label htmlFor="home-quote-vehicle-type">VEHICLE TYPE</label>
        <select id="home-quote-vehicle-type" name="vehicleType" defaultValue="Car" required disabled={submitting}>{vehicleTypes.map(type=><option key={type} value={type}>{type}</option>)}</select>
      </div>
      <div className="quoteGrid homeQuoteLocations">
        <AddressAutocomplete name="collection" label="COLLECTION"/>
        <AddressAutocomplete name="delivery" label="DELIVERY"/>
      </div>
      <div id="home-quote-extra" className="homeQuoteExtra" hidden={!expanded}>
        <div className="homeQuoteSection">
          <strong>Vehicle & collection details</strong>
          <div className="homeQuoteFieldGrid">
            <div className="field homeQuoteWide"><label htmlFor="home-quote-date">COLLECTION DATE</label><input id="home-quote-date" type="date" name="collectionDate" required={expanded} disabled={submitting}/></div>
            <div className="field homeQuoteWide"><label htmlFor="home-quote-transport-type">TRANSPORT TYPE</label><select id="home-quote-transport-type" name="transportType" defaultValue="" required={expanded} disabled={submitting}><option value="" disabled>Select transport type</option>{transportTypes.map(type=><option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
            <div className="field"><label htmlFor="home-quote-make">MAKE</label><input id="home-quote-make" name="vehicleMake" required={expanded} disabled={submitting}/></div>
            <div className="field"><label htmlFor="home-quote-model">MODEL</label><input id="home-quote-model" name="vehicleModel" required={expanded} disabled={submitting}/></div>
            <div className="field"><label htmlFor="home-quote-registration">REGISTRATION</label><input id="home-quote-registration" name="registration" maxLength={20} placeholder="e.g. AB12 CDE" autoCapitalize="characters" disabled={submitting}/></div>
            <div className="field"><label htmlFor="home-quote-running">RUNNING?</label><select id="home-quote-running" name="running" defaultValue="true" disabled={submitting}><option value="true">Runs and drives</option><option value="false">Non-running</option></select></div>
          </div>
        </div>
        <div className="homeQuoteSection">
          <strong>Your customer account</strong>
          {authenticated?<p className="homeQuoteAccountReady">Customer account ready. Your request can now be submitted.</p>:<>
            <div className="homeQuoteAccountTabs" role="group" aria-label="Customer account access">
              <button type="button" className={accountMode==='create'?'active':''} aria-pressed={accountMode==='create'} onClick={()=>{setAccountMode('create');setError('')}}>Create account</button>
              <button type="button" className={accountMode==='login'?'active':''} aria-pressed={accountMode==='login'} onClick={()=>{setAccountMode('login');setError('')}}>Login</button>
            </div>
            <div className="homeQuoteFieldGrid">
              {accountMode==='create'&&<>
                <div className="field"><label htmlFor="home-quote-name">NAME</label><input id="home-quote-name" name="name" minLength={2} required={expanded} disabled={submitting}/></div>
                <div className="field"><label htmlFor="home-quote-phone">PHONE NUMBER</label><input id="home-quote-phone" type="tel" name="phone" autoComplete="tel" inputMode="tel" minLength={7} maxLength={30} required={expanded} disabled={submitting}/></div>
              </>}
              <div className={`field${accountMode==='login'?' homeQuoteWide':''}`}><label htmlFor="home-quote-email">EMAIL ADDRESS</label><input id="home-quote-email" type="email" name="email" autoComplete="email" required={expanded} disabled={submitting}/></div>
              <div className={`field${accountMode==='login'?' homeQuoteWide':''}`}><label htmlFor="home-quote-password">PASSWORD</label><div className="password-wrap"><input id="home-quote-password" type={showPassword?'text':'password'} name="password" autoComplete={accountMode==='login'?'current-password':'new-password'} minLength={accountMode==='create'?8:undefined} required={expanded} disabled={submitting}/><button type="button" className="password-toggle" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?'Hide':'Show'}</button></div></div>
              {accountMode==='create'&&<div className="field homeQuoteWide"><label htmlFor="home-quote-account-type">ACCOUNT TYPE</label><select id="home-quote-account-type" disabled defaultValue="CUSTOMER"><option value="CUSTOMER">Customer</option></select></div>}
            </div>
          </>}
        </div>
        {authenticated&&error&&<Link className="homeQuoteRequestLink" href="/customer?view=quotes">Check Your quote requests →</Link>}
      </div>
      {error&&<div className="formNotice errorNotice homeQuoteError" role="alert">{error}</div>}
      <button type={expanded?'submit':'button'} className="btn orange quoteCta" disabled={submitting} onClick={expanded?undefined:()=>onExpandChange(true)}>{submitting?'Submitting request…':'Get My Quotes'}</button>
      <p className="quoteSmall">No payment required to request quotes.</p>
    </form>
  </>;
}
