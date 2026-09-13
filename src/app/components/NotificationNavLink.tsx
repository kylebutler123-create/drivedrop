'use client';
import {useCallback,useEffect,useLayoutEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';

export default function NotificationNavLink(){
 const[count,setCount]=useState(0);
 const pathname=usePathname();
 const active=pathname==='/notifications'||pathname.startsWith('/notifications/');
 useLayoutEffect(()=>{try{const saved=sessionStorage.getItem('drivedrop:unread-notifications');if(saved!==null){const value=Number(saved);if(Number.isFinite(value)&&value>=0)setCount(value)}}catch{}},[]);
 const load=useCallback(async()=>{try{const r=await fetch('/api/notifications',{cache:'no-store'});if(r.ok){const d=await r.json();const value=Number(d.unread)||0;setCount(value);try{sessionStorage.setItem('drivedrop:unread-notifications',String(value))}catch{}}}catch{}},[]);
 useEffect(()=>{load();const update=()=>load();window.addEventListener('drivedrop:notifications-read',update);return()=>window.removeEventListener('drivedrop:notifications-read',update)},[load]);
 return <Link className={'headerStatusLink notificationsHeaderLink'+(count?' hasUnread':'')+(active?' isActive':'')} href="/notifications" aria-current={active?'page':undefined} aria-label={count?'Notifications, '+count+' unread':'Notifications'}><svg className="mobileNavIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg><span className="notificationDesktopLabel">Notifications</span><span className="notificationMobileLabel">Alerts</span>{count>0&&<span className="navCountBadge">{count>99?'99+':count}</span>}</Link>;
}
