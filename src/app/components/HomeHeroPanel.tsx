'use client';

import {vehicleTypes} from '@/lib/vehicle-types';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {FormEvent,useEffect,useState} from 'react';

type HeroView='quotes'|'customer'|'transporter'|'registerCustomer'|'registerTransporter';

const viewClass:Record<HeroView,string>={
  quotes:'showQuotes',
  customer:'showCustomerLogin',
  transporter:'showTransporterLogin',
  registerCustomer:'showRegister showRegisterCustomer',
  registerTransporter:'showRegister showRegisterTransporter',
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
      if(!window.matchMedia('(min-width: 761px)').matches||window.location.pathname!=='/'||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const link=(event.target as Element|null)?.closest<HTMLAnchorElement>('a[data-home-hero-view], .guestPrimaryNav a[href^="/login?account="]');
      if(!link)return;
      const next=link.dataset.homeHeroView??new URL(link.href,window.location.href).searchParams.get('account');
      if(next!=='quotes'&&next!=='customer'&&next!=='transporter'&&next!=='registerCustomer'&&next!=='registerTransporter')return;
      event.preventDefault();
      event.stopPropagation();
      show(next);
      window.scrollTo(0,0);
    };
    // Capture before Next Link's delegated click handler can start navigation.
    document.addEventListener('click',selectLogin,true);
    return()=>document.removeEventListener('click',selectLogin,true);
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

  async function register(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(submitting)return;
    setSubmitting(true);
    setError('');
    try{
      const form=new FormData(event.currentTarget);
      const response=await fetch('/api/auth/register',{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify(Object.fromEntries(form)),
      });
      const result=await response.json().catch(()=>null);
      if(!response.ok){
        setError(typeof result?.error==='string'?result.error:'Unable to create your account. Please try again.');
        return;
      }
      const destination=result?.role==='CUSTOMER'?'/customer':result?.role==='TRANSPORTER'?'/transporter':null;
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

  const registering=view==='registerCustomer'||view==='registerTransporter';
  return <div className={`homeHeroPanelShell${registering?' isRegistration':''}`}>
    <div className={`homeHeroPanelTrack ${viewClass[view]}`}>
      <div className="quotePanel floatingPanel homeHeroPanelSlide" aria-hidden={view!=='quotes'} inert={view!=='quotes'}>
        <div className="quotePanelHeader"><strong>Get vehicle transport quotes</strong><span>Takes about 60 seconds</span></div>
        <form action="/register" className="quoteForm">
          <input type="hidden" name="account" value="customer"/>
          <div className="quoteVehicleField">
            <label>VEHICLE TYPE</label>
            <select name="vehicleType" defaultValue="Car">{vehicleTypes.map(type=><option key={type} value={type}>{type}</option>)}</select>
          </div>
          <div className="quoteGrid">
            <div><label>COLLECTION POSTCODE</label><input name="collection" placeholder="e.g. M1 1AA"/></div>
            <div><label>DELIVERY POSTCODE</label><input name="delivery" placeholder="e.g. BS1 1AA"/></div>
          </div>
          <button type="submit" className="btn orange quoteCta">Get My Quotes</button>
          <p className="quoteSmall">No payment required to request quotes.</p>
        </form>
      </div>
      <LoginPanel account="customer" active={view==='customer'} error={error} submitting={submitting} showPassword={showPassword} onBack={()=>show('quotes')} onSwitch={show} onCreate={()=>show('registerCustomer')} onSubmit={submit} onTogglePassword={()=>setShowPassword(value=>!value)}/>
      <LoginPanel account="transporter" active={view==='transporter'} error={error} submitting={submitting} showPassword={showPassword} onBack={()=>show('quotes')} onSwitch={show} onCreate={()=>show('registerTransporter')} onSubmit={submit} onTogglePassword={()=>setShowPassword(value=>!value)}/>
      <RegisterPanel account={view==='registerTransporter'?'transporter':'customer'} active={registering} error={error} submitting={submitting} showPassword={showPassword} onBack={()=>show(view==='registerTransporter'?'transporter':'customer')} onSwitch={show} onSubmit={register} onTogglePassword={()=>setShowPassword(value=>!value)}/>
    </div>
  </div>;
}

function LoginPanel({account,active,error,submitting,showPassword,onBack,onSwitch,onCreate,onSubmit,onTogglePassword}:{
  account:'customer'|'transporter';
  active:boolean;
  error:string;
  submitting:boolean;
  showPassword:boolean;
  onBack:()=>void;
  onSwitch:(view:HeroView)=>void;
  onCreate:()=>void;
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
      <button type="button" onClick={onCreate}>{transporter?'Create transporter account':'Create customer account'} →</button>
    </div>
  </section>;
}

function RegisterPanel({account,active,error,submitting,showPassword,onBack,onSwitch,onSubmit,onTogglePassword}:{
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
  return <section className="quotePanel floatingPanel homeHeroPanelSlide homeRegisterPanel" aria-hidden={!active} inert={!active}>
    <div className="homeLoginTop">
      <button type="button" className="homeLoginBack" onClick={onBack}>← Back to login</button>
      <span>Create account</span>
    </div>
    <div className="homeLoginHeading">
      <strong>{transporter?'Join as a transporter':'Create customer account'}</strong>
      <p>{transporter?'Set up your account, then complete verification from your dashboard.':'Request quotes and manage your vehicle deliveries.'}</p>
    </div>
    <div className="homeLoginSwitch" aria-label="Choose account type">
      <button type="button" className={!transporter?'active':''} aria-pressed={!transporter} onClick={()=>onSwitch('registerCustomer')}>Customer</button>
      <button type="button" className={transporter?'active':''} aria-pressed={transporter} onClick={()=>onSwitch('registerTransporter')}>Transporter</button>
    </div>
    <form onSubmit={onSubmit} aria-busy={submitting}>
      <input type="hidden" name="role" value={transporter?'TRANSPORTER':'CUSTOMER'}/>
      <div className="field">
        <label htmlFor="home-register-name">NAME / BUSINESS NAME</label>
        <input id="home-register-name" name="name" placeholder={transporter?'Your name or business name':'Your name'} disabled={submitting} required minLength={2}/>
      </div>
      <div className="field">
        <label htmlFor="home-register-email">EMAIL ADDRESS</label>
        <input id="home-register-email" type="email" name="email" autoComplete="email" placeholder="you@example.com" disabled={submitting} required/>
      </div>
      {!transporter&&<div className="field">
        <label htmlFor="home-register-phone">PHONE NUMBER</label>
        <input id="home-register-phone" type="tel" name="phone" autoComplete="tel" inputMode="tel" placeholder="Your contact number" minLength={7} maxLength={30} disabled={submitting} required/>
      </div>}
      <div className="field">
        <label htmlFor="home-register-password">PASSWORD</label>
        <div className="password-wrap">
          <input id="home-register-password" type={showPassword?'text':'password'} name="password" autoComplete="new-password" placeholder="Minimum 8 characters" minLength={8} disabled={submitting} required/>
          <button type="button" className="password-toggle" onClick={onTogglePassword} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?'Hide':'Show'}</button>
        </div>
      </div>
      {active&&error&&<div className="formNotice errorNotice" role="alert">{error}</div>}
      <button type="submit" className="btn orange homeLoginSubmit" disabled={submitting}>{submitting?'Creating account…':'Create my account'}</button>
    </form>
    <div className="homeLoginCreate">
      <span>Already registered?</span>
      <button type="button" onClick={onBack}>Sign in →</button>
    </div>
  </section>;
}
