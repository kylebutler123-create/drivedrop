'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

function text(el:Element|null){return (el?.textContent||'').replace(/\s+/g,' ').trim()}
function escapeHtml(value:any){return String(value??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]||c))}
type DeliveryProgress={customerId:string;bookingId:string;statusLabel:string;eventKey:string;highlight:boolean};
const seenProgress=new Map<string,string>();
const lastProgressPayload=new WeakMap<HTMLElement,string>();
function syncDeliveryProgress(card:HTMLElement,markSeen=false){
 const raw=card.dataset.deliveryProgress;
 if(!raw)return;
 if(!markSeen&&lastProgressPayload.get(card)===raw)return;
 let progress:DeliveryProgress;
 try{progress=JSON.parse(raw)}catch{return}
 if(!progress||typeof progress.statusLabel!=='string'||typeof progress.eventKey!=='string'||typeof progress.customerId!=='string'||typeof progress.bookingId!=='string')return;
 const main=card.querySelector<HTMLElement>('.customerCardSummaryMain');
 if(!main)return;
 lastProgressPayload.set(card,raw);
 const status=main.querySelector<HTMLElement>('.customerCardSummaryStatus');
 if(status&&status.textContent!==progress.statusLabel)status.textContent=progress.statusLabel;
 const storageKey='drivedrop:delivery-progress:v1:'+JSON.stringify([progress.customerId,progress.bookingId]);
 let seen=seenProgress.get(storageKey);
 if(seen===undefined){try{seen=localStorage.getItem(storageKey)||undefined}catch{}}
 if(markSeen&&progress.customerId&&progress.bookingId){
  seen=progress.eventKey;seenProgress.set(storageKey,seen);
  try{localStorage.setItem(storageKey,seen)}catch{}
 }
 const unread=progress.highlight===true&&!!progress.customerId&&!!progress.bookingId&&seen!==progress.eventKey;
 card.classList.toggle('hasUnreadDeliveryProgress',unread);
 let badge=main.querySelector<HTMLElement>('.customerDeliveryProgressAlert');
 if(!unread){badge?.remove();return}
 if(!badge){badge=document.createElement('span');badge.className='customerDeliveryProgressAlert';main.appendChild(badge)}
 const message='Delivery update · '+progress.statusLabel;
 if(badge.textContent!==message)badge.textContent=message;
}

type CompletedSummary={title:string;transporter:string;registration:string;deliveredAt?:string|null;evidenceCount:number;paymentText:string};
const lastCompletedPayload=new WeakMap<HTMLElement,string>();
function syncCompletedSummary(card:HTMLElement){
 const raw=card.dataset.completedSummary;
 if(!raw)return;
 let summary:CompletedSummary;
 try{summary=JSON.parse(raw)}catch{return}
 if(!summary||typeof summary.title!=='string'||typeof summary.transporter!=='string'||typeof summary.registration!=='string'||typeof summary.paymentText!=='string'||!Number.isFinite(summary.evidenceCount))return;
 const button=card.querySelector<HTMLButtonElement>(':scope > .customerCardToggle');
 if(!button)return;
 if(lastCompletedPayload.get(card)===raw&&button.classList.contains('customerCompletedSummary')&&button.querySelector('.customerCompletedIdentity'))return;
 const deliveredDate=summary.deliveredAt?new Date(summary.deliveredAt):null;
 const deliveredLabel=deliveredDate&&Number.isFinite(deliveredDate.getTime())?deliveredDate.toLocaleDateString('en-GB'):'Date unavailable';
 lastCompletedPayload.set(card,raw);
 button.classList.add('customerCompletedSummary');
 button.innerHTML=`<span class="customerCompletedIdentity"><span class="customerCardSummaryStatus">Completed</span><strong>${escapeHtml(summary.title)}</strong><small>Transporter · ${escapeHtml(summary.transporter)} · ${escapeHtml(summary.registration)}</small></span><span class="customerCompletedQuick"><span><small>Delivered</small><b>${escapeHtml(deliveredLabel)}</b></span><span><small>Payment</small><b>${escapeHtml(summary.paymentText)}</b></span><span><small>Confirmation</small><b>Confirmed</b></span><span><small>Evidence</small><b>${summary.evidenceCount} item${summary.evidenceCount===1?'':'s'}</b></span></span><span class="customerCardChevron">${card.classList.contains('isCollapsed')?'+':'−'}</span>`;
}

function enhance(card:HTMLElement){
 if(card.dataset.customerExpandable==='true'){syncDeliveryProgress(card);syncCompletedSummary(card);return}
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
 const kind=card.classList.contains('quoteRequestCard')?'quote':'booking';
 const meta=routeStops.length>=2?`${routeStops[0]} → ${routeStops[1]}`:partner;
 const stat=quoteCount?`${quoteCount} quote${quoteCount==='1'?'':'s'}`:paymentValue?`${paymentLabel||'Payment'} · ${paymentValue}`:partner;
 btn.innerHTML=`<span class="customerCardSummaryMain"><span class="customerCardSummaryStatus">${status}</span><strong>${title}</strong><small>${meta}</small></span><span class="customerCardSummarySide"><b>${stat||'View details'}</b><span class="customerCardChevron">+</span></span>`;
 const toggle=()=>{const collapsed=card.classList.toggle('isCollapsed');btn.setAttribute('aria-expanded',collapsed?'false':'true');const chevron=btn.querySelector('.customerCardChevron');if(chevron)chevron.textContent=collapsed?'+':'−';if(!collapsed)syncDeliveryProgress(card,true)};
 btn.addEventListener('click',toggle);
 card.insertBefore(btn,card.firstChild);
 syncDeliveryProgress(card);
 syncCompletedSummary(card);
}

export default function CustomerCardExpander(){
 const pathname=usePathname();
 useEffect(()=>{
  if(pathname!=='/customer')return;
  let frame:number|null=null;
  const scan=()=>{frame=null;document.querySelectorAll<HTMLElement>('main.dashboardShell .bookingCard, main.dashboardShell .quoteRequestCard').forEach(enhance)};
  const schedule=()=>{if(frame===null)frame=requestAnimationFrame(scan)};
  scan();
  const observer=new MutationObserver(records=>{
   for(const record of records){if(record.type==='attributes'&&record.target instanceof HTMLElement){syncDeliveryProgress(record.target);syncCompletedSummary(record.target)}else schedule()}
  });
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-delivery-progress','data-completed-summary']});
  return()=>{observer.disconnect();if(frame!==null)cancelAnimationFrame(frame)};
 },[pathname]);
 return null;
}
