'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';

type Props={name:string;email:string;role:string;business?:{businessName:string;companyNumber:string;businessAddress:string;phone:string;yearsOperating:number|null;website:string}|null};

export default function AccountEditor({name,email,role,business}:Props){
  const router=useRouter();
  const [editing,setEditing]=useState(false);
  const [saving,setSaving]=useState(false);
  const [notice,setNotice]=useState('');
  const [form,setForm]=useState({name,businessName:business?.businessName||'',companyNumber:business?.companyNumber||'',businessAddress:business?.businessAddress||'',phone:business?.phone||'',yearsOperating:business?.yearsOperating?.toString()||'',website:business?.website||''});

  async function save(){
    setSaving(true);setNotice('');
    try{
      const personal=await fetch('/api/account',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({name:form.name})});
      const personalBody=await personal.json();
      if(!personal.ok)throw new Error(personalBody.error||'Could not save account details');
      if(role==='TRANSPORTER'){
        const businessResponse=await fetch('/api/transporter/verification',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({businessName:form.businessName,companyNumber:form.companyNumber||undefined,businessAddress:form.businessAddress,phone:form.phone,yearsOperating:form.yearsOperating===''?undefined:Number(form.yearsOperating),website:form.website})});
        const businessBody=await businessResponse.json();
        if(!businessResponse.ok)throw new Error(businessBody.error||'Could not save business details');
      }
      setNotice('Account details updated successfully.');setEditing(false);router.refresh();
    }catch(error){setNotice(error instanceof Error?error.message:'Could not save account details');}
    finally{setSaving(false);}
  }

  if(!editing)return <div className="accountEditPanel"><div><strong>Need to change something?</strong><p>Update your account details without changing your login email or verification documents.</p></div><button className="btn orange" type="button" onClick={()=>setEditing(true)}>Edit account details</button>{notice&&<div className="formNotice accountEditNotice">{notice}</div>}</div>;

  return <section className="dashboardCard accountEditCard">
    <div className="panelHeading"><div><span className="panelIcon">✏️</span><div><h2>Edit account details</h2><p>Keep your contact and business information accurate.</p></div></div></div>
    <div className="accountEditGrid">
      <label><span>Name</span><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
      <label><span>Email address</span><input value={email} disabled/><small>Login email cannot be changed here.</small></label>
      {role==='TRANSPORTER'&&<>
        <label><span>Business name</span><input value={form.businessName} onChange={e=>setForm({...form,businessName:e.target.value})}/></label>
        <label><span>Company number</span><input value={form.companyNumber} onChange={e=>setForm({...form,companyNumber:e.target.value})}/></label>
        <label className="accountEditWide"><span>Business address</span><input value={form.businessAddress} onChange={e=>setForm({...form,businessAddress:e.target.value})}/></label>
        <label><span>Phone</span><input type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
        <label><span>Years operating</span><input type="number" min="0" value={form.yearsOperating} onChange={e=>setForm({...form,yearsOperating:e.target.value})}/></label>
        <label className="accountEditWide"><span>Website</span><input type="url" placeholder="https://" value={form.website} onChange={e=>setForm({...form,website:e.target.value})}/></label>
      </>}
    </div>
    {notice&&<div className="formNotice">{notice}</div>}
    <div className="actionButtons accountEditActions"><button className="btn orange" type="button" disabled={saving} onClick={save}>{saving?'Saving…':'Save changes'}</button><button className="btn light" type="button" disabled={saving} onClick={()=>{setEditing(false);setNotice('')}}>Cancel</button></div>
  </section>;
}
