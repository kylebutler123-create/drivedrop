'use client';

import {useState} from 'react';
import Icon from '../components/AccountDesignIcon';

export default function PasswordEditor({customerDesktop=false,transporterDesktop=false}:{customerDesktop?:boolean;transporterDesktop?:boolean}={}){
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

  if(!open)return <div className="accountEditPanel securityPanel ddPasswordPanel"><div className="ddSecurityLegacy"><strong>{customerDesktop?<span className="customerSecurityLabel"><Icon name="lock"/><span>Password</span></span> :transporterDesktop?<><span className="transporterLegacyCopy">Account security</span><span className="transporterDesktopOnly">Password</span></>:'Account security'}</strong><p className={transporterDesktop?'transporterLegacyCopy':undefined}>Change your password if you want to update your sign-in security.</p>{transporterDesktop&&<p className="transporterDesktopOnly">Update your sign-in password.</p>}</div><div className="ddSecurityMobile ddSecurityCardHeading"><span className="ddSecurityIcon"><Icon name="lock"/></span><div><strong>Password</strong><p>Update your sign-in password.</p></div></div><button className="btn light ddSecurityChange" type="button" onClick={()=>{setOpen(true);setNotice('')}}>Change password</button>{notice&&<div className="formNotice accountEditNotice" role="status">{notice}</div>}</div>;

  return <section className="dashboardCard accountEditCard securityEditCard ddSecurityEdit">
    <div className="panelHeading"><div className="ddSecurityLegacy"><span className="panelIcon">🔒</span><div><h2>Change password</h2><p>Enter your current password, then choose a new password of at least 8 characters.</p></div></div><div className="ddSecurityMobile ddSecurityCardHeading"><span className="ddSecurityIcon"><Icon name="lock"/></span><div><h2>Change password</h2><p>Choose a new password of at least 8 characters.</p></div></div></div>
    <div className="accountEditGrid passwordEditGrid">
      <label className="accountEditWide"><span>Current password</span><input type="password" placeholder="Enter your current password" autoComplete="current-password" value={form.currentPassword} onChange={e=>setForm({...form,currentPassword:e.target.value})}/></label>
      <label><span>New password</span><input type="password" autoComplete="new-password" placeholder="At least 8 characters" value={form.newPassword} onChange={e=>setForm({...form,newPassword:e.target.value})}/></label>
      <label><span>Confirm new password</span><input type="password" autoComplete="new-password" placeholder="Repeat your new password" value={form.confirmPassword} onChange={e=>setForm({...form,confirmPassword:e.target.value})}/></label>
    </div>
    {notice&&<div className="formNotice" role="status">{notice}</div>}
    <div className="actionButtons accountEditActions"><button className="btn orange" type="button" disabled={saving} onClick={save}>{saving?'Updating…':'Update password'}</button><button className="btn light" type="button" disabled={saving} onClick={()=>{setOpen(false);setNotice('');setForm({currentPassword:'',newPassword:'',confirmPassword:''})}}>Cancel</button></div>
  </section>;
}
