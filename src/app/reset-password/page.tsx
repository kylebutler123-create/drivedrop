'use client';

import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {useState} from 'react';

export default function ResetPassword(){
  const params=useSearchParams();
  const token=params.get('token')||'';
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [busy,setBusy]=useState(false);
  const [done,setDone]=useState(false);
  const [error,setError]=useState('');

  async function submit(e:React.FormEvent){
    e.preventDefault();setError('');
    if(!token){setError('This password reset link is invalid or incomplete.');return;}
    if(password.length<8){setError('Your new password must be at least 8 characters.');return;}
    if(password!==confirm){setError('The passwords do not match.');return;}
    setBusy(true);
    try{
      const r=await fetch('/api/auth/password-reset',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({token,password})});
      const d=await r.json().catch(()=>null);
      if(!r.ok){setError(d?.error||'This password reset link is invalid or has expired.');return;}
      setDone(true);
    }catch{setError('Unable to change your password. Please try again.')}finally{setBusy(false)}
  }

  return <main className="authShell">
    <section className="authVisual"><div className="authVisualOverlay"/><div className="authVisualContent"><span className="eyebrow">SECURE PASSWORD RESET</span><h2>Choose a new DriveDrop password.</h2><p>Your reset link is single-use and expires automatically.</p><div className="authTrust"><span>✓ Password stored securely</span><span>✓ Reset token used once</span><span>✓ Other sessions signed out</span></div></div></section>
    <section className="authFormSide"><div className="authCard"><div style={{display:'flex',flexDirection:'column',alignItems:'flex-start',gap:'18px',marginBottom:'10px'}}><Link className="authBack" href="/login">← Back to login</Link><span className="dashboardEyebrow dark">Account recovery</span></div>
      <h1>Set a new password</h1>
      {!done?<><p className="authIntro">Enter your new password below. It must contain at least 8 characters.</p><form onSubmit={submit}><div className="field"><label>NEW PASSWORD</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" required minLength={8}/></div><div className="field"><label>CONFIRM NEW PASSWORD</label><input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" required minLength={8}/></div>{error&&<div className="formNotice errorNotice">{error}</div>}<button className="btn orange authSubmit" disabled={busy}>{busy?'Changing password…':'Change password'}</button></form></>:<><div className="formNotice successNotice"><b>Password changed successfully.</b><br/>For your security, existing DriveDrop sessions have been signed out.</div><Link className="btn orange authSubmit" href="/login">Sign in with new password</Link></>}
    </div></section>
  </main>;
}
