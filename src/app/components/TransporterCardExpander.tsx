'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

function text(el:Element|null){return (el?.textContent||'').replace(/\s+/g,' ').trim()}
function enhance(card:HTMLElement){
 if(card.dataset.transporterExpandable==='true')return;
 card.dataset.transporterExpandable='true';
 card.classList.add('transporterExpandableCard','isCollapsed');
 const btn=document.createElement('button');
 btn.type='button';btn.className='transporterCardToggle';btn.setAttribute('aria-expanded','false');
 const status=text(card.querySelector('.statusPill'));
 const title=text(card.querySelector('.bookingTop h2'))||'DriveDrop card';
 const partner=text(card.querySelector('.bookingPartner'));
 const route=card.querySelector('.routeVisual');
 const routeStops=route?Array.from(route.querySelectorAll('b')).map(x=>text(x)).filter(Boolean):[];
 const proceeds=text(card.querySelector('.paymentMini strong'));
 const vehicleState=text(card.querySelector('.vehicleState b'));
 const kind=card.classList.contains('jobOpportunity')?'job':'delivery';
 const meta=routeStops.length>=2?`${routeStops[0]} → ${routeStops[1]}`:partner;
 const stat=kind==='job'?(vehicleState||'Open for quotes'):(proceeds?`Proceeds · ${proceeds}`:partner||'View delivery');
 btn.innerHTML=`<span class="transporterCardSummaryMain"><span class="transporterCardSummaryStatus">${status||(kind==='job'?'Open for quotes':'Delivery')}</span><strong>${title}</strong><small>${meta}</small></span><span class="transporterCardSummarySide"><b>${stat}</b><span class="transporterCardChevron">+</span></span>`;
 const toggle=()=>{const collapsed=card.classList.toggle('isCollapsed');btn.setAttribute('aria-expanded',collapsed?'false':'true');const c=btn.querySelector('.transporterCardChevron');if(c)c.textContent=collapsed?'+':'−'};
 btn.addEventListener('click',toggle);
 card.insertBefore(btn,card.firstChild);
}

export default function TransporterCardExpander(){
 const pathname=usePathname();
 useEffect(()=>{
  if(pathname!=='/transporter')return;
  const scan=()=>document.querySelectorAll<HTMLElement>('main.dashboardShell .transporterBooking, main.dashboardShell .jobOpportunity').forEach(enhance);
  scan();
  const observer=new MutationObserver(scan);observer.observe(document.body,{childList:true,subtree:true});
  return()=>observer.disconnect();
 },[pathname]);
 return null;
}
