'use client';

import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';

type Blockers={liveJobs:number;activeBookings:number;openDisputes:number;unsettledTransporterPayments:number};

export default function CloseAccount(){
  const router=useRouter();
  const [open,setOpen]=useState(false);
  const [checking,setChecking]=useState(false);
  const [closing,setClosing]=useState(false);
  const [notice,setNotice]=useState('');
  const [canClose,setCanClose]=useState<boolean|null>(null);
  const [blockers,setBlockers]=useState<Blockers|null>(null);
  const [form,setForm]=useState({password:'',confirmation:''});

  async function check(){
    setChecking(true);setNotice('');
    try{
      const response=await fetch('/api/account/close');
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||'Could not check account status');
      setCanClose(body.canClose);setBlockers(body.blockers);
    }catch(error){setNotice(error instanceof Error?error.message:'Could not check account status');}
    finally{setChecking(false);}
  }

  useEffect(()=>{if(open)check();},[open]);

  async function close(){
    setClosing(true);setNotice('');
    try{
      const response=await fetch('/api/account/close',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(form)});
      const body=await response.json();
      if(!response.ok){if(body.blockers)setBlockers(body.blockers);throw new Error(body.error||'Could not close account');}
      router.push('/login?accountClosed=1');router.refresh();
    }catch(error){setNotice(error instanceof Error?error.message:'Could not close account');}
    finally{setClosing(false);}
  }

  if(!open)return <div className="accountEditPanel dangerPanel"><div><strong>Close account</strong><p>Permanently deactivate this DriveDrop account once all active work and financial matters are finished.</p></div><button className="btn light dangerButton" type="button" onClick={()=>setOpen(true)}>Close account</button></div>;

  return <section className="dashboardCard accountEditCard dangerCard">
    <div className="panelHeading"><div><span className="panelIcon">⚠️</span><div><h2>Close your account</h2><p>This permanently disables sign-in. DriveDrop keeps historic booking, payment and dispute records where required.</p></div></div></div>
    {checking?<div className="formNotice">Checking whether this account can be closed…</div>:<>
      {canClose===false&&blockers&&<div className="formNotice errorNotice"><strong>This account cannot be closed yet.</strong><div className="closeBlockerList">{blockers.liveJobs>0&&<span>{blockers.liveJobs} live quote request{blockers.liveJobs===1?'':'s'}</span>}{blockers.activeBookings>0&&<span>{blockers.activeBookings} active booking{blockers.activeBookings===1?'':'s'}</span>}{blockers.openDisputes>0&&<span>{blockers.openDisputes} unresolved dispute{blockers.openDisputes===1?'':'s'}</span>}{blockers.unsettledTransporterPayments>0&&<span>{blockers.unsettledTransporterPayments} unsettled payout{blockers.unsettledTransporterPayments===1?'':'s'}</span>}</div></div>}
      {canClose===true&&<><div className="formNotice"><strong>Account is eligible for closure.</strong><div style={{marginTop:4}}>Enter your current password and type <b>CLOSE</b> below to confirm.</div></div><div className="accountEditGrid passwordEditGrid"><label><span>Current password</span><input type="password" autoComplete="current-password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label><label><span>Type CLOSE</span><input value={form.confirmation} onChange={e=>setForm({...form,confirmation:e.target.value.toUpperCase()})}/></label></div></>}
    </>}
    {notice&&<div className="formNotice errorNotice">{notice}</div>}
    <div className="actionButtons accountEditActions">{canClose&&<button className="btn dangerConfirm" type="button" disabled={closing||form.confirmation!=='CLOSE'||!form.password} onClick={close}>{closing?'Closing…':'Permanently close account'}</button>}<button className="btn light" type="button" disabled={closing} onClick={()=>{setOpen(false);setNotice('');setForm({password:'',confirmation:''});setCanClose(null);setBlockers(null)}}>Cancel</button>{canClose===false&&<button className="btn light" type="button" disabled={checking} onClick={check}>Check again</button>}</div>
  </section>;
}
