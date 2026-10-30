'use client';

import {useEffect,useState} from 'react';
import {useCustomerPhoto} from './CustomerAvatar';

export function useMobileViewport(){
 const [mobile,setMobile]=useState(false);
 useEffect(()=>{const media=window.matchMedia('(max-width:1023px)');const sync=()=>setMobile(media.matches);sync();media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync)},[]);
 return mobile;
}

export function PhotoOrInitials({url,name}:{url:string|null;name:string}){
 const [failed,setFailed]=useState<string|null>(null);
 const initials=name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()||'?';
 return url&&failed!==url?<img src={url} alt="" onError={()=>setFailed(url)}/>:<>{initials}</>;
}

export default function MobileCustomerPhoto({name}:{name:string}){
 const mobile=useMobileViewport();
 const url=useCustomerPhoto(mobile);
 return <PhotoOrInitials url={url} name={name}/>;
}

export function BookingCustomerPhoto({bookingId,name,active}:{bookingId:string;name:string;active:boolean}){
 const mobile=useMobileViewport();
 const [photo,setPhoto]=useState<{bookingId:string;url:string}|null>(null);
 useEffect(()=>{
  if(!mobile||!active)return;
  const controller=new AbortController();let objectUrl:string|null=null;
  fetch('/api/bookings/customer-photo?bookingId='+encodeURIComponent(bookingId),{cache:'no-store',signal:controller.signal})
   .then(async response=>{
    if(!response.ok||response.status===204){setPhoto(null);return}
    const blob=await response.blob();if(controller.signal.aborted)return;
    if(!['image/jpeg','image/png','image/webp'].includes(blob.type)){setPhoto(null);return}
    objectUrl=URL.createObjectURL(blob);setPhoto({bookingId,url:objectUrl});
   }).catch(()=>{if(!controller.signal.aborted)setPhoto(null)});
  return()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl)};
 },[bookingId,mobile,active]);
 return <PhotoOrInitials url={mobile&&active&&photo?.bookingId===bookingId?photo.url:null} name={name}/>;
}
