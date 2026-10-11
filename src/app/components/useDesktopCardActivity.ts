'use client';
import {useEffect,useState} from 'react';

// Read state is per account, card and activity version; a later update is unread again.
export const cardActivityKey=(account:string,kind:string,id:string)=>'drivedrop:card-activity:v1:'+JSON.stringify([account,kind,id]);
export const quoteActivityVersion=(quotes:any[])=>quotes.map(q=>JSON.stringify([q.id,q.status,q.pricePence,q.dateNegotiationStatus,q.proposedCollectionDate,q.proposedCollectionFrom,q.proposedCollectionUntil])).sort().join('|');
export default function useDesktopCardActivity(kind:string,accountId?:string){
 const[account,setAccount]=useState(accountId||'');
 const[desktop,setDesktop]=useState(false);
 const[seen,setSeen]=useState<Record<string,string>>({});
 const[,refresh]=useState(0);
 useEffect(()=>{
  const media=window.matchMedia('(min-width:1024px)');
  const update=()=>setDesktop(media.matches);update();media.addEventListener('change',update);
  const storage=()=>{setSeen({});refresh(n=>n+1)};window.addEventListener('storage',storage);
  return()=>{media.removeEventListener('change',update);window.removeEventListener('storage',storage)};
 },[]);
 useEffect(()=>{
  if(accountId){setAccount(accountId);return}
  let live=true;
  void fetch('/api/me',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(user=>{if(live&&user?.id)setAccount(user.id)}).catch(()=>{});
  return()=>{live=false};
 },[accountId]);
 function unread(id:string,event:string){
  if(!desktop||!account||!id||!event)return false;
  const key=cardActivityKey(account,kind,id);
  if(seen[key]!==undefined)return seen[key]!==event;
  try{return localStorage.getItem(key)!==event}catch{return true}
 }
 function mark(id:string,event:string){
  if(!desktop||!account||!id||!event)return;
  const key=cardActivityKey(account,kind,id);
  try{localStorage.setItem(key,event)}catch{}
  setSeen(current=>({...current,[key]:event}));
 }
 return {unread,mark,desktop};
}
