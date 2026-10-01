'use client';
import {useRef,useState} from 'react';
import {useCustomerPhoto} from '../components/CustomerAvatar';
import Icon from '../components/AccountDesignIcon';
export default function CustomerPhotoEditor({name}:{name:string}){
 const url=useCustomerPhoto(),input=useRef<HTMLInputElement>(null),inFlight=useRef(false);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 async function save(file:File){
  if(inFlight.current)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setNotice('Choose a JPG, PNG or WebP photo.');return}
  if(file.size>2*1024*1024||file.size===0){setNotice('Choose a photo up to 2 MB.');return}
  inFlight.current=true;setBusy(true);setNotice('');
  try{
   const form=new FormData();form.append('file',file);
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
 return <div className="customerProfilePhoto"><div className="customerPhotoPreview">{url?<img src={url} alt="Your profile photo"/>:<span>{name.trim().charAt(0).toUpperCase()}</span>}</div><div><h3>Profile photo <span>(optional)</span></h3><p>Add a photo to personalise your account.</p><div className="customerPhotoActions"><input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e=>{const file=e.target.files?.[0];if(file)void save(file)}}/><button className="btn light" type="button" disabled={busy} onClick={()=>input.current?.click()}><Icon name="camera"/>{busy?'Saving…':url?'Change photo':'Upload photo'}</button>{url&&<button className="textAction" type="button" disabled={busy} onClick={remove}>Remove photo</button>}</div>{notice&&<p role="status" className="customerPhotoNotice">{notice}</p>}</div></div>;
}
