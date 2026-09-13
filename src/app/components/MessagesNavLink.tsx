'use client';
import {useCallback,useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';

export default function MessagesNavLink(){
 const[count,setCount]=useState(0);
 const pathname=usePathname();
 const active=pathname==='/messages'||pathname.startsWith('/messages/');
 const refresh=useCallback(async()=>{try{const r=await fetch('/api/messages/unread-count',{cache:'no-store'});if(r.ok){const d=await r.json();setCount(Number(d.count)||0)}}catch{}},[]);
 useEffect(()=>{refresh();const onRead=()=>refresh();window.addEventListener('drivedrop:messages-read',onRead);return()=>window.removeEventListener('drivedrop:messages-read',onRead)},[refresh]);
 return <Link className={"headerStatusLink messagesHeaderLink"+(active?" isActive":"")} href="/messages" aria-current={active?"page":undefined}><svg className="mobileNavIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg><span>Messages</span>{count>0&&<span className="navCountBadge" aria-label={count+' unread message'+(count===1?'':'s')}>{count>99?'99+':count}</span>}</Link>;
}
