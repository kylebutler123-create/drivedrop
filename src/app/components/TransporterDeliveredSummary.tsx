'use client';
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {useRouter} from 'next/navigation';

export default function TransporterDeliveredSummary(){
 const[target,setTarget]=useState<HTMLElement|null>(null);
 const[count,setCount]=useState(0);
 const router=useRouter();
 useEffect(()=>{
  const summary=document.querySelector<HTMLElement>('.transporterHero .dashboardSummary');
  if(!summary)return;
  const mount=document.createElement('div');
  mount.dataset.deliveredSummary='true';
  const jobsBox=Array.from(summary.children).find(child=>child.textContent?.includes('Jobs available'));
  if(jobsBox?.nextSibling)summary.insertBefore(mount,jobsBox.nextSibling);else summary.appendChild(mount);
  setTarget(mount);
  return()=>{mount.remove()};
 },[]);
 useEffect(()=>{
  let cancelled=false;
  async function load(){
   try{
    const response=await fetch('/api/transporter/delivered-count',{cache:'no-store'});
    if(response.ok&&!cancelled){const data=await response.json();setCount(Number(data.count)||0)}
   }catch{}
  }
  load();
  const timer=window.setInterval(load,10000);
  return()=>{cancelled=true;window.clearInterval(timer)};
 },[]);
 if(!target)return null;
 return createPortal(<div role="button" tabIndex={0} aria-label={`View ${count} delivered deliveries`} onClick={()=>router.push('/transporter/delivered')} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();router.push('/transporter/delivered')}}} style={{cursor:'pointer',height:'100%'}}><strong>{count}</strong><span>Delivered</span></div>,target);
}
