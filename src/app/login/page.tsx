'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect,useState} from 'react';

export default function Login(){
  const router=useRouter();
  const [account,setAccount]=useState<string|null>(null);
  const [err,setErr]=useState('');
  const [showPassword,setShowPassword]=useState(false);

  useEffect(()=>{setAccount(new URLSearchParams(window.location.search).get('account'));},[]);
  const heading=account==='transporter'?'Welcome back, transporter':account==='customer'?'Welcome back':'Welcome back to DriveDrop';
  const intro=account==='transporter'?'Sign in to manage quotes, verification, active deliveries and earnings.':account==='customer'?'Sign in to manage your vehicle transport requests, quotes and bookings.':'Customers and transporters use the same secure DriveDrop sign-in.';

  async function submit(e:any){e.preventDefault();setErr('');const f=new FormData(e.currentTarget);const res=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(Object.fromEntries(f))});const d=await res.json();if(!res.ok)return setErr(d.error);router.push(d.role==='CUSTOMER'?'/customer':d.role==='TRANSPORTER'?'/transporter':'/admin');router.refresh();}

  return <main className="authPage"><section className="authVisual"><div className="authOverlay"/><div className="authVisualContent"><Link className="authBrand" href="/">Drive<span>Drop</span></Link><span className="dashboardEyebrow">Secure vehicle transport marketplace</span><h1>Move vehicles with confidence.</h1><p>One trusted place for customers and verified transporters to manage quotes, bookings, payments and delivery evidence.</p><div className="authTrust"><span>✓ Verified transporters</span><span>✓ Secure evidence</span><span>✓ Clear delivery tracking</span></div></div></section><section className="authPanel"><div className="authCard"><Link className="backLink" href="/">← Back to DriveDrop</Link><div className="authHeading"><span className="dashboardEyebrow dark">Account access</span><h2>{heading}</h2><p>{intro}</p></div><form onSubmit={submit}><div className="field"><label>EMAIL ADDRESS</label><input type="email" name="email" autoComplete="email" placeholder="you@example.com" required/></div><div className="field"><label>PASSWORD</label><div className="password-wrap"><input type={showPassword?'text':'password'} name="password" autoComplete="current-password" placeholder="Enter your password" required/><button type="button" className="password-toggle" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?'Hide':'Show'}</button></div></div>{err&&<div className="formNotice errorNotice">{err}</div>}<button className="btn orange authSubmit">Sign in securely</button></form><div className="authDivider"><span>New to DriveDrop?</span></div><Link className="authSecondary" href={account==='transporter'?'/register?account=transporter':'/register'}>{account==='transporter'?'Create transporter account':'Create an account'} →</Link><p className="authFootnote">Your account access is protected by DriveDrop’s secure sign-in system.</p></div></section></main>;
}
