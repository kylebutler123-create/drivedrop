'use client';

import Link from 'next/link';
import {useRouter,useSearchParams} from 'next/navigation';
import {useState} from 'react';

export default function Login(){
  const router=useRouter();
  const searchParams=useSearchParams();
  const account=searchParams.get('account');
  const emailChange=searchParams.get('emailChange');
  const accountClosed=searchParams.get('accountClosed');
  const changedEmail=searchParams.get('email')||'';
  const [err,setErr]=useState('');
  const [showPassword,setShowPassword]=useState(false);

  const heading=account==='transporter'?'Transporter login':account==='customer'?'Customer login':'Welcome back';
  const intro=account==='transporter'?'Sign in to manage your transporter profile, verification and delivery work.':account==='customer'?'Sign in to manage your vehicle transport requests and quotes.':'Customers and transporters use the same secure DriveDrop sign-in.';
  const isTransporter=account==='transporter';
  const emailNotice=emailChange==='confirmed'?'Your email address has been verified and updated. Sign in using your new email address.':emailChange==='taken'?'That email address is already linked to another DriveDrop account.':emailChange==='invalid'?'That email verification link is invalid or has expired. Please request a new one from your Account page.':null;

  async function submit(e:any){e.preventDefault();setErr('');const f=new FormData(e.currentTarget);const res=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(Object.fromEntries(f))});const d=await res.json();if(!res.ok)return setErr(d.error);router.push(d.role==='CUSTOMER'?'/customer':d.role==='TRANSPORTER'?'/transporter':'/admin');router.refresh();}

  return <main className="authShell"><section className="authVisual"><div className="authVisualOverlay"/><div className="authVisualContent"><span className="eyebrow">UK VEHICLE TRANSPORT</span><h2>{isTransporter?'Keep your transport business moving.':'Move your vehicle with confidence.'}</h2><p>{isTransporter?'Quote for suitable jobs, manage live deliveries and keep customers updated from one workspace.':'Compare transporter quotes, manage your booking and follow every stage of the delivery.'}</p><div className="authTrust"><span>✓ Verified transporters</span><span>✓ Secure delivery evidence</span><span>✓ Clear booking progress</span></div></div></section><section className="authFormSide"><div className="authCard"><div style={{display:'flex',flexDirection:'column',alignItems:'flex-start',gap:'18px',marginBottom:'10px'}}><Link className="authBack" href="/">← Back to DriveDrop</Link><span className="dashboardEyebrow dark">Secure account access</span></div><h1>{heading}</h1><p className="authIntro">{intro}</p>{accountClosed==='1'&&<div className="formNotice">Your DriveDrop account has been closed and you have been signed out.</div>}{emailNotice&&<div className={`formNotice${emailChange==='confirmed'?'':' errorNotice'}`}>{emailNotice}</div>}<div className="accountSwitch"><Link className={!isTransporter?'active':''} href="/login?account=customer">Customer</Link><Link className={isTransporter?'active':''} href="/login?account=transporter">Transporter</Link></div><form onSubmit={submit}><div className="field"><label>EMAIL</label><input type="email" name="email" autoComplete="email" placeholder="you@example.com" defaultValue={changedEmail} required/></div><div className="field"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'12px'}}><label>PASSWORD</label><Link href={`/forgot-password${account?`?account=${account}`:''}`} style={{fontSize:'12px',fontWeight:800,color:'#c85c0b'}}>Forgot password?</Link></div><div className="password-wrap"><input type={showPassword?'text':'password'} name="password" autoComplete="current-password" placeholder="Your password" required/><button type="button" className="password-toggle" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?'Hide':'Show'}</button></div></div>{err&&<div className="formNotice errorNotice">{err}</div>}<button className="btn orange authSubmit">Sign in securely</button></form><div className="authDivider"><span>New to DriveDrop?</span></div><Link className="authSecondary" href={isTransporter?'/register?account=transporter':'/register?account=customer'}>{isTransporter?'Create transporter account':'Create customer account'} →</Link><p className="authFinePrint">Your account credentials are handled securely by DriveDrop.</p></div></section></main>;
}
