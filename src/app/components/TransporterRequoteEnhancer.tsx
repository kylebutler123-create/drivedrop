'use client';

import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

type Job={id:string;quotes?:Array<{id:string;pricePence:number;status:string;message?:string|null;proposedCollectionDate?:string|null}>};

export default function TransporterRequoteEnhancer(){
 const pathname=usePathname();
 useEffect(()=>{
  if(pathname!=='/transporter')return;
  let stopped=false;

  async function enhance(){
   const r=await fetch('/api/jobs',{cache:'no-store'});
   if(!r.ok||stopped)return;
   const jobs:Job[]=await r.json();
   const cards=Array.from(document.querySelectorAll<HTMLElement>('.jobOpportunity'));
   cards.forEach((card,index)=>{
    const job=jobs[index];
    const quote=job?.quotes?.[0];
    if(!job||!quote||quote.status!=='PENDING'||card.dataset.requoteEnhanced==='true')return;
    const panel=card.querySelector<HTMLElement>('.infoPanel');
    if(!panel)return;
    card.dataset.requoteEnhanced='true';

    const wrap=document.createElement('div');
    wrap.className='requoteWrap';
    const button=document.createElement('button');
    button.type='button';
    button.className='btn light requoteButton';
    button.textContent='Adjust quote';
    wrap.appendChild(button);
    panel.appendChild(wrap);

    button.addEventListener('click',()=>{
     if(wrap.querySelector('form'))return;
     const form=document.createElement('form');
     form.className='requoteForm';
     const current=(quote.pricePence/100).toFixed(2);
     const currentDate=quote.proposedCollectionDate?new Date(quote.proposedCollectionDate).toISOString().slice(0,10):'';
     const currentMessage=(quote.message||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
     form.innerHTML=`
      <div class="requoteHeading"><strong>Adjust your quote</strong><small>Your updated offer replaces your current pending quote.</small></div>
      <label>NEW PRICE (£)<input name="price" type="number" min="10" step="0.01" value="${current}" required></label>
      <label>ALTERNATIVE COLLECTION DATE<input name="date" type="date" value="${currentDate}"></label>
      <label>MESSAGE TO CUSTOMER<textarea name="message" maxlength="1000" rows="3" placeholder="Explain your updated offer if useful.">${currentMessage}</textarea></label>
      <div class="requoteActions"><button class="btn orange" type="submit">Update quote</button><button class="btn light" type="button" data-cancel>Cancel</button></div>
      <div class="requoteNotice" aria-live="polite"></div>`;
     wrap.appendChild(form);
     form.querySelector<HTMLButtonElement>('[data-cancel]')?.addEventListener('click',()=>form.remove());
     form.addEventListener('submit',async(e)=>{
      e.preventDefault();
      const submit=form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
      const notice=form.querySelector<HTMLElement>('.requoteNotice')!;
      const data=new FormData(form);
      submit.disabled=true;submit.textContent='Updating…';notice.textContent='';
      const pricePence=Math.round(Number(data.get('price'))*100);
      const response=await fetch('/api/quotes',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jobId:job.id,pricePence,message:String(data.get('message')||'')||undefined,proposedCollectionDate:String(data.get('date')||'')||undefined})});
      const result=await response.json().catch(()=>null);
      if(!response.ok){notice.textContent=result?.error||'Unable to update quote';notice.className='requoteNotice error';submit.disabled=false;submit.textContent='Update quote';return;}
      notice.textContent='Quote updated successfully — the customer can now review your revised offer.';notice.className='requoteNotice success';
      const firstValue=panel.querySelector<HTMLElement>('.infoRow b');
      if(firstValue)firstValue.textContent=`£${(result.pricePence/100).toFixed(2)}`;
      window.dispatchEvent(new Event('drivedrop:quote-updated'));
      setTimeout(()=>form.remove(),1200);
     });
    });
   });
  }

  void enhance();
  const onQuoteUpdated=()=>{document.querySelectorAll<HTMLElement>('.jobOpportunity').forEach(card=>delete card.dataset.requoteEnhanced);void enhance()};
  window.addEventListener('drivedrop:quote-updated',onQuoteUpdated);
  return()=>{stopped=true;window.removeEventListener('drivedrop:quote-updated',onQuoteUpdated)};
 },[pathname]);
 return null;
}
