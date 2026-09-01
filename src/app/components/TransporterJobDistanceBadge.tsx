'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

function render(card:HTMLElement){
  const existing=card.querySelector<HTMLElement>('[data-job-distance-badge]');
  const miles=Number(card.dataset.distanceMiles);
  if(!Number.isFinite(miles)||card.dataset.distanceMiles===''){
    existing?.remove();
    return;
  }

  const summary=card.querySelector<HTMLElement>('.transporterCardSummaryMain');
  if(!summary)return;

  const rounded=miles<10?miles.toFixed(1):Math.round(miles).toString();
  if(existing){
    existing.textContent=`${rounded} miles to collection`;
    return;
  }

  const badge=document.createElement('span');
  badge.dataset.jobDistanceBadge='true';
  badge.textContent=`${rounded} miles to collection`;
  badge.style.cssText='display:inline-flex;align-items:center;width:max-content;margin-top:7px;padding:5px 9px;border-radius:999px;background:#eef5fb;color:#183654;font-size:11px;font-weight:900;line-height:1.2';
  summary.appendChild(badge);
}

export default function TransporterJobDistanceBadge(){
  const pathname=usePathname();
  useEffect(()=>{
    if(pathname!=='/transporter')return;
    let cancelled=false;
    let scheduled=false;

    const scan=()=>{
      scheduled=false;
      if(cancelled)return;
      document.querySelectorAll<HTMLElement>('#available-jobs .jobOpportunity').forEach(render);
    };
    const schedule=()=>{
      if(cancelled||scheduled)return;
      scheduled=true;
      requestAnimationFrame(scan);
    };

    schedule();
    const observer=new MutationObserver(schedule);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-distance-miles']});
    return()=>{
      cancelled=true;
      observer.disconnect();
      document.querySelectorAll('[data-job-distance-badge]').forEach(el=>el.remove());
    };
  },[pathname]);
  return null;
}
