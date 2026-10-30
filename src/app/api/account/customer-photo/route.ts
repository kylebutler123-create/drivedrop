import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {PROFILE_BUCKET,validateProfileImage} from '@/lib/supabase-storage';
import {customerPhotoConfig as config,customerPhotoHeaders as noCache,readCustomerPhoto} from '@/lib/customer-photo-storage';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 const user=await currentUser();
 if(!user||user.role!=='CUSTOMER')return new NextResponse(null,{status:403,headers:noCache});
 return readCustomerPhoto(user.id);
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
