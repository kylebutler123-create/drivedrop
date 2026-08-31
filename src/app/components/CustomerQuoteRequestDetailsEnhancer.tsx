'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

function formatDate(value?:string|null){if(!value)return'—';const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('en-GB')}
function value(v:any,fallback='Not provided'){return v===null||v===undefined||v===''?fallback:String(v)}

export default function CustomerQuoteRequestDetailsEnhancer(){
 const pathname=usePathname();
 useEffect(()=>{
  if(pathname!=='/customer')return;
  let cancelled=false;
  let jobs:any[]=[];
  async function load(){try{const r=await fetch('/api/my-jobs',{cache:'no-store'});if(r.ok&&!cancelled){jobs=await r.json();scan()}}catch{}}
  function scan(){
   if(cancelled||!jobs.length)return;
   const cards=Array.from(document.querySelectorAll<HTMLElement>('.quoteRequestCard'));
   cards.forEach((card,index)=>{
    if(card.querySelector('[data-request-details]'))return;
    const job=jobs[index];if(!job)return;
    const panel=document.createElement('div');panel.dataset.requestDetails='true';panel.className='customerRequestDetailsPanel';
    panel.innerHTML=`<div class="customerRequestDetailsHead"><div><span>Original transport request</span><b>Vehicle & collection details</b></div><small>Everything supplied when this request was created</small></div><div class="customerRequestDetailsGrid"><div><span>Vehicle type</span><b>${value(job.vehicleType)}</b></div><div><span>Make</span><b>${value(job.vehicleMake)}</b></div><div><span>Model</span><b>${value(job.vehicleModel)}</b></div><div><span>Registration</span><b>${value(job.registration,'Not provided')}</b></div><div><span>Running condition</span><b>${job.running?'Runs and drives':'Non-running'}</b></div><div><span>Collection date</span><b>${formatDate(job.collectionDate)}</b></div><div class="wide"><span>Collection</span><b>${value(job.collection)}</b></div><div class="wide"><span>Delivery</span><b>${value(job.delivery)}</b></div></div>`;
    const route=card.querySelector('.routeVisual');if(route)route.insertAdjacentElement('afterend',panel);else card.appendChild(panel);
   })
  }
  load();const observer=new MutationObserver(scan);observer.observe(document.body,{childList:true,subtree:true});
  return()=>{cancelled=true;observer.disconnect()}
 },[pathname]);
 return null;
}
