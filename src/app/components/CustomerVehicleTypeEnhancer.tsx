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
  let attempts=0;
  const initialise=()=>{
   if(cancelled)return;
   const panel=document.querySelector<HTMLElement>('.requestPanel');
   const grid=panel?.querySelector<HTMLElement>('form .grid');
   if(!grid){
    attempts+=1;
    if(attempts<30)window.setTimeout(initialise,50);
    return;
   }
   grid.querySelector('[data-vehicle-type-field]')?.remove();
   grid.querySelector('[data-registration-field]')?.remove();
   const mount=document.createElement('div');
   mount.dataset.vehicleTypeField='true';
   mount.className='field';
   const registrationMount=document.createElement('div');
   registrationMount.dataset.registrationField='true';
   registrationMount.className='field';
   const makeField=Array.from(grid.children).find(child=>child.textContent?.includes('MAKE'));
   if(makeField){
    grid.insertBefore(mount,makeField);
    const modelField=Array.from(grid.children).find(child=>child.textContent?.includes('MODEL'));
    if(modelField?.nextSibling)grid.insertBefore(registrationMount,modelField.nextSibling);else grid.appendChild(registrationMount);
   }else{
    grid.appendChild(mount);
    grid.appendChild(registrationMount);
   }
   setTarget(mount);setRegistrationTarget(registrationMount);
  };
  initialise();
  return()=>{cancelled=true;document.querySelector('[data-vehicle-type-field]')?.remove();document.querySelector('[data-registration-field]')?.remove()};
 },[pathname]);
 return <>{target&&createPortal(<><label>VEHICLE TYPE</label><select name="vehicleType" required defaultValue=""><option value="" disabled>Select vehicle type</option>{vehicleTypes.map(type=><option key={type} value={type}>{type}</option>)}</select></>,target)}{registrationTarget&&createPortal(<><label>REGISTRATION</label><input name="registration" maxLength={20} placeholder="e.g. AB12 CDE" autoCapitalize="characters"/></>,registrationTarget)}</>;
}
