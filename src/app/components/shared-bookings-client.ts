'use client';

let cached:any[]|null=null;
let cachedAt=0;
let inflight:Promise<any[]>|null=null;
const TTL=5000;

export async function getSharedBookings(force=false){
 const now=Date.now();
 if(!force&&cached&&now-cachedAt<TTL)return cached;
 if(!force&&inflight)return inflight;
 inflight=fetch('/api/my-bookings',{cache:'no-store'}).then(async r=>{
  if(!r.ok)throw new Error('Unable to load bookings');
  const data=await r.json();
  cached=Array.isArray(data)?data:[];
  cachedAt=Date.now();
  return cached;
 }).finally(()=>{inflight=null});
 return inflight;
}

export function clearSharedBookings(){cached=null;cachedAt=0;inflight=null;}
