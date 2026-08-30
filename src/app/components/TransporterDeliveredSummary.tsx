'use client';
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';

export default function TransporterDeliveredSummary(){
 const[target,setTarget]=useState<Element|null>(null);
 const[count,setCount]=useState(0);
 useEffect(()=>{setTarget(document.querySelector('.transporterHero .dashboardSummary'));},[]);
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
 return createPortal(<div><strong>{count}</strong><span>Delivered</span></div>,target);
}
