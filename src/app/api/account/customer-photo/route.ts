import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {PROFILE_BUCKET,validateProfileImage} from '@/lib/supabase-storage';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const noCache={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'};
function config(userId:string){
 const url=process.env.SUPABASE_URL?.replace(/\/$/,'');
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error('Storage unavailable');
 const scope=process.env.VERCEL_ENV==='production'?'production':'preview';
 const path=`customer-avatars/${scope}/${encodeURIComponent(userId)}/avatar`;
 return {url,path,headers:{apikey:key,Authorization:`Bearer ${key}`}};
}
function missing(status:number,body:string){return status===404||status===400&&/not.?found|does not exist/i.test(body)}
export async function GET(){
 const user=await currentUser();
 if(!user||user.role!=='CUSTOMER')return new NextResponse(null,{status:403,headers:noCache});
 try{
 const {url,path,headers}=config(user.id);
 const response=await fetch(`${url}/storage/v1/object/authenticated/${PROFILE_BUCKET}/${path}`,{headers,cache:'no-store'});
 if(!response.ok){const body=await response.text();return new NextResponse(null,{status:missing(response.status,body)?204:502,headers:noCache})}
 const type=response.headers.get('content-type')?.split(';')[0]||'';
 if(!['image/jpeg','image/png','image/webp'].includes(type))return new NextResponse(null,{status:502,headers:noCache});
 return new NextResponse(await response.arrayBuffer(),{headers:{...noCache,'Content-Type':type}});
 }catch{return new NextResponse(null,{status:503,headers:noCache})}
}
export async function POST(request:Request){
 const user=await currentUser();
 if(!user||user.role!=='CUSTOMER')return NextResponse.json({error:'Customer access required'},{status:403});
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin'},{status:403});
 if(Number(request.headers.get('content-length')||0)>3*1024*1024)return NextResponse.json({error:'Photo must be 2 MB or smaller'},{status:413});
 try{
 const form=await request.formData(),file=form.get('file');
 if(!(file instanceof File))return NextResponse.json({error:'Choose a photo to upload'},{status:400});
 const valid=await validateProfileImage(file);
 if(!valid.ok)return NextResponse.json({error:valid.error},{status:400});
 const {url,path,headers}=config(user.id);
 const response=await fetch(`${url}/storage/v1/object/${PROFILE_BUCKET}/${path}`,{method:'POST',headers:{...headers,'Content-Type':file.type,'x-upsert':'true','Cache-Control':'no-cache'},body:await file.arrayBuffer()});
 if(!response.ok)throw new Error('Storage write failed');
 return NextResponse.json({ok:true},{headers:noCache});
 }catch{return NextResponse.json({error:'Could not save your photo. Please try again.'},{status:500})}
}
export async function DELETE(request:Request){
 const user=await currentUser();
 if(!user||user.role!=='CUSTOMER')return NextResponse.json({error:'Customer access required'},{status:403});
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin'},{status:403});
 try{
 const {url,path,headers}=config(user.id);
 const response=await fetch(`${url}/storage/v1/object/${PROFILE_BUCKET}`,{method:'DELETE',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({prefixes:[path]})});
 if(!response.ok)throw new Error('Storage delete failed');
 return NextResponse.json({ok:true},{headers:noCache});
 }catch{return NextResponse.json({error:'Could not remove your photo. Please try again.'},{status:500})}
}
