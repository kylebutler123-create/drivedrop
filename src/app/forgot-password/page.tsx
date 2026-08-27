'use client';

import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {useState} from 'react';

export default function ForgotPassword(){
  const params=useSearchParams();
  const account=params.get('account');
  const [email,setEmail]=useState('');
  const [submitted,setSubmitted]=useState(false);

  function submit(e:React.FormEvent){
    e.preventDefault();
    setSubmitted(true);
  }

  return <main className="authShell">
    <section className="authVisual"><div className="authVisualOverlay"/><div className="authVisualContent"><span className="eyebrow">ACCOUNT RECOVERY</span><h2>Get back into your DriveDrop account.</h2><p>Use the email address linked to your account to start password recovery.</p><div className="authTrust"><span>✓ Secure account recovery</span><span>✓ Customer & transporter accounts</span><span>✓ Your account details stay protected</span></div></div></section>
    <section className="authFormSide"><div className="authCard">
      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-start',gap:'18px',marginBottom:'10px'}}><Link className="authBack" href={`/login${account?`?account=${account}`:''}`}>← Back to login</Link><span className="dashboardEyebrow dark">Password recovery</span></div>
      <h1>Forgot your password?</h1>
      <p className="authIntro">Enter your account email below. Password-reset email delivery is being connected before DriveDrop goes live.</p>
      {!submitted?<form onSubmit={submit}><div className="field"><label>EMAIL</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" required/></div><button className="btn orange authSubmit">Continue</button></form>:<div className="formNotice successNotice">Thanks. The recovery screen is ready, but reset emails are not enabled on this Preview yet. No account changes have been made.</div>}
      <div className="authDivider"><span>Remembered your password?</span></div>
      <Link className="authSecondary" href={`/login${account?`?account=${account}`:''}`}>Return to sign in →</Link>
    </div></section>
  </main>;
}
