'use client';

let cached:any[]|null=null;
let cachedAt=0;
let inflight:Promise<any[]>|null=null;
const TTL=15000;

export async function getSharedBookings(force=false){
 const now=Date.now();
 // Always share an in-flight request, including forced retry calls. Previously
 // force=true bypassed this guard, so several page enhancers could retry the
 // same heavy endpoint simultaneously when the database was already slow.
 if(inflight)return inflight;
 if(!force&&cached&&now-cachedAt<TTL)return cached;
 inflight=fetch('/api/my-bookings',{cache:'no-store'}).then(async r=>{
  if(!r.ok)throw new Error('Unable to load bookings');
  const data=await r.json();
  cached=Array.isArray(data)?data:[];
  cachedAt=Date.now();
  return cached;
 }).finally(()=>{inflight=null});
 return inflight;
}

export function clearSharedBookings(){cached=null;cachedAt=0;}
