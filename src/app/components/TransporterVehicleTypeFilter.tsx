'use client';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';

const vehicleTypes=['Car','Motorcycle','Van','Motor home','Truck','Caravan','Plant machine','Farm machine'];
const normalise=(value:string)=>value.trim().toLowerCase().replace(/\s+/g,' ');

export default function TransporterVehicleTypeFilter(){
 const pathname=usePathname();
 const[selected,setSelected]=useState('ALL');
 useEffect(()=>{
  if(pathname!=='/transporter')return;
  let cancelled=false;
  const apply=()=>{
   if(cancelled)return;
   const section=document.getElementById('available-jobs');
   if(!section)return;
   const cards=Array.from(section.querySelectorAll<HTMLElement>('.jobOpportunity'));
   let visible=0;
   cards.forEach(card=>{
    const fact=Array.from(card.querySelectorAll<HTMLElement>('.transporterCollapsedFacts span')).find(row=>normalise(row.querySelector('small')?.textContent||'')==='vehicle');
    const vehicle=normalise(fact?.querySelector('b')?.textContent||card.querySelector('.jobQuickFacts>div:first-child b')?.textContent||'');
    const show=selected==='ALL'||vehicle===normalise(selected);
    card.style.display=show?'':'none';
    if(show)visible+=1;
   });
   const count=section.querySelector<HTMLElement>('[data-filtered-job-count]');
   if(count)count.textContent=String(visible);
  };
  const mount=()=>{
   const section=document.getElementById('available-jobs');
   const heading=section?.querySelector('.dashboardSectionHeading');
   if(!section||!heading||section.querySelector('[data-vehicle-filter]')){apply();return;}
   const bar=document.createElement('div');
   bar.dataset.vehicleFilter='true';
   bar.className='transporterVehicleFilter';
   const label=document.createElement('label');label.textContent='Vehicle type';
   const select=document.createElement('select');
   select.innerHTML=`<option value="ALL">All vehicle types</option>${vehicleTypes.map(type=>`<option value="${type}">${type}</option>`).join('')}`;
   select.value=selected;
   select.addEventListener('change',()=>setSelected(select.value));
   const result=document.createElement('span');result.innerHTML=`<b data-filtered-job-count>0</b> jobs shown`;
   bar.append(label,select,result);
   heading.insertAdjacentElement('afterend',bar);
   apply();
  };
  mount();
  const observer=new MutationObserver(()=>{mount();apply()});
  observer.observe(document.body,{childList:true,subtree:true});
  return()=>{cancelled=true;observer.disconnect();document.querySelector('[data-vehicle-filter]')?.remove();document.querySelectorAll<HTMLElement>('#available-jobs .jobOpportunity').forEach(card=>card.style.display='')};
 },[pathname,selected]);
 return null;
}
