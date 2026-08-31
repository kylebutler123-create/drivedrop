'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

function text(el:Element|null){return (el?.textContent||'').replace(/\s+/g,' ').trim()}
function enhance(card:HTMLElement){
 if(card.dataset.customerExpandable==='true')return;
 card.dataset.customerExpandable='true';
 card.classList.add('customerExpandableCard','isCollapsed');
 const btn=document.createElement('button');
 btn.type='button';btn.className='customerCardToggle';btn.setAttribute('aria-expanded','false');
 const status=text(card.querySelector('.statusPill'));
 const title=text(card.querySelector('.bookingTop h2, .panelHeading h2'))||'DriveDrop card';
 const partner=text(card.querySelector('.bookingPartner, .panelHeading p'));
 const route=card.querySelector('.routeVisual');
 const routeStops=route?Array.from(route.querySelectorAll('b')).map(x=>text(x)).filter(Boolean):[];
 const paymentLabel=text(card.querySelector('.paymentMini span'));
 const paymentValue=text(card.querySelector('.paymentMini strong'));
 const quoteCount=text(card.querySelector('.quoteCount strong'));
 const kind=card.classList.contains('requestPanel')?'request':card.classList.contains('quoteRequestCard')?'quote':'booking';
 const meta=kind==='request'?'Enter vehicle and route details to request quotes.':routeStops.length>=2?`${routeStops[0]} → ${routeStops[1]}`:partner;
 const stat=quoteCount?`${quoteCount} quote${quoteCount==='1'?'':'s'}`:paymentValue?`${paymentLabel||'Payment'} · ${paymentValue}`:partner;
 btn.innerHTML=`<span class="customerCardSummaryMain"><span class="customerCardSummaryStatus">${status||(kind==='request'?'New request':'')}</span><strong>${title}</strong><small>${meta}</small></span><span class="customerCardSummarySide"><b>${stat||'View details'}</b><span class="customerCardChevron">+</span></span>`;
 const toggle=()=>{const collapsed=card.classList.toggle('isCollapsed');btn.setAttribute('aria-expanded',collapsed?'false':'true');const chevron=btn.querySelector('.customerCardChevron');if(chevron)chevron.textContent=collapsed?'+':'−'};
 btn.addEventListener('click',toggle);
 card.insertBefore(btn,card.firstChild);
}

export default function CustomerCardExpander(){
 const pathname=usePathname();
 useEffect(()=>{
  if(pathname!=='/customer')return;
  const scan=()=>document.querySelectorAll<HTMLElement>('main.dashboardShell .requestPanel, main.dashboardShell .bookingCard, main.dashboardShell .quoteRequestCard').forEach(enhance);
  scan();
  const observer=new MutationObserver(scan);observer.observe(document.body,{childList:true,subtree:true});
  return()=>observer.disconnect();
 },[pathname]);
 return null;
}
