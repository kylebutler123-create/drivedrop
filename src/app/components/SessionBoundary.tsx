'use client';

import {useEffect,useState,type ReactNode} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';

type Identity={id:string;role:string}|null;
const privateRoots=['/customer','/transporter','/admin','/account','/messages','/notifications','/payments','/bookings','/app'];
const isPrivate=(path:string)=>privateRoots.some(root=>path===root||path.startsWith(root+'/'));
const dashboard=(role:string)=>role==='CUSTOMER'?'/customer':role==='TRANSPORTER'?'/transporter':'/admin';

/** Synchronizes the cached app shell with the server session. APIs still authorize every request. */
export default function SessionBoundary({user,children}:{user:Identity;children:ReactNode}){
 const pathname=usePathname(),query=useSearchParams().toString();
 const [leaving,setLeaving]=useState(false);
 const id=user?.id,role=user?.role;

 useEffect(()=>{
  let active=true,redirecting=false,replay:HTMLAnchorElement|null=null,clickSequence=0;
  let pending:Promise<boolean>|null=null,controller:AbortController|null=null;
  const replace=(href:string)=>{
   if(!active||redirecting)return;
   redirecting=true;setLeaving(true);
   try{
    sessionStorage.removeItem('drivedrop:unread-messages');
    sessionStorage.removeItem('drivedrop:unread-notifications');
   }catch{}
   // A document navigation discards the old identity, layout and prefetched private pages together.
   window.location.replace(href);
  };
  const signIn=()=>{
   const account=role==='CUSTOMER'?'customer':role==='TRANSPORTER'?'transporter':pathname.startsWith('/customer')?'customer':pathname.startsWith('/transporter')?'transporter':null;
   const params=new URLSearchParams();
   if(account)params.set('account',account);
   if(id)params.set('session','expired');
   replace('/login'+(params.size?'?'+params.toString():''));
  };
  const check=():Promise<boolean>=>{
   if(!active||redirecting)return Promise.resolve(false);
   if(pending)return pending;
   controller=new AbortController();
   const timeout=window.setTimeout(()=>controller?.abort(),5000);
   pending=(async()=>{
    try{
     const response=await fetch('/api/me',{cache:'no-store',credentials:'same-origin',signal:controller!.signal});
     if(!active)return false;
     if(response.status===401){signIn();return false}
     if(!response.ok)return true; // A temporary server/network error is not a sign-out.
     const current=await response.json();
     if(!active)return false;
     if(typeof current?.id==='string'&&['CUSTOMER','TRANSPORTER','ADMIN'].includes(current.role)&&(current.id!==id||current.role!==role)){
      replace(id?dashboard(current.role):window.location.href);return false;
     }
     return true;
    }catch{return active&&!redirecting}
    finally{window.clearTimeout(timeout);pending=null}
   })();
   return pending;
  };
  const resume=()=>{if(document.visibilityState==='visible'&&(id||isPrivate(window.location.pathname)))void check()};
  const navigate=(event:MouseEvent)=>{
   if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const link=event.target instanceof Element?event.target.closest<HTMLAnchorElement>('a[href]'):null;
   if(!link||link===replay||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;
   const next=new URL(link.href,window.location.href);
   if(next.origin!==window.location.origin||!['http:','https:'].includes(next.protocol)||next.pathname.startsWith('/api/'))return;
   if(next.hash&&next.pathname===window.location.pathname&&next.search===window.location.search)return;
   if(!id&&!isPrivate(next.pathname))return;
   // Verify before a cached Link transition can expose an outdated signed-out fallback.
   event.preventDefault();event.stopImmediatePropagation();
   const sequence=++clickSequence;
   void check().then(ok=>{
    if(!ok||!active||sequence!==clickSequence||!link.isConnected)return;
    replay=link;
    try{link.click()}finally{replay=null}
   });
  };
  resume();
  window.addEventListener('click',navigate,true);
  window.addEventListener('focus',resume);
  window.addEventListener('pageshow',resume);
  document.addEventListener('visibilitychange',resume);
  const interval=window.setInterval(resume,30000);
  return()=>{
   active=false;controller?.abort();window.clearInterval(interval);
   window.removeEventListener('click',navigate,true);
   window.removeEventListener('focus',resume);
   window.removeEventListener('pageshow',resume);
   document.removeEventListener('visibilitychange',resume);
  };
 },[id,role,pathname,query]);

 // Do not render legacy private-page fallbacks when a fresh server response is already signed out.
 return leaving||(!user&&isPrivate(pathname))?null:<>{children}</>;
}
