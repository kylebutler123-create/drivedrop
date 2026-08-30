'use client';
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';

export default function TransporterDeliveredSummary(){
 const[target,setTarget]=useState<HTMLElement|null>(null);
 const[count,setCount]=useState(0);
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
 return createPortal(<><strong>{count}</strong><span>Delivered</span></>,target);
}
