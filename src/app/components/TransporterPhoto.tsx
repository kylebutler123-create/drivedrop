'use client';

import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {PhotoOrInitials} from './MobileCustomerPhoto';

type PhotoState={url:string|null;update:(url:string|null)=>void};
const TransporterPhotoContext=createContext<PhotoState|null>(null);

/** The layout owns the photo, so navigation does not replace it with initials. */
export function TransporterPhotoProvider({initialUrl,children}:{initialUrl:string|null;children:ReactNode}){
 const [url,setUrl]=useState(initialUrl);
 const requested=useRef(initialUrl),sequence=useRef(0);
 const update=useCallback((next:string|null)=>{
  if(next===requested.current)return;
  requested.current=next;
  const current=++sequence.current;
  if(!next){setUrl(null);return}
  const image=new Image();image.src=next;
  // Preserve the current portrait until its replacement is ready to display.
  void image.decode().then(()=>{if(current===sequence.current)setUrl(next)})
   .catch(()=>{if(current===sequence.current)setUrl(null)});
 },[]);
 useEffect(()=>{update(initialUrl)},[initialUrl,update]);
 useEffect(()=>()=>{sequence.current++},[]);
 const value=useMemo(()=>({url,update}),[url,update]);
 return <TransporterPhotoContext.Provider value={value}>{children}</TransporterPhotoContext.Provider>;
}

export function useTransporterPhotoUpdate(){return useContext(TransporterPhotoContext)?.update}

export default function TransporterPhoto({name,initialUrl=null}:{name:string;initialUrl?:string|null}){
 const photo=useContext(TransporterPhotoContext);
 return <PhotoOrInitials url={photo?photo.url:initialUrl} name={name}/>;
}
