'use client';
import {useCallback,useEffect,useState} from 'react';

export default function MessagesNavLink(){
 const[count,setCount]=useState(0);
 const refresh=useCallback(async()=>{try{const r=await fetch('/api/messages/unread-count',{cache:'no-store'});if(r.ok){const d=await r.json();setCount(Number(d.count)||0)}}catch{}},[]);
 useEffect(()=>{refresh();const onRead=()=>refresh();window.addEventListener('drivedrop:messages-read',onRead);return()=>window.removeEventListener('drivedrop:messages-read',onRead)},[refresh]);
 return <a href="/messages" style={{display:'inline-flex',alignItems:'center',gap:6}}>Messages{count>0&&<span aria-label={`${count} unread message${count===1?'':'s'}`} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',minWidth:20,height:20,padding:'0 6px',borderRadius:999,background:'#ff7a18',color:'#fff',fontSize:12,fontWeight:800,lineHeight:1}}>{count>99?'99+':count}</span>}</a>;
}
