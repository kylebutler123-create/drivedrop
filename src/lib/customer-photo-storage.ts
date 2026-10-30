import {NextResponse} from 'next/server';
import {PROFILE_BUCKET} from './supabase-storage';

export const customerPhotoHeaders = {'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','Vary':'Cookie'};

// Server-only storage access. Callers must authorise the requested customer first.
export function customerPhotoConfig(userId:string){
 const url=process.env.SUPABASE_URL?.replace(/\/$/,'');
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error('Storage unavailable');
 const scope=process.env.VERCEL_ENV==='production'?'production':'preview';
 const path=`customer-avatars/${scope}/${encodeURIComponent(userId)}/avatar`;
 return {url,path,headers:{apikey:key,Authorization:`Bearer ${key}`}};
}

export async function readCustomerPhoto(userId:string){
 try{
  const {url,path,headers}=customerPhotoConfig(userId);
  const response=await fetch(`${url}/storage/v1/object/authenticated/${PROFILE_BUCKET}/${path}`,{headers,cache:'no-store'});
  if(!response.ok){
   const body=await response.text();
   const missing=response.status===404||response.status===400&&/not.?found|does not exist/i.test(body);
   return new NextResponse(null,{status:missing?204:502,headers:customerPhotoHeaders});
  }
  const type=response.headers.get('content-type')?.split(';')[0]||'';
  if(!['image/jpeg','image/png','image/webp'].includes(type))return new NextResponse(null,{status:502,headers:customerPhotoHeaders});
  return new NextResponse(await response.arrayBuffer(),{headers:{...customerPhotoHeaders,'Content-Type':type}});
 }catch{return new NextResponse(null,{status:503,headers:customerPhotoHeaders})}
}
