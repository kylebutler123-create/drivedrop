'use client';

import {useState} from 'react';

type Props={email:string};

export default function EmailEditor({email}:Props){
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

  if(!open)return <div className="accountEditPanel accountSecurityPanel"><div><strong>Login email</strong><p>{email} · Change this only after verifying the new address.</p></div><button className="btn light" type="button" onClick={()=>setOpen(true)}>Change email</button></div>;

  return <section className="dashboardCard accountEditCard">
    <div className="panelHeading"><div><span className="panelIcon">✉️</span><div><h2>Change login email</h2><p>Your current email remains active until the new address is verified.</p></div></div></div>
    <div className="accountEditGrid">
      <label><span>Current email</span><input value={email} disabled/></label>
      <label><span>New email</span><input type="email" autoComplete="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="new@email.com"/></label>
      <label className="accountEditWide"><span>Current password</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} placeholder="Enter your current password"/></label>
    </div>
    <div className="formNotice"><strong>How it works</strong><div style={{marginTop:4}}>DriveDrop sends a one-time confirmation link to the new address. The link expires after 1 hour. Until it is confirmed, keep signing in with {email}.</div></div>
    {notice&&<div className="formNotice">{notice}</div>}
    <div className="actionButtons accountEditActions"><button className="btn orange" type="button" disabled={saving||!newEmail||!currentPassword} onClick={submit}>{saving?'Sending…':'Send verification email'}</button><button className="btn light" type="button" disabled={saving} onClick={()=>{setOpen(false);setNotice('');setNewEmail('');setCurrentPassword('')}}>Cancel</button></div>
  </section>;
}
