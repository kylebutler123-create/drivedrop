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
  const heading=account==='transporter'?'Transporter login':account==='customer'?'Customer login':'Welcome back';
  const intro=account==='transporter'?'Sign in to manage your transporter profile, verification and delivery work.':account==='customer'?'Sign in to manage your vehicle transport requests and quotes.':'Customers and transporters use the same secure DriveDrop sign-in.';

  async function submit(e:any){e.preventDefault();setErr('');const f=new FormData(e.currentTarget);const res=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(Object.fromEntries(f))});const d=await res.json();if(!res.ok)return setErr(d.error);router.push(d.role==='CUSTOMER'?'/customer':d.role==='TRANSPORTER'?'/transporter':'/admin');router.refresh();}

  return <main className="shell"><div className="card" style={{maxWidth:520,margin:'auto'}}>
    <h1>{heading}</h1><p className="muted">{intro}</p>
    <form onSubmit={submit}>
      <div className="field"><label>EMAIL</label><input type="email" name="email" autoComplete="email" required/></div>
      <div className="field"><label>PASSWORD</label><div className="password-wrap"><input type={showPassword?'text':'password'} name="password" autoComplete="current-password" required/><button type="button" className="password-toggle" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?'Hide':'Show'}</button></div></div>
      {err&&<p className="error">{err}</p>}<button className="btn orange">Sign in</button>
    </form>
    <p className="muted" style={{marginTop:18}}>New to DriveDrop? <Link href={account==='transporter'?'/register?account=transporter':'/register'}>Create an account</Link></p>
  </div></main>;
}
