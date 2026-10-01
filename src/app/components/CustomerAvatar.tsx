'use client';
import {useEffect,useState} from 'react';
export function useCustomerPhoto(){
 const [url,setUrl]=useState<string|null>(null);
 const [revision,setRevision]=useState(0);
 useEffect(()=>{const changed=()=>setRevision(n=>n+1);window.addEventListener('drivedrop:customer-photo',changed);return()=>window.removeEventListener('drivedrop:customer-photo',changed)},[]);
 useEffect(()=>{
  const controller=new AbortController();let objectUrl:string|null=null;
  fetch('/api/account/customer-photo',{cache:'no-store',signal:controller.signal}).then(async response=>{
   if(response.status===204){setUrl(null);return}
   if(!response.ok)throw new Error('Photo unavailable');
   const blob=await response.blob();if(controller.signal.aborted)return;
   objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);
  }).catch(()=>{if(!controller.signal.aborted)setUrl(null)});
  return()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl)};
 },[revision]);
 return url;
}
export default function CustomerAvatar({name}:{name:string}){
 const url=useCustomerPhoto();
 return <span className="approvedInitial customerPhotoAvatar">{url?<img src={url} alt="" style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}}/>:name.trim().charAt(0).toUpperCase()}</span>;
}
