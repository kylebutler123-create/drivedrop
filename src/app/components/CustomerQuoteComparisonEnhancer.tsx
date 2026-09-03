'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

type QuoteSummary={name:string;verified:boolean;message:string;price:string;date:string;status:string};
const renderedSummaries=new WeakMap<HTMLElement,string>();

function refreshQuoteSummary(card:HTMLElement,summary:HTMLElement){
  const raw=card.dataset.quoteSummary;
  if(!raw||renderedSummaries.get(summary)===raw)return;
  let data:QuoteSummary;
  try{data=JSON.parse(raw)}catch{return}
  if(!data||['name','message','price','date','status'].some(key=>typeof data[key as keyof QuoteSummary]!=='string'))return;
  const values:Record<string,string>={
    '.quoteCompareIdentity b':data.name,
    '.quoteCompareIdentity small':data.verified?'✓ DriveDrop Verified':'Transporter quote',
    '[data-compare-price]':data.price,
    '[data-compare-date]':data.date,
    '[data-compare-status]':data.status,
    '.quoteCompareMessage b':data.message
  };
  for(const [selector,value] of Object.entries(values)){
    const element=summary.querySelector<HTMLElement>(selector);
    if(element&&element.textContent!==value)element.textContent=value;
  }
  card.classList.toggle('needsQuoteAction',data.status.startsWith('Action needed'));
  renderedSummaries.set(summary,raw);
}

export default function CustomerQuoteComparisonEnhancer(){
  const pathname=usePathname();
  useEffect(()=>{
    if(pathname!=='/customer')return;
    let stopped=false;
    let frame:number|null=null;
    const enhance=()=>{
      if(stopped)return;
      document.querySelectorAll<HTMLElement>('.quoteOffer').forEach(card=>{
        const existing=card.querySelector<HTMLElement>(':scope > .quoteComparisonSummary');
        if(existing){
          refreshQuoteSummary(card,existing);
          return;
        }
        const transporter=card.querySelector<HTMLElement>('.quoteTransporter');
        const decision=card.querySelector<HTMLElement>('.quoteDecision');
        if(!transporter||!decision||!card.dataset.quoteSummary)return;
        const original=document.createElement('div');
        original.className='quoteComparisonExpanded';
        while(card.firstChild)original.appendChild(card.firstChild);
        const summary=document.createElement('button');
        summary.type='button';
        summary.className='quoteComparisonSummary';
        summary.setAttribute('aria-expanded','false');
        summary.innerHTML='<span class="quoteCompareIdentity"><span class="quoteCompareAvatar">🚛</span><span><b></b><small></small></span></span><span class="quoteCompareStats"><span><small>Total price</small><b data-compare-price></b></span><span><small>Collection</small><b data-compare-date></b></span><span><small>Status</small><b data-compare-status></b></span></span><span class="quoteCompareMessage"><small>Message</small><b></b></span><span class="quoteCompareChevron">+</span>';
        refreshQuoteSummary(card,summary);
        summary.addEventListener('click',()=>{
          const open=card.classList.toggle('quoteComparisonOpen');
          summary.setAttribute('aria-expanded',String(open));
          const chevron=summary.querySelector('.quoteCompareChevron');
          if(chevron)chevron.textContent=open?'−':'+';
        });
        card.dataset.quoteComparisonEnhanced='true';
        card.append(summary,original);
      });
    };
    const schedule=()=>{
      if(stopped||frame!==null)return;
      frame=window.requestAnimationFrame(()=>{frame=null;enhance()});
    };
    const observer=new MutationObserver(schedule);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-quote-summary']});
    enhance();
    return()=>{
      stopped=true;
      observer.disconnect();
      if(frame!==null)window.cancelAnimationFrame(frame);
    };
  },[pathname]);
  return null;
}
