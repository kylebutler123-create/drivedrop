'use client';
import Link from 'next/link';
import {useCallback,useEffect,useState} from 'react';

export default function NotificationNavLink(){
 const[count,setCount]=useState(0);
 const load=useCallback(async()=>{try{const r=await fetch('/api/notifications',{cache:'no-store'});if(r.ok){const d=await r.json();setCount(d.unread||0)}}catch{}},[]);
 useEffect(()=>{load();const update=()=>load();window.addEventListener('drivedrop:notifications-read',update);return()=>window.removeEventListener('drivedrop:notifications-read',update)},[load]);
 return <Link href="/notifications" style={{display:'inline-flex',alignItems:'center',gap:6,fontWeight:count?800:undefined}} aria-label={count?`Notifications, ${count} unread`:'Notifications'}>🔔 Notifications{count>0&&<span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',minWidth:20,height:20,padding:'0 6px',borderRadius:999,background:'#ff7a18',color:'#fff',fontSize:12,fontWeight:800}}>{count>99?'99+':count}</span>}</Link>;
}
