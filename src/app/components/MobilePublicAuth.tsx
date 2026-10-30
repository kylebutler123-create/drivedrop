'use client';
import {useRef,useState,type FormEvent} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {vehicleTypeCategory} from '@/lib/vehicle-types';
import {PublicBack,PublicIcon,PublicNote} from './MobilePublicUI';

type Mode='login'|'register'|'forgot'|'reset';
function PasswordField({label,name,confirm=false,minLength,placeholder='Enter your password'}:{label:string;name:string;confirm?:boolean;minLength?:number;placeholder?:string}){
 const [show,setShow]=useState(false);
 return <label className="mpField">{label}<span className="mpPassword"><input name={name} type={show?'text':'password'} autoComplete={minLength?'new-password':'current-password'} placeholder={placeholder} required minLength={minLength} aria-label={label}/><button type="button" aria-label={`${show?'Hide':'Show'} ${confirm?'confirmation ':''}password`} aria-pressed={show} onClick={()=>setShow(v=>!v)}><PublicIcon name="eye"/></button></span></label>;
}
export default function MobilePublicAuth({mode}:{mode:Mode}){
 const params=useSearchParams(),router=useRouter();
 const transporter=params.get('account')==='transporter';
 const vehicle=vehicleTypeCategory(params.get('vehicleType'));
 const account=transporter?'transporter':'customer';
 const query=`account=${account}${vehicle?`&vehicleType=${encodeURIComponent(vehicle)}`:''}`;
 const signIn='/login?'+query;
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false);
 const inFlight=useRef(false),notice=useRef<HTMLDivElement>(null);
 const register=mode==='register',recovery=mode==='forgot'||mode==='reset';
 const title=mode==='login'?'Welcome back':register?(transporter?'Join as a transporter':'Create your account'):mode==='forgot'?'Forgot your password?':'Set a new password';
 const intro=mode==='login'?(transporter?'Your jobs, deliveries and proceeds in one place.':'Sign in to manage your vehicle delivery.'):register?(transporter?'Find work and manage your deliveries.':'Get quotes and manage your vehicle delivery.'):mode==='forgot'?'Enter the email address linked to your account.':'Choose a password with at least 8 characters.';
 const emailChange=params.get('emailChange');
 const emailNotice=emailChange==='confirmed'?'Your email address has been verified and updated. Sign in using your new email address.':emailChange==='taken'?'That email address is already linked to another DriveDrop account.':emailChange==='invalid'?'That email verification link is invalid or has expired. Please request a new one from your Account page.':null;
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(inFlight.current)return;
  const fields=new FormData(event.currentTarget);setError('');
  if(mode==='reset'&&fields.get('password')!==fields.get('confirm')){setError('The passwords do not match.');return}
  if(mode==='reset'&&!params.get('token')){setError('This reset link is invalid or incomplete. Please request a new one.');return}
  inFlight.current=true;setBusy(true);
  const payload=mode==='login'?{email:fields.get('email'),password:fields.get('password')}:register?{name:fields.get('name'),email:fields.get('email'),password:fields.get('password'),...(!transporter?{phone:fields.get('phone')}:{}),role:transporter?'TRANSPORTER':'CUSTOMER'}:mode==='forgot'?{email:fields.get('email')}:{token:params.get('token'),password:fields.get('password')};
  try{
   const response=await fetch(recovery?'/api/auth/password-reset':`/api/auth/${mode}`,{method:mode==='reset'?'PATCH':'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
   const result=await response.json().catch(()=>null);
   if(!response.ok)throw new Error(typeof result?.error==='string'?result.error:'We couldn’t complete that request. Please try again.');
   if(recovery){setDone(true);requestAnimationFrame(()=>notice.current?.focus());return}
   if(!['CUSTOMER','TRANSPORTER','ADMIN'].includes(result?.role))throw new Error('We couldn’t confirm your sign-in. Please try again.');
   router.push(result.role==='CUSTOMER'?`/customer${vehicle?'?vehicleType='+encodeURIComponent(vehicle):''}`:result.role==='TRANSPORTER'?'/transporter':'/admin');router.refresh();
  }catch(err){setError(err instanceof Error?err.message:'Connection interrupted. Please try again.')}finally{inFlight.current=false;setBusy(false)}
 }
 return <main className="mpOnly mpPage mpAuth" data-auth-mode={mode} aria-label={title}><PublicBack href={recovery?signIn:'/'} label={recovery?'Sign in':'Home'}/><div className="mpAuthHeading"><span className="mpIconTile"><PublicIcon name={recovery?'key':transporter?'truck':'user'}/></span><h1>{title}</h1><p className="mpIntro">{intro}</p></div>
  {!recovery&&<div className="mpSwitch" aria-label="Choose account type"><Link href={`/${mode}?account=customer${vehicle?'&vehicleType='+encodeURIComponent(vehicle):''}`} aria-current={!transporter?'page':undefined}>Customer</Link><Link href={`/${mode}?account=transporter`} aria-current={transporter?'page':undefined}>Transporter</Link></div>}
  {mode==='login'&&params.get('accountClosed')==='1'&&<div className="mpNotice" role="status">Your DriveDrop account has been closed and you have been signed out.</div>}
  {mode==='login'&&emailNotice&&<div className="mpNotice" role="status">{emailNotice}</div>}
  {done?<div className="mpSuccess" ref={notice} tabIndex={-1} role="status"><span><PublicIcon name={mode==='forgot'?'mail':'check'}/></span><h2>{mode==='forgot'?'Check your email':'Password changed'}</h2><p>{mode==='forgot'?'If an eligible account exists, we’ll email reset instructions.':'Your password has been updated successfully. Existing sessions have been signed out.'}</p>{mode==='forgot'?<small>Reset links expire after 30 minutes and can only be used once.</small>:<Link className="mpButton mpSecondary" href={signIn}>Back to sign in</Link>}</div>:<div className="mpAuthCard"><form onSubmit={submit} aria-busy={busy}><fieldset disabled={busy}>
   {register&&<label className="mpField">{transporter?'Name / business name':'Your name'}<input name="name" autoComplete="name" placeholder={transporter?'Your name or business name':'Your name'} required minLength={2}/></label>}
   {mode!=='reset'&&<label className="mpField">Email address<input type="email" name="email" autoComplete="email" placeholder="you@example.com" defaultValue={mode==='login'?params.get('email')||'':undefined} required/></label>}
   {register&&!transporter&&<label className="mpField">Phone number<input type="tel" name="phone" autoComplete="tel" inputMode="tel" placeholder="Your contact number" minLength={7} maxLength={30} required/></label>}
   {mode!=='forgot'&&<PasswordField label={mode==='reset'?'New password':'Password'} name="password" placeholder={mode==='reset'?'Enter your new password':'Enter your password'} minLength={mode==='login'?undefined:8}/>}
   {register&&<small className="mpPasswordHint">At least 8 characters</small>}
   {mode==='reset'&&<PasswordField label="Confirm new password" name="confirm" placeholder="Confirm your new password" confirm minLength={8}/>}
   {mode==='login'&&<Link className="mpForgot" href={'/forgot-password?'+query}>Forgot password?</Link>}
   {register&&transporter&&<PublicNote title="Verification comes next">Add your driving licence and insurance in your account.</PublicNote>}
   {error&&<p className="mpError" role="alert">{error}{mode==='reset'&&<Link href={'/forgot-password?'+query}>Request a new reset link</Link>}</p>}
   <button className="mpButton" type="submit" disabled={busy}>{busy?'Please wait…':mode==='login'?'Sign in':register?`Create ${account} account`:mode==='forgot'?'Send reset link':'Change password'}</button>
  </fieldset></form>
  {mode==='login'&&<><div className="mpDivider">New to DriveDrop?</div><Link className="mpOutline" href={'/register?'+query}>Create {account} account</Link></>}
  {register&&<p className="mpLegalConsent">By creating an account, you agree to the <Link href="/terms">Terms & Conditions</Link>. Read our <Link href="/privacy">Privacy Policy</Link>.</p>}
  {mode==='forgot'&&<PublicNote icon="mail" title="">If an eligible account exists, we’ll email reset instructions.</PublicNote>}
  {mode==='reset'&&<PublicNote title="">You’ll sign in again after changing your password.</PublicNote>}
  </div>}
  {register?<p className="mpAuthBottom">Already registered? <Link href={signIn}>Sign in</Link></p>:recovery?<p className="mpAuthBottom"><Link href={signIn}>Back to sign in</Link></p>:<Link className="mpAuthHelp" href="/help"><PublicIcon name="help"/>Help & support</Link>}
 </main>;
}
