'use client';

import {useState} from 'react';

export default function PasswordEditor(){
  const [open,setOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [notice,setNotice]=useState('');
  const [form,setForm]=useState({currentPassword:'',newPassword:'',confirmPassword:''});

  async function save(){
    setSaving(true);setNotice('');
    try{
      const response=await fetch('/api/account/password',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(form)});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||'Could not change password');
      setNotice('Password changed successfully.');
      setForm({currentPassword:'',newPassword:'',confirmPassword:''});
      setOpen(false);
    }catch(error){setNotice(error instanceof Error?error.message:'Could not change password');}
    finally{setSaving(false);}
  }

  if(!open)return <div className="accountEditPanel securityPanel"><div><strong>Account security</strong><p>Change your password if you want to update your sign-in security.</p></div><button className="btn light" type="button" onClick={()=>{setOpen(true);setNotice('')}}>Change password</button>{notice&&<div className="formNotice accountEditNotice">{notice}</div>}</div>;

  return <section className="dashboardCard accountEditCard securityEditCard">
    <div className="panelHeading"><div><span className="panelIcon">🔒</span><div><h2>Change password</h2><p>Enter your current password, then choose a new password of at least 8 characters.</p></div></div></div>
    <div className="accountEditGrid passwordEditGrid">
      <label className="accountEditWide"><span>Current password</span><input type="password" autoComplete="current-password" value={form.currentPassword} onChange={e=>setForm({...form,currentPassword:e.target.value})}/></label>
      <label><span>New password</span><input type="password" autoComplete="new-password" value={form.newPassword} onChange={e=>setForm({...form,newPassword:e.target.value})}/></label>
      <label><span>Confirm new password</span><input type="password" autoComplete="new-password" value={form.confirmPassword} onChange={e=>setForm({...form,confirmPassword:e.target.value})}/></label>
    </div>
    {notice&&<div className="formNotice">{notice}</div>}
    <div className="actionButtons accountEditActions"><button className="btn orange" type="button" disabled={saving} onClick={save}>{saving?'Updating…':'Update password'}</button><button className="btn light" type="button" disabled={saving} onClick={()=>{setOpen(false);setNotice('');setForm({currentPassword:'',newPassword:'',confirmPassword:''})}}>Cancel</button></div>
  </section>;
}
