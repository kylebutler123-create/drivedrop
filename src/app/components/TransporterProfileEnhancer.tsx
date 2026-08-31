'use client';

import {useEffect} from 'react';

export default function TransporterProfileEnhancer(){
  useEffect(()=>{
    let stopped=false;
    let quotes:any[]=[];
    let timer:number|undefined;

    function apply(){
      if(stopped||!quotes.length)return;
      const cards=Array.from(document.querySelectorAll<HTMLElement>('.quoteOffer'));
      cards.forEach((card,index)=>{
        const quote=quotes[index];
        const transporter=quote?.transporter;
        if(!transporter)return;
        const avatar=card.querySelector<HTMLElement>('.transporterAvatar');
        if(avatar&&transporter.profileImageUrl&&avatar.dataset.profileEnhanced!=='true'){
          avatar.dataset.profileEnhanced='true';
          avatar.classList.add('hasProfileImage');
          avatar.innerHTML='';
          const img=document.createElement('img');
          img.src=transporter.profileImageUrl;
          img.alt=`${transporter.businessName||transporter.personName||'Transporter'} profile`;
          avatar.appendChild(img);
        }
        const holder=card.querySelector<HTMLElement>('.quoteTransporter');
        if(!holder||holder.querySelector('.transporterSummaryMeta'))return;
        const meta=document.createElement('div');
        meta.className='transporterSummaryMeta';
        const years=transporter.yearsOperating===null||transporter.yearsOperating===undefined?'New business':`${transporter.yearsOperating} year${transporter.yearsOperating===1?'':'s'} operating`;
        const verified=transporter.verificationStatus==='APPROVED';
        const rating=transporter.averageRating!==null&&transporter.averageRating!==undefined?`★ ${Number(transporter.averageRating).toFixed(1)} · ${transporter.reviewCount} review${transporter.reviewCount===1?'':'s'}`:'★ New transporter';
        meta.innerHTML=`<div class="transporterTrustRow"><span>${verified?'✓ DriveDrop Verified':'Verification pending'}</span><span>${rating}</span><span>${years}</span></div><a class="btn light transporterProfileLink" href="/transporter/profile/${encodeURIComponent(transporter.id)}">View profile</a>`;
        holder.appendChild(meta);
      });
    }

    async function load(){
      try{
        const response=await fetch('/api/my-jobs',{cache:'no-store'});
        if(!response.ok||stopped)return;
        const jobs=await response.json();
        quotes=jobs.flatMap((job:any)=>job.quotes||[]);
        apply();
      }catch{}
    }

    void load();
    const observer=new MutationObserver(()=>{
      if(stopped)return;
      window.clearTimeout(timer);
      timer=window.setTimeout(apply,80);
    });
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>{stopped=true;observer.disconnect();if(timer)window.clearTimeout(timer)};
  },[]);
  return null;
}
