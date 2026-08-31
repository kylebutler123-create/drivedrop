'use client';
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {usePathname} from 'next/navigation';
import {getSharedBookings} from './shared-bookings-client';

function norm(v:any){return String(v??'').replace(/\s+/g,' ').trim().toLowerCase()}

export default function CustomerProofOfCollectionEnhancer(){
 const pathname=usePathname();
 const[mounts,setMounts]=useState<{el:HTMLElement,bookingId:string}[]>([]);
 const[data,setData]=useState<Record<string,any>>({});
 useEffect(()=>{
  if(pathname!=='/customer'){setMounts([]);return}
  let cancelled=false;
  let retryTimer:ReturnType<typeof setTimeout>|null=null;
  let observer:MutationObserver|null=null;
  let bookings:any[]=[];

  function mountProof(){
   if(cancelled||!bookings.length)return;
   const cards=Array.from(document.querySelectorAll<HTMLElement>('.bookingCard'));
   if(!cards.length)return;
   const next:{el:HTMLElement,bookingId:string}[]=[];
   const nextData:Record<string,any>={};
   cards.forEach((card,i)=>{
    const title=norm(card.querySelector('.bookingTop h2')?.textContent);
    const stops=Array.from(card.querySelectorAll('.routeVisual b')).slice(0,2).map(x=>norm(x.textContent));
    const b=bookings.find((x:any)=>norm(`${x.job?.vehicleMake||''} ${x.job?.vehicleModel||''}`)===title&&stops.length>=2&&norm(x.job?.collection)===stops[0]&&norm(x.job?.delivery)===stops[1])||bookings.find((x:any)=>stops.length>=2&&norm(x.job?.collection)===stops[0]&&norm(x.job?.delivery)===stops[1])||bookings[i];
    if(!b?.proofOfCollection?.submittedAt)return;
    let el=card.querySelector<HTMLElement>('[data-customer-poc]');
    if(!el){el=document.createElement('div');el.dataset.customerPoc='true';card.appendChild(el)}
    next.push({el,bookingId:b.id});nextData[b.id]=b.proofOfCollection;
   });
   setMounts(next);setData(nextData);
  }

  async function load(attempt=0){
   try{bookings=await getSharedBookings(attempt>0);if(cancelled)return;mountProof();}
   catch{if(!cancelled&&attempt<6)retryTimer=setTimeout(()=>load(attempt+1),400*(attempt+1))}
  }

  load();
  observer=new MutationObserver(()=>mountProof());
  observer.observe(document.body,{childList:true,subtree:true});
  return()=>{cancelled=true;if(retryTimer)clearTimeout(retryTimer);observer?.disconnect();document.querySelectorAll('[data-customer-poc]').forEach(n=>n.remove())}
 },[pathname]);
 return <>{mounts.map(({el,bookingId})=>{const d=data[bookingId];if(!d?.submittedAt)return null;return createPortal(<section className="infoPanel podViewer"><div className="subHeading"><h3>Proof of collection</h3><span className="statusPill successPill">Completed</span></div><div className="infoRow"><span>Vehicle released by</span><b>{d.releasedByName||'Recorded'}</b></div><div className="infoRow"><span>Completed</span><b>{new Date(d.submittedAt).toLocaleString('en-GB')}</b></div><div className="infoRow"><span>Vehicle condition</span><b>{d.condition==='EXISTING_DAMAGE'?'Existing damage recorded':'No existing damage reported'}</b></div>{d.damageNotes&&<p className="muted"><b>Existing damage:</b> {d.damageNotes}</p>}<div className="podEvidenceLinks">{d.photos?.map((p:any,i:number)=><a key={p.id} className="evidenceRow" href={`/api/evidence/${p.id}`} target="_blank" rel="noreferrer"><span>📷</span><div><b>Collection photo {i+1}</b><small>Secure proof of collection image</small></div><strong>View →</strong></a>)}{d.signature&&<a className="evidenceRow" href={`/api/evidence/${d.signature.id}`} target="_blank" rel="noreferrer"><span>✍️</span><div><b>Release signature</b><small>Secure signed collection confirmation</small></div><strong>View →</strong></a>}</div></section>,el)})}</>
}
