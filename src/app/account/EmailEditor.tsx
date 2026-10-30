'use client';

import {useState} from 'react';
import Icon from '../components/AccountDesignIcon';

type Props={email:string;customerDesktop?:boolean;transporterDesktop?:boolean};

export default function EmailEditor({email,customerDesktop=false,transporterDesktop=false}:Props){
  const [open,setOpen]=useState(false);
  const [newEmail,setNewEmail]=useState('');
  const [currentPassword,setCurrentPassword]=useState('');
  const [saving,setSaving]=useState(false);
  const [notice,setNotice]=useState('');

  async function submit(){
    setSaving(true);setNotice('');
    try{
      const response=await fetch('/api/account/email/request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({newEmail,currentPassword})});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||'Could not request email change');
      setNotice(body.message||'Verification email sent.');
      setNewEmail('');setCurrentPassword('');
    }catch(error){setNotice(error instanceof Error?error.message:'Could not request email change');}
    finally{setSaving(false);}
  }

  if(!open)return <div className="accountEditPanel accountSecurityPanel ddLoginEmailPanel"><div className="ddSecurityLegacy"><strong>{customerDesktop?<span className="customerSecurityLabel"><Icon name="mail"/><span>Login email</span></span>:'Login email'}</strong><p className={transporterDesktop?'transporterLegacyCopy':undefined}>{customerDesktop?'':email+' · '}Change this only after verifying the new address.</p>{transporterDesktop&&<div className="transporterDesktopOnly accountEmailCopy"><span>{email}</span><small>Your current email stays active until the new address is verified.</small></div>}</div><div className="ddSecurityMobile ddSecurityCardHeading"><span className="ddSecurityIcon"><Icon name="mail"/></span><div><strong>Login email</strong><span className="ddSecurityEmail">{email}</span><p>Your current email stays active until a new address is verified.</p></div></div><button className="btn light ddSecurityChange" type="button" onClick={()=>setOpen(true)}>Change email</button></div>;

  return <section className="dashboardCard accountEditCard ddSecurityEdit ddEmailEdit">
    <div className="panelHeading"><div className="ddSecurityLegacy"><span className="panelIcon">✉️</span><div><h2>Change login email</h2><p>Your current email remains active until the new address is verified.</p></div></div><div className="ddSecurityMobile ddSecurityCardHeading"><span className="ddSecurityIcon"><Icon name="mail"/></span><div><h2>Change login email</h2></div></div></div>
    <div className="accountEditGrid">
      <label><span>Current email</span><input value={email} disabled/></label>
      <label><span>New email</span><input type="email" autoComplete="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="new@email.com"/></label>
      <label className="accountEditWide"><span>Current password</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} placeholder="Enter your current password"/></label>
    </div>
    <div className="formNotice ddSecurityLegacy"><strong>How it works</strong><div style={{marginTop:4}}>DriveDrop sends a one-time confirmation link to the new address. The link expires after 1 hour. Until it is confirmed, keep signing in with {email}.</div></div>
    <div className="ddSecurityMobile ddEmailVerificationNote"><Icon name="mail"/><div><strong>Verify your new address</strong><p>We’ll email a confirmation link to your new address. It expires after 1 hour. Your current email stays active until you confirm.</p></div></div>
    {notice&&<div className="formNotice" role="status">{notice}</div>}
    <div className="actionButtons accountEditActions"><button className="btn orange" type="button" disabled={saving||!newEmail||!currentPassword} onClick={submit}>{saving?'Sending…':'Send verification email'}</button><button className="btn light" type="button" disabled={saving} onClick={()=>{setOpen(false);setNotice('');setNewEmail('');setCurrentPassword('')}}>Cancel</button></div>
  </section>;
}
