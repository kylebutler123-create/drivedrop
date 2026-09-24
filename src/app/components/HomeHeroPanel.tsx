'use client';

import {vehicleTypes} from '@/lib/vehicle-types';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {FormEvent,useEffect,useState} from 'react';

type HeroView='quotes'|'customer'|'transporter';

const viewClass:Record<HeroView,string>={
  quotes:'showQuotes',
  customer:'showCustomerLogin',
  transporter:'showTransporterLogin',
};

export default function HomeHeroPanel(){
  const router=useRouter();
  const[view,setView]=useState<HeroView>('quotes');
  const[error,setError]=useState('');
  const[showPassword,setShowPassword]=useState(false);
  const[submitting,setSubmitting]=useState(false);

  function show(next:HeroView){
    setError('');
    setShowPassword(false);
    setView(next);
  }

  useEffect(()=>{
    const selectLogin=(event:MouseEvent)=>{
      if(!window.matchMedia('(min-width: 761px)').matches||window.location.pathname!=='/')return;
      const link=(event.target as Element|null)?.closest<HTMLAnchorElement>('.guestPrimaryNav a[href^="/login?account="]');
      if(!link)return;
      const account=new URL(link.href,window.location.href).searchParams.get('account');
      if(account!=='customer'&&account!=='transporter')return;
      event.preventDefault();
      show(account);
    };
    document.addEventListener('click',selectLogin);
    return()=>document.removeEventListener('click',selectLogin);
  },[]);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(submitting)return;
    setSubmitting(true);
    setError('');
    try{
      const form=new FormData(event.currentTarget);
      const response=await fetch('/api/auth/login',{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify(Object.fromEntries(form)),
      });
      const result=await response.json().catch(()=>null);
      if(!response.ok){
        setError(typeof result?.error==='string'?result.error:'Unable to sign in. Please try again.');
        return;
      }
      const destination=result?.role==='CUSTOMER'?'/customer':result?.role==='TRANSPORTER'?'/transporter':result?.role==='ADMIN'?'/admin':null;
      if(!destination){
        setError('Unable to confirm this account. Please try again.');
        return;
      }
      router.push(destination);
      router.refresh();
    }catch{
      setError('The connection was interrupted. Please try again.');
    }finally{
      setSubmitting(false);
    }
  }

  return <div className="homeHeroPanelShell">
    <div className={`homeHeroPanelTrack ${viewClass[view]}`}>
      <div className="quotePanel floatingPanel homeHeroPanelSlide" aria-hidden={view!=='quotes'} inert={view!=='quotes'}>
        <div className="quotePanelHeader"><strong>Get vehicle transport quotes</strong><span>Takes about 60 seconds</span></div>
        <form action="/register" className="quoteForm">
          <input type="hidden" name="account" value="customer"/>
          <label>VEHICLE TYPE</label>
          <select name="vehicleType" defaultValue="Car">{vehicleTypes.map(type=><option key={type} value={type}>{type}</option>)}</select>
          <div className="quoteGrid">
            <div><label>COLLECTION POSTCODE</label><input name="collection" placeholder="e.g. M1 1AA"/></div>
            <div><label>DELIVERY POSTCODE</label><input name="delivery" placeholder="e.g. BS1 1AA"/></div>
          </div>
          <button type="submit" className="btn orange quoteCta">Get My Quotes</button>
          <p className="quoteSmall">No payment required to request quotes.</p>
        </form>
      </div>
      <LoginPanel account="customer" active={view==='customer'} error={error} submitting={submitting} showPassword={showPassword} onBack={()=>show('quotes')} onSwitch={show} onSubmit={submit} onTogglePassword={()=>setShowPassword(value=>!value)}/>
      <LoginPanel account="transporter" active={view==='transporter'} error={error} submitting={submitting} showPassword={showPassword} onBack={()=>show('quotes')} onSwitch={show} onSubmit={submit} onTogglePassword={()=>setShowPassword(value=>!value)}/>
    </div>
  </div>;
}

function LoginPanel({account,active,error,submitting,showPassword,onBack,onSwitch,onSubmit,onTogglePassword}:{
  account:'customer'|'transporter';
  active:boolean;
  error:string;
  submitting:boolean;
  showPassword:boolean;
  onBack:()=>void;
  onSwitch:(view:HeroView)=>void;
  onSubmit:(event:FormEvent<HTMLFormElement>)=>void;
  onTogglePassword:()=>void;
}){
  const transporter=account==='transporter';
  return <section className="quotePanel floatingPanel homeHeroPanelSlide homeLoginPanel" aria-hidden={!active} inert={!active}>
    <div className="homeLoginTop">
      <button type="button" className="homeLoginBack" onClick={onBack}>← Back to quotes</button>
      <span>Secure access</span>
    </div>
    <div className="homeLoginHeading">
      <strong>{transporter?'Transporter login':'Customer login'}</strong>
      <p>{transporter?'Manage quotes, deliveries and your transporter profile.':'Manage transport requests, quotes and deliveries.'}</p>
    </div>
    <div className="homeLoginSwitch" aria-label="Choose account type">
      <button type="button" className={!transporter?'active':''} aria-pressed={!transporter} onClick={()=>onSwitch('customer')}>Customer</button>
      <button type="button" className={transporter?'active':''} aria-pressed={transporter} onClick={()=>onSwitch('transporter')}>Transporter</button>
    </div>
    <form onSubmit={onSubmit} aria-busy={submitting}>
      <div className="field">
        <label htmlFor={`home-${account}-email`}>EMAIL</label>
        <input id={`home-${account}-email`} type="email" name="email" autoComplete="email" placeholder="you@example.com" disabled={submitting} required/>
      </div>
      <div className="field">
        <div className="homePasswordLabel">
          <label htmlFor={`home-${account}-password`}>PASSWORD</label>
          <Link href={`/forgot-password?account=${account}`}>Forgot password?</Link>
        </div>
        <div className="password-wrap">
          <input id={`home-${account}-password`} type={showPassword?'text':'password'} name="password" autoComplete="current-password" placeholder="Your password" disabled={submitting} required/>
          <button type="button" className="password-toggle" onClick={onTogglePassword} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?'Hide':'Show'}</button>
        </div>
      </div>
      {active&&error&&<div className="formNotice errorNotice" role="alert">{error}</div>}
      <button type="submit" className="btn orange homeLoginSubmit" disabled={submitting}>{submitting?'Signing in…':'Sign in securely'}</button>
    </form>
    <div className="homeLoginCreate">
      <span>New to DriveDrop?</span>
      <Link href={transporter?'/register?account=transporter':'/register?account=customer'}>{transporter?'Create transporter account':'Create customer account'} →</Link>
    </div>
  </section>;
}
