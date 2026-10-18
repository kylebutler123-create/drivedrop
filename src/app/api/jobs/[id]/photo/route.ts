import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';
import {isQuoteRequestOpen} from '@/lib/job-expiry';
import {decodeVehiclePhoto} from '@/lib/vehicle-photo-input';
import {vehiclePhotoUrl} from '@/lib/vehicle-photo';
import {createVehiclePhotoPath,uploadVehiclePhoto,downloadVehiclePhoto,removeVehiclePhoto} from '@/lib/supabase-storage';

export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,context:Context){
 const user=await currentUser();if(!user)return new Response(null,{status:401});
 const {id}=await context.params;
 const job=await prisma.transportJob.findUnique({where:{id},include:{booking:{select:{transporterId:true}},quotes:{select:{transporterId:true,status:true,expiresAt:true,proposedCollectionDate:true,dateNegotiationStatus:true}}}});
 if(!job)return new Response(null,{status:404});
 const permitted=user.role==='ADMIN'||job.customerId===user.id||(user.role==='TRANSPORTER'&&(job.booking?.transporterId===user.id||job.quotes.some(q=>q.transporterId===user.id)||isQuoteRequestOpen(job)));
 if(!permitted)return new Response(null,{status:403});
 if(!job.vehiclePhotoPath)return new Response(null,{status:404});
 const stored=await downloadVehiclePhoto(job.vehiclePhotoPath);
 if(!stored.ok||!stored.body)return new Response(null,{status:502});
 return new Response(stored.body,{headers:{'Content-Type':stored.headers.get('content-type')||'image/jpeg','Cache-Control':'private, no-store','Content-Disposition':'inline','X-Content-Type-Options':'nosniff'}});
}
export async function PATCH(request:Request,context:Context){
 const user=await currentUser();if(!user||user.role!=='CUSTOMER')return NextResponse.json({error:'Customer login required'},{status:403});
 const {id}=await context.params;
 const job=await prisma.transportJob.findFirst({where:{id,customerId:user.id},select:{id:true}});
 if(!job)return NextResponse.json({error:'Request not found'},{status:404});
 let newPath:string|null=null;
 try{
  const body=await request.json();
  if(!Object.prototype.hasOwnProperty.call(body,'vehiclePhoto'))return NextResponse.json({error:'Select a photo or choose Remove photo.'},{status:400});
  const photo=await decodeVehiclePhoto(body.vehiclePhoto);
  if(photo){newPath=createVehiclePhotoPath(user.id,photo.extension);await uploadVehiclePhoto(newPath,photo.file);}
  const result=await prisma.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM "TransportJob" WHERE id=${id} FOR UPDATE`;
   const current=await tx.transportJob.findFirstOrThrow({where:{id,customerId:user.id},select:{vehiclePhotoPath:true}});
   const updated=await tx.transportJob.update({where:{id},data:{vehiclePhotoPath:newPath},select:{id:true,vehiclePhotoPath:true}});
   return {updated,oldPath:current.vehiclePhotoPath};
  });
  if(result.oldPath)await removeVehiclePhoto(result.oldPath).catch(()=>{});
  return NextResponse.json({jobId:id,vehiclePhotoPath:newPath,url:vehiclePhotoUrl(result.updated)});
 }catch(error){
  if(newPath)await removeVehiclePhoto(newPath).catch(()=>{});
  return NextResponse.json({error:error instanceof Error&&/photo|file|image|JPG/i.test(error.message)?error.message:'Unable to save the vehicle photo. Please try again.'},{status:400});
 }
}
