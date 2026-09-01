'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

const statuses=[
  ['ALL','All'],
  ['Confirmed','Confirmed'],
  ['Collection Scheduled','Collection scheduled'],
  ['Collected','Collected'],
  ['In Transit','In transit'],
  ['Arriving Soon','Arriving soon'],
] as const;

function clean(value:string|null|undefined){return String(value||'').replace(/\s+/g,' ').trim()}

export default function TransporterActiveStatusFilter(){
  const pathname=usePathname();
  useEffect(()=>{
    if(pathname!=='/transporter')return;
    let selected='ALL';
    let scheduled=false;
    let cancelled=false;

    const apply=()=>{
      scheduled=false;
      if(cancelled)return;
      const headings=Array.from(document.querySelectorAll<HTMLElement>('.dashboardSectionHeading'));
      const heading=headings.find(h=>clean(h.querySelector('h2')?.textContent)==='Active deliveries');
      if(!heading)return;

      let bar=heading.nextElementSibling as HTMLElement|null;
      if(!bar?.matches('[data-active-status-filter]')){
        bar=document.createElement('div');
        bar.dataset.activeStatusFilter='true';
        bar.style.cssText='display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 14px;padding:10px 12px;border:1px solid #dfe7ef;border-radius:14px;background:#f8fafc';
        const label=document.createElement('span');
        label.textContent='Delivery status';
        label.style.cssText='font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;color:#52667e;margin-right:2px';
        bar.appendChild(label);
        statuses.forEach(([value,text])=>{
          const button=document.createElement('button');
          button.type='button';
          button.dataset.statusValue=value;
          button.className=value===selected?'btn orange':'btn light';
          button.style.cssText='min-height:34px;padding:7px 11px';
          button.textContent=text;
          button.addEventListener('click',()=>{selected=value;apply()});
          bar!.appendChild(button);
        });
        const result=document.createElement('span');
        result.dataset.activeStatusResult='true';
        result.style.cssText='margin-left:auto;font-size:11px;font-weight:800;color:#6c7d90';
        bar.appendChild(result);
        heading.insertAdjacentElement('afterend',bar);
      }

      bar.querySelectorAll<HTMLButtonElement>('[data-status-value]').forEach(button=>{
        const active=button.dataset.statusValue===selected;
        button.className=active?'btn orange':'btn light';
        button.setAttribute('aria-pressed',active?'true':'false');
      });

      const cards=Array.from(document.querySelectorAll<HTMLElement>('main.dashboardShell .transporterBooking'));
      let shown=0;
      cards.forEach(card=>{
        const status=clean(card.querySelector('.statusGroup .statusPill')?.textContent);
        const visible=selected==='ALL'||status===selected;
        card.style.display=visible?'':'none';
        if(visible)shown++;
      });
      const result=bar.querySelector<HTMLElement>('[data-active-status-result]');
      if(result)result.textContent=`${shown} deliver${shown===1?'y':'ies'} shown`;
    };

    const schedule=()=>{if(scheduled||cancelled)return;scheduled=true;requestAnimationFrame(apply)};
    schedule();
    const observer=new MutationObserver(schedule);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>{
      cancelled=true;
      observer.disconnect();
      document.querySelector('[data-active-status-filter]')?.remove();
      document.querySelectorAll<HTMLElement>('main.dashboardShell .transporterBooking').forEach(card=>card.style.display='');
    };
  },[pathname]);
  return null;
}
