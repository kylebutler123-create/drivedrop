'use client';

import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {useState} from 'react';

export default function ForgotPassword(){
  const params=useSearchParams();
  const account=params.get('account');
  const [email,setEmail]=useState('');
  const [submitted,setSubmitted]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  async function submit(e:React.FormEvent){
    e.preventDefault();
    setBusy(true);setError('');
    try{
      const r=await fetch('/api/auth/password-reset',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email})});
      if(!r.ok){const d=await r.json().catch(()=>null);setError(d?.error||'Unable to start password recovery. Please try again.');return;}
      setSubmitted(true);
    }catch{setError('Unable to start password recovery. Please try again.')}finally{setBusy(false)}
  }

  return <main className="authShell">
    <section className="authVisual"><div className="authVisualOverlay"/><div className="authVisualContent"><span className="eyebrow">ACCOUNT RECOVERY</span><h2>Get back into your DriveDrop account.</h2><p>Use the email address linked to your account to start secure password recovery.</p><div className="authTrust"><span>✓ One-time reset link</span><span>✓ 30-minute expiry</span><span>✓ Existing sessions revoked after reset</span></div></div></section>
    <section className="authFormSide"><div className="authCard">
      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-start',gap:'18px',marginBottom:'10px'}}><Link className="authBack" href={`/login${account?`?account=${account}`:''}`}>← Back to login</Link><span className="dashboardEyebrow dark">Password recovery</span></div>
      <h1>Forgot your password?</h1>
      <p className="authIntro">Enter your account email. For security, DriveDrop gives the same response whether or not an account exists.</p>
      {!submitted?<form onSubmit={submit}><div className="field"><label>EMAIL</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" required/></div>{error&&<div className="formNotice errorNotice">{error}</div>}<button className="btn orange authSubmit" disabled={busy}>{busy?'Starting recovery…':'Send reset instructions'}</button></form>:<div className="formNotice successNotice"><b>Check your email.</b><br/>If an eligible DriveDrop account exists for that address, reset instructions have been created. Reset links expire after 30 minutes and can only be used once.</div>}
      <div className="authDivider"><span>Remembered your password?</span></div>
      <Link className="authSecondary" href={`/login${account?`?account=${account}`:''}`}>Return to sign in →</Link>
    </div></section>
  </main>;
}
