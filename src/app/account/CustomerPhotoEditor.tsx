'use client';
import {useRef,useState} from 'react';
import {useCustomerPhoto} from '../components/CustomerAvatar';
import Icon from '../components/AccountDesignIcon';
import {prepareUploadImages} from '@/lib/prepare-message-images';
import {PhotoOrInitials} from '../components/MobileCustomerPhoto';
export default function CustomerPhotoEditor({name,mobile=false}:{name:string;mobile?:boolean}){
 const url=useCustomerPhoto(),input=useRef<HTMLInputElement>(null),inFlight=useRef(false);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 async function save(file:File){
  if(inFlight.current)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setNotice('Choose a JPG, PNG or WebP photo.');return}
  if(file.size>20*1024*1024||file.size===0){setNotice('Choose a photo up to 20 MB.');return}
  inFlight.current=true;setBusy(true);setNotice('');
  try{
   const [prepared]=await prepareUploadImages([file]);
   const form=new FormData();form.append('file',prepared);
   const response=await fetch('/api/account/customer-photo',{method:'POST',body:form});
   const data=await response.json();if(!response.ok)throw new Error(data.error);
   window.dispatchEvent(new Event('drivedrop:customer-photo'));setNotice('Profile photo updated.');
  }catch(error){setNotice(error instanceof Error?error.message:'Could not upload photo.')}
  finally{inFlight.current=false;setBusy(false);if(input.current)input.current.value=''}
 }
 async function remove(){
  if(inFlight.current)return;inFlight.current=true;setBusy(true);setNotice('');
  try{const response=await fetch('/api/account/customer-photo',{method:'DELETE'});const data=await response.json();if(!response.ok)throw new Error(data.error);window.dispatchEvent(new Event('drivedrop:customer-photo'));setNotice('Profile photo removed.')}
  catch(error){setNotice(error instanceof Error?error.message:'Could not remove photo.')}
  finally{inFlight.current=false;setBusy(false)}
 }
 const actions=<div className="customerPhotoActions"><input ref={input} aria-label="Profile photo" type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e=>{const file=e.target.files?.[0];if(file)void save(file)}}/><button className="btn light" type="button" disabled={busy} onClick={()=>input.current?.click()}><Icon name="camera"/>{busy?'Saving…':url?'Change photo':'Upload photo'}</button>{url&&<button className="textAction" type="button" disabled={busy} onClick={remove}>Remove photo</button>}</div>;
 if(mobile)return <section className="ddCustomerPhotoSection" aria-label="Profile photo"><h2>Profile photo <span>(optional)</span></h2><div className="ddCustomerPhotoCard"><div className="ddCustomerPhotoPreview"><PhotoOrInitials url={url} name={name}/></div><div className="ddCustomerPhotoCopy"><h3>Personalise your account</h3><p>JPG, PNG or WebP</p>{actions}</div></div>{notice&&<p role="status" className="customerPhotoNotice">{notice}</p>}<p className="ddCustomerPhotoHelp">Visible to your transporter on active deliveries.</p></section>;
 return <div className="customerProfilePhoto"><div className="customerPhotoPreview">{url?<img src={url} alt="Your profile photo"/>:<span>{name.trim().charAt(0).toUpperCase()}</span>}</div><div><h3>Profile photo <span>(optional)</span></h3><p>Add a photo to personalise your account.</p>{actions}{notice&&<p role="status" className="customerPhotoNotice">{notice}</p>}</div></div>;
}
