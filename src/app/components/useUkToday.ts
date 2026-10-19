'use client';
import {useEffect,useState} from 'react';
import {ukParts} from '@/lib/availability-time';
export default function useUkToday(){
 const [today,setToday]=useState(()=>ukParts().date);
 useEffect(()=>{const update=()=>setToday(ukParts().date);update();const timer=window.setInterval(update,15000);window.addEventListener('focus',update);return()=>{window.clearInterval(timer);window.removeEventListener('focus',update)}},[]);
 return today;
}
