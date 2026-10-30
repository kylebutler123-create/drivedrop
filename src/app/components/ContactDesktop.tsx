'use client';
import Link from 'next/link';
import {PublicBack,PublicButton,PublicIcon,PublicNote} from './MobilePublicUI';
import {useEffect, useRef, useState, type FormEvent} from 'react';
import {CONTACT_ENQUIRY_TYPES, SUPPORT_CONTACT} from '@/lib/support-contact';
function Icon({name}:{name:string}){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{name==='mail'?<><rect x="2" y="4" width="20" height="16" rx="1"/><path d="m2 5 10 8L22 5"/></>:name==='phone'?<path d="m7 2 4 5-3 3c2 3 3 4 6 6l3-3 5 4c-1 5-4 6-8 4C8 18 5 15 2 9 0 5 2 2 7 2Z"/>:name==='pin'?<><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>:name==='clock'?<><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>:name==='user'?<><circle cx="12" cy="6" r="5"/><path d="M2 23v-2a10 10 0 0 1 20 0v2Z"/></>:name==='truck'?<><path d="M1 16V4h13v15H7M14 8h5l4 5v6h-3M14 19h1M23 13h-9"/><circle cx="4" cy="19" r="3"/><circle cx="18" cy="19" r="3"/></>:name==='book'?<><path d="M12 5C8 1 4 2 1 3v17c4-2 7-2 11 1 4-3 7-3 11-1V3c-3-1-7-2-11 2ZM12 5v16"/></>:name==='chat'?<path d="M21 11c0 6-5 9-11 8l-6 3 1-6C0 8 5 3 12 3c6 0 9 3 9 8Z"/>:name==='check'?<path d="m5 12 4 4 10-10"/>:<path d="M3 12h18m-6-6 6 6-6 6"/>}</svg>}
export default function ContactDesktop(){
const [sending,setSending]=useState(false);
const [notice,setNotice]=useState<{kind:'success'|'error';text:string}|null>(null);
const success=useRef<HTMLDivElement>(null);
useEffect(()=>{if(notice?.kind==='success'&&window.matchMedia('(max-width:1023px)').matches){success.current?.focus();window.scrollTo({top:0})}},[notice]);
const inFlight=useRef(false);
const attempt=useRef<{fingerprint:string;requestId:string}|null>(null);
async function submit(event:FormEvent<HTMLFormElement>){
 event.preventDefault();
 if(inFlight.current)return;
 const form=event.currentTarget;
 const fields=new FormData(form);
 const enquiry={name:String(fields.get('name')||''),email:String(fields.get('email')||''),enquiry:String(fields.get('enquiry')||''),bookingReference:String(fields.get('bookingReference')||''),subject:String(fields.get('subject')||''),message:String(fields.get('message')||''),website:String(fields.get('website')||'')};
 const fingerprint=JSON.stringify(enquiry);
 inFlight.current=true;setSending(true);setNotice(null);
 try{
  if(attempt.current?.fingerprint!==fingerprint)attempt.current={fingerprint,requestId:crypto.randomUUID()};
  const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...enquiry,requestId:attempt.current.requestId})});
  const result=await response.json().catch(()=>null);
  if(!response.ok||result?.sent!==true)throw new Error(typeof result?.error==='string'?result.error:'We could not confirm your message was sent. Please try again or use the email address alongside this form.');
  form.reset();attempt.current=null;
  setNotice({kind:'success',text:'Your message has been sent to DriveDrop Support. We’ll reply to the email address you provided.'});
 }catch(error){
  setNotice({kind:'error',text:error instanceof Error?error.message:`We could not confirm your message was sent. Please try again or email ${SUPPORT_CONTACT.email}.`});
 }finally{inFlight.current=false;setSending(false)}
}
return <div className={`approvedPublicContent contactDesktop${notice?.kind==='success'?' mpContactDone':''}`}>
<div className="mpOnly mpContactIntro"><PublicBack/><h1>Get in touch</h1><p className="mpIntro">Send a question to DriveDrop Support.</p></div>
{notice?.kind==='success'&&<div className="mpOnly mpSuccess" ref={success} tabIndex={-1} role="status"><span><PublicIcon name="check"/></span><h2>Message sent</h2><p>{notice.text}</p><PublicButton href="/">Back to home</PublicButton><a className="mpOutline" href="/help">Browse Help &amp; FAQ</a></div>}
<div className="mpOnly mpContactBooking"><PublicNote icon="help" title="Have a booking question?"><Link href="/login">Sign in to view your booking.</Link></PublicNote></div>
<section className="approvedPublicHero contactPageHero"><div className="approvedPageWidth"><span className="approvedEyebrow">CONTACT DRIVEDROP</span><h1>Let’s get you to the right place.</h1><p>Have a question about DriveDrop? Send us a message or<br/> find guidance for your booking.</p></div></section>
<div className="approvedPageWidth contactBody"><section className="contactBooking"><span className="contactBubble"><Icon name="chat"/></span><div><h2>Need help with an existing booking?</h2><p>Open the relevant booking in your account for messages, delivery details and problem-reporting controls.</p></div><Link className="btn orange" href="/login?account=customer">Customer login</Link><Link className="btn light" href="/login?account=transporter">Transporter login</Link></section>
<div className="contactColumns"><section className="contactFormCard"><h2>Send us a message</h2><p>For general enquiries, account questions or feedback, use the form below.</p><form onSubmit={submit} aria-busy={sending}>
<div className="contactHoney" aria-hidden="true"><label>Leave this field empty<input name="website" autoComplete="off" tabIndex={-1}/></label></div>
<div className="contactFields"><label>Full name <b>*</b><input name="name" autoComplete="name" required maxLength={120} disabled={sending}/></label><label>Email address <b>*</b><input type="email" name="email" autoComplete="email" required maxLength={254} disabled={sending}/></label><label>Enquiry type <b>*</b><select name="enquiry" defaultValue="" required disabled={sending}><option value="" disabled>Select an enquiry type</option>{CONTACT_ENQUIRY_TYPES.map(s=><option key={s}>{s}</option>)}</select></label><label>Booking reference <span>(optional)</span><input name="bookingReference" maxLength={100} disabled={sending}/></label><label className="contactFull">Subject <b>*</b><input name="subject" required maxLength={200} disabled={sending}/></label><label className="contactFull">Your message <b>*</b><textarea name="message" required maxLength={5000} placeholder="Tell us how we can help…" disabled={sending}/></label></div><p className="contactHint">Please do not include passwords or payment-card details.</p><p className="contactPrivacy">Read our <Link href="/privacy">Privacy Policy</Link> to find out how we handle your information.</p><button className="btn orange" type="submit" disabled={sending}>{sending?'Sending…':'Send message'} <Icon name="arrow"/></button><p className="contactAvailability" role="status" aria-live="polite" data-state={notice?.kind}>{notice?.text||`Your enquiry goes directly to ${SUPPORT_CONTACT.email}.`}</p></form></section>
<aside><section className="contactDetails"><h2>Contact details</h2><p>Get in touch with DriveDrop Support.</p><dl>
<div><Icon name="mail"/><div><dt>Email</dt><dd><a href={`mailto:${SUPPORT_CONTACT.email}`}>{SUPPORT_CONTACT.email}</a></dd></div></div>
<div><Icon name="phone"/><div><dt>Phone</dt><dd><a href={SUPPORT_CONTACT.phoneHref}>{SUPPORT_CONTACT.phone}</a></dd></div></div>
<div><Icon name="pin"/><div><dt>Address</dt><dd className="contactAddress">{SUPPORT_CONTACT.address.map(line=><span key={line}>{line}<br/></span>)}</dd></div></div>
</dl></section><section className="contactBefore"><h2>Before you send</h2><ul>{['Choose the most relevant enquiry type.','Include your booking reference if you have one.','Explain what happened and how we can help.'].map(s=><li key={s}><span><Icon name="check"/></span>{s}</li>)}</ul></section></aside></div>
<section className="contactRoutes">{[['user','Customer enquiries','For quotes and delivery arrangements, open your customer account.','Customer login','/login?account=customer'],['truck','Transporter enquiries','Find your jobs, verification details and proceeds in your account.','Transporter login','/login?account=transporter'],['book','Looking for an answer?','Browse guidance on quotes, bookings and managing your account.','Visit Help Centre','/help']].map(([icon,title,copy,label,href])=><article key={title}><Icon name={icon}/><div><h2>{title}</h2><p>{copy}</p><Link href={href}>{label}<Icon name="arrow"/></Link></div></article>)}</section></div></div>}
