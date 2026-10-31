'use client';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';

const CustomerPhotoContext=createContext<string|null>(null);

/** One private, in-memory photo for the signed-in customer's app shell. */
export function CustomerPhotoProvider({enabled,children}:{enabled:boolean;children:ReactNode}){
 const [url,setUrl]=useState<string|null>(null);
 const ownedUrls=useRef(new Set<string>());
 useEffect(()=>{
  if(!enabled)return;
  let controller:AbortController|null=null;
  const owned=ownedUrls.current;
  const refresh=async()=>{
   controller?.abort();
   const request=new AbortController();controller=request;
   let candidate:string|null=null,published=false;
   try{
    const response=await fetch('/api/account/customer-photo',{cache:'no-store',signal:request.signal});
    if(request.signal.aborted)return;
    if([204,401,403].includes(response.status)){setUrl(null);return}
    if(!response.ok)return;
    const blob=await response.blob();
    if(request.signal.aborted||!['image/jpeg','image/png','image/webp'].includes(blob.type))return;
    candidate=URL.createObjectURL(blob);owned.add(candidate);
    // Keep the current photo visible until the replacement is ready to paint.
    const image=new Image();image.src=candidate;await image.decode();
    if(request.signal.aborted)return;
    setUrl(candidate);published=true;
   }catch{/* A temporary failure must not erase an already loaded photo. */}
   finally{if(candidate&&!published){URL.revokeObjectURL(candidate);owned.delete(candidate)}}
  };
  const changed=()=>{void refresh()};
  changed();window.addEventListener('drivedrop:customer-photo',changed);
  return()=>{controller?.abort();window.removeEventListener('drivedrop:customer-photo',changed);for(const value of owned)URL.revokeObjectURL(value);owned.clear()};
 },[enabled]);
 useEffect(()=>()=>{if(url){URL.revokeObjectURL(url);ownedUrls.current.delete(url)}},[url]);
 return <CustomerPhotoContext.Provider value={enabled?url:null}>{children}</CustomerPhotoContext.Provider>;
}

export function useCustomerPhoto(enabled=true){
 const url=useContext(CustomerPhotoContext);
 return enabled?url:null;
}
export default function CustomerAvatar({name}:{name:string}){
 const url=useCustomerPhoto();
 return <span className="approvedInitial customerPhotoAvatar">{url?<img src={url} alt="" style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}}/>:name.trim().charAt(0).toUpperCase()}</span>;
}
