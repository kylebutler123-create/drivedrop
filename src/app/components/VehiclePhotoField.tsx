'use client';
import {useEffect,useRef,useState} from 'react';
import {prepareVehiclePhotoValue} from '@/lib/prepare-vehicle-photo';
import {vehiclePhotoUrl} from '@/lib/vehicle-photo';
import Icon from './DeliveryDesignIcon';
import '../vehicle-photo.css';

export default function VehiclePhotoField({job,disabled=false,compactCopy=false}:{compactCopy?:boolean;job?:{id:string;vehiclePhotoPath?:string|null};disabled?:boolean}){
 const [value,setValue]=useState('');
 const [preview,setPreview]=useState<string|null>(()=>vehiclePhotoUrl(job));
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const [retry,setRetry]=useState<string|null|undefined>(undefined);
 const input=useRef<HTMLInputElement>(null),generation=useRef(0),inFlight=useRef(false);
 useEffect(()=>{const form=input.current?.form;if(job||!form)return;const reset=()=>{generation.current++;setValue('');setPreview(null);setError('');setBusy(false);input.current?.setCustomValidity('');};form.addEventListener('reset',reset);return()=>form.removeEventListener('reset',reset)},[job]);
 async function save(data:string|null){
  if(!job)return;
  setBusy(true);inFlight.current=true;setError('');
  try{
   const response=await fetch(`/api/jobs/${encodeURIComponent(job.id)}/photo`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({vehiclePhoto:data})});
   const result=await response.json();if(!response.ok||result.jobId!==job.id)throw new Error(result.error||'Unable to save the vehicle photo.');
   setPreview(result.url);setRetry(undefined);setValue('');
   window.dispatchEvent(new CustomEvent('drivedrop-vehicle-photo-updated',{detail:{jobId:job.id,url:result.url,vehiclePhotoPath:result.vehiclePhotoPath}}));
  }catch(e){setError(e instanceof Error?e.message:'Unable to save the photo. Please try again.');setRetry(data);}
  finally{inFlight.current=false;setBusy(false);}
 }
 async function select(file:File|undefined){
  if(!file||inFlight.current)return;
  const token=++generation.current;setBusy(true);setError('');input.current?.setCustomValidity('Please wait while the vehicle photo is prepared.');
  try{
   const prepared=await prepareVehiclePhotoValue(file);if(token!==generation.current)return;
   setValue(prepared||'');setPreview(prepared||null);input.current?.setCustomValidity('');
   if(job)await save(prepared||null);
  }catch(e){if(token!==generation.current)return;const message=e instanceof Error?e.message:'Unable to prepare the vehicle photo.';setError(message);input.current?.setCustomValidity(job?'':message);}
  finally{if(token===generation.current)setBusy(false);}
 }
 function remove(){if(busy)return;generation.current++;if(input.current){input.current.value='';input.current.setCustomValidity('');}setError('');setValue('');if(job)void save(null);else setPreview(null);}
 return <div className="vehiclePhotoField"><span className="vehiclePhotoLabel">Vehicle photo <small>(optional)</small></span><div className="vehiclePhotoArea"><span className="vehiclePhotoPreview">{preview?<img src={preview} alt="Vehicle photo"/>:<Icon name="camera"/>}</span><div className="vehiclePhotoCopy">{compactCopy?<><strong>Add a photo of your vehicle</strong><p>Shown with your request.</p></>:<p>Shown on your request and related delivery cards. You can change or remove it later.</p>}<div className="vehiclePhotoActions"><label className="vehiclePhotoUpload"><Icon name="upload"/>{busy?'Preparing photo…':preview?'Change photo':'Add photo'}<input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload vehicle photo" disabled={disabled||Boolean(job&&busy)} onChange={event=>void select(event.target.files?.[0])}/></label>{(preview||error)&&<button type="button" className="vehiclePhotoRemove" disabled={disabled||busy} onClick={remove}>Remove</button>}{retry!==undefined&&<button type="button" className="vehiclePhotoRemove" disabled={busy} onClick={()=>void save(retry)}>Retry save</button>}</div></div></div>{!job&&<input type="hidden" name="vehiclePhoto" value={value}/>}<span className="vehiclePhotoFeedback" role={error?'alert':'status'}>{error||(busy&&job?'Saving vehicle photo…':'')}</span></div>;
}
