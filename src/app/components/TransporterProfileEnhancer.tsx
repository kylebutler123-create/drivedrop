'use client';

import {useEffect} from 'react';

export default function TransporterProfileEnhancer(){
  useEffect(()=>{
    let stopped=false;
    async function enhance(){
      try{
        const response=await fetch('/api/my-jobs',{cache:'no-store'});
        if(!response.ok||stopped)return;
        const jobs=await response.json();
        const quotes=jobs.flatMap((job:any)=>job.quotes||[]);
        const cards=Array.from(document.querySelectorAll<HTMLElement>('.quoteOffer'));
        cards.forEach((card,index)=>{
          const quote=quotes[index];
          const avatar=card.querySelector<HTMLElement>('.transporterAvatar');
          if(!avatar||!quote?.transporter?.profileImageUrl)return;
          if(avatar.dataset.profileEnhanced==='true')return;
          avatar.dataset.profileEnhanced='true';
          avatar.classList.add('hasProfileImage');
          avatar.innerHTML='';
          const img=document.createElement('img');
          img.src=quote.transporter.profileImageUrl;
          img.alt=`${quote.transporter.businessName||quote.transporter.personName||'Transporter'} profile`;
          avatar.appendChild(img);
        });
      }catch{}
    }
    enhance();
    const observer=new MutationObserver(()=>enhance());
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>{stopped=true;observer.disconnect()};
  },[]);
  return null;
}
