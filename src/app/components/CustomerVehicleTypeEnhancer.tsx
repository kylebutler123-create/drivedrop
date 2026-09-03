'use client';
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {usePathname} from 'next/navigation';

const vehicleTypes=['Car','Motorcycle','Van','Motor home','Truck','Caravan','Plant machine','Farm machine'];

export default function CustomerVehicleTypeEnhancer(){
 const pathname=usePathname();
 const[target,setTarget]=useState<HTMLElement|null>(null);
 const[registrationTarget,setRegistrationTarget]=useState<HTMLElement|null>(null);
 useEffect(()=>{
  setTarget(null);setRegistrationTarget(null);
  if(pathname!=='/customer')return;
  let cancelled=false;
  let scheduled=false;
  const initialise=()=>{
   scheduled=false;
   if(cancelled)return;
   const panel=document.querySelector<HTMLElement>('.requestPanel');
   const grid=panel?.querySelector<HTMLElement>('form .grid');
   if(!grid){setTarget(null);setRegistrationTarget(null);return;}
   let mount=grid.querySelector<HTMLElement>('[data-vehicle-type-field]');
   let registrationMount=grid.querySelector<HTMLElement>('[data-registration-field]');
   if(!mount){
    mount=document.createElement('div');
    mount.dataset.vehicleTypeField='true';
    mount.className='field';
    const makeField=Array.from(grid.children).find(child=>child.textContent?.includes('MAKE'));
    if(makeField)grid.insertBefore(mount,makeField);else grid.appendChild(mount);
   }
   if(!registrationMount){
    registrationMount=document.createElement('div');
    registrationMount.dataset.registrationField='true';
    registrationMount.className='field';
    const modelField=Array.from(grid.children).find(child=>child.textContent?.includes('MODEL'));
    if(modelField?.nextSibling)grid.insertBefore(registrationMount,modelField.nextSibling);else grid.appendChild(registrationMount);
   }
   setTarget(current=>current===mount?current:mount!);
   setRegistrationTarget(current=>current===registrationMount?current:registrationMount!);
  };
  const scheduleInitialise=()=>{
   if(cancelled||scheduled)return;
   scheduled=true;
   window.requestAnimationFrame(initialise);
  };
  const observer=new MutationObserver(scheduleInitialise);
  observer.observe(document.body,{childList:true,subtree:true});
  scheduleInitialise();
  return()=>{
   cancelled=true;
   observer.disconnect();
   document.querySelector('[data-vehicle-type-field]')?.remove();
   document.querySelector('[data-registration-field]')?.remove();
  };
 },[pathname]);
 return <>{target&&createPortal(<><label htmlFor="request-vehicle-type">VEHICLE TYPE</label><select id="request-vehicle-type" name="vehicleType" required defaultValue=""><option value="" disabled>Select vehicle type</option>{vehicleTypes.map(type=><option key={type} value={type}>{type}</option>)}</select></>,target)}{registrationTarget&&createPortal(<><label htmlFor="request-registration">REGISTRATION</label><input id="request-registration" name="registration" maxLength={20} placeholder="e.g. AB12 CDE" autoCapitalize="characters"/></>,registrationTarget)}</>;
}
