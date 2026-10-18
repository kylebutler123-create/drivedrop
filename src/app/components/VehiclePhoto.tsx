'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {vehiclePhotoUrl} from '@/lib/vehicle-photo';
import '../vehicle-photo.css';
export default function VehiclePhoto({job,children}:{job:{id?:string;vehiclePhotoPath?:string|null};children:ReactNode}){
 const [desktop,setDesktop]=useState(false);
 useEffect(()=>{const query=window.matchMedia('(min-width:1024px)');const sync=()=>setDesktop(query.matches);sync();query.addEventListener('change',sync);return()=>query.removeEventListener('change',sync)},[]);
 const [override,setOverride]=useState<{id:string;url:string|null}|null>(null),[failed,setFailed]=useState<string|null>(null);
 useEffect(()=>{const update=(event:Event)=>{const data=(event as CustomEvent).detail;if(data?.jobId===job.id)setOverride({id:data.jobId,url:data.url})};window.addEventListener('drivedrop-vehicle-photo-updated',update);return()=>window.removeEventListener('drivedrop-vehicle-photo-updated',update)},[job.id]);
 const url=override&&override.id===job.id?override.url:vehiclePhotoUrl(job);
 if(!desktop)return <>{children}</>;
 return <span className="vehiclePhotoSymbol">{url&&failed!==url?<><img className="vehiclePhotoThumbnail" src={url} alt="Customer's vehicle" onError={()=>setFailed(url)}/><span className="vehiclePhotoMobileFallback">{children}</span></>:children}</span>;
}
