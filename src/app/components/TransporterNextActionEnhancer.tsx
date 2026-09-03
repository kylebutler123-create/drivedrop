'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

function text(el:Element|null){return (el?.textContent||'').replace(/\s+/g,' ').trim()}

const guidance:Record<string,{title:string;body:string}>={
 'Confirmed':{title:'Next action · Collect vehicle',body:'Complete the Proof of Collection before transport begins.'},
 'Collection Scheduled':{title:'Next action · Collect vehicle',body:'Complete the Proof of Collection when the vehicle is handed over.'},
 'Collected':{title:'Next action · Mark in transit',body:'Confirm when the vehicle has left collection and the journey is underway.'},
 'In Transit':{title:'Next action · Mark arriving soon',body:'Update the customer when you are approaching the delivery address.'},
 'Arriving Soon':{title:'Next action · Complete delivery',body:'Complete Proof of Delivery with delivery photos and the recipient signature.'}
};

function enhance(card:HTMLElement){
 const status=card.dataset.bookingStatusLabel||text(card.querySelector('.bookingTop .statusPill'));
 if(card.dataset.nextActionStatus===status)return;
 const info=guidance[status];
 if(!info)return;
 const panel=card.querySelector<HTMLElement>('.actionPanel');
 if(!panel)return;
 card.dataset.nextActionEnhanced='true';
 card.dataset.nextActionStatus=status;
 panel.classList.add('transporterNextActionPanel');
 const intro=panel.querySelector<HTMLElement>('.transporterNextActionIntro')||document.createElement('div');
 intro.className='transporterNextActionIntro';
 intro.innerHTML=`<span>Delivery workflow</span><strong>${info.title}</strong><p>${info.body}</p>`;
 if(intro.parentElement!==panel)panel.insertBefore(intro,panel.firstChild);
 const oldLabel=Array.from(panel.children).find(el=>el.tagName==='SPAN'&&!el.classList.contains('transporterNextActionIntro')) as HTMLElement|undefined;
 if(oldLabel)oldLabel.style.display='none';
 const buttons=Array.from(panel.querySelectorAll<HTMLButtonElement>('.actionButtons .btn'));
 buttons.forEach(button=>button.classList.remove('nextActionSecondary'));
 if(buttons.length>1){
   const preferred=status==='Confirmed'?'Collection Scheduled':status==='Collection Scheduled'?'Collected':status==='Collected'?'In Transit':status==='In Transit'?'Arriving Soon':'';
   buttons.forEach(button=>{if(preferred&&text(button)!==preferred)button.classList.add('nextActionSecondary')});
 }
}

export default function TransporterNextActionEnhancer(){
 const pathname=usePathname();
 useEffect(()=>{
   if(pathname!=='/transporter')return;
   let cancelled=false,scheduled=false;
   const scan=()=>{scheduled=false;if(cancelled)return;document.querySelectorAll<HTMLElement>('.transporterBooking').forEach(enhance)};
   const schedule=()=>{if(cancelled||scheduled)return;scheduled=true;requestAnimationFrame(scan)};
   schedule();
   const observer=new MutationObserver(schedule);
   observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-booking-status-label']});
   return()=>{cancelled=true;observer.disconnect()};
 },[pathname]);
 return null;
}
