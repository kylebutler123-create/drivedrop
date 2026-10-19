'use client';

import {useState,type FormEvent} from 'react';
import styles from './JobEmailPreferences.module.css';

export default function JobEmailPreferences({initialDaily}:{initialDaily:boolean}){
 const [daily,setDaily]=useState(initialDaily);
 const [saved,setSaved]=useState(initialDaily);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState('');
 const [error,setError]=useState(false);
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setNotice('');setError(false);
  try{
   const response=await fetch('/api/account/email-preferences',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({dailyJobEmails:daily})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Unable to save your email preferences.');
   setSaved(data.dailyJobEmails);
   setNotice(data.dailyJobEmails?'Daily job summaries are on.':'New job emails are off.');
  }catch(error){setError(true);setNotice(error instanceof Error?error.message:'Unable to save. Please try again.');}
  finally{setBusy(false);}
 }
 return <section id="email-preferences" className={`dashboardCard accountCard ${styles.card}`} aria-labelledby="job-email-heading">
  <div className={styles.heading}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg><div><h2 id="job-email-heading">Email preferences</h2><p>Choose how you hear about new available jobs.</p></div></div>
  <form onSubmit={save}>
   <fieldset disabled={busy} className={styles.options}><legend>New job emails</legend>
    <label className={daily?styles.selected:''}><input type="radio" name="job-emails" value="daily" checked={daily} onChange={()=>{setDaily(true);setNotice('');}}/><span><strong>Daily summary <small>Recommended</small></strong><span>One morning email with a few new available jobs and a link to view all. No email if there are no new jobs.</span></span></label>
    <label className={!daily?styles.selected:''}><input type="radio" name="job-emails" value="off" checked={!daily} onChange={()=>{setDaily(false);setNotice('');}}/><span><strong>Off</strong><span>Browse available jobs whenever you sign in.</span></span></label>
   </fieldset>
   <div className={styles.footer}><p>Booking, confirmation, cancellation, dispute and payment emails will still be sent.</p><button type="submit" className="btn orange" disabled={busy||daily===saved}>{busy?'Saving…':'Save preferences'}</button></div>
   {notice&&<p className={error?styles.error:styles.success} role={error?'alert':'status'}>{notice}</p>}
  </form>
 </section>;
}
