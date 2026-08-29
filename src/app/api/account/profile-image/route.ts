import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {createProfileStoragePath,profileImageUrl,removeProfileImage,uploadProfileImage,validateProfileImage} from '@/lib/supabase-storage';

export async function POST(request:Request){
  const user=await currentUser();
  if(!user||user.role!=='TRANSPORTER')return NextResponse.json({error:'Transporter access required'},{status:403});
  const form=await request.formData();
  const file=form.get('file');
  if(!(file instanceof File))return NextResponse.json({error:'Choose an image to upload'},{status:400});
  const validation=await validateProfileImage(file);
  if(!validation.ok)return NextResponse.json({error:validation.error},{status:400});
  const rows=await prisma.$queryRaw<Array<{id:string;profileImagePath:string|null}>>`SELECT id, "profileImagePath" FROM "TransporterVerification" WHERE "transporterId"=${user.id} LIMIT 1`;
  const verification=rows[0];
  if(!verification)return NextResponse.json({error:'Save your transporter business details first'},{status:400});
  const nextPath=createProfileStoragePath(user.id,validation.extension);
  try{
    await uploadProfileImage(nextPath,file);
    await prisma.$executeRaw`UPDATE "TransporterVerification" SET "profileImagePath"=${nextPath}, "updatedAt"=NOW() WHERE id=${verification.id}`;
    if(verification.profileImagePath)await removeProfileImage(verification.profileImagePath);
    return NextResponse.json({path:nextPath,url:profileImageUrl(nextPath)});
  }catch(error){console.error('Profile image upload failed',error);return NextResponse.json({error:'Unable to upload profile image right now'},{status:500});}
}

export async function DELETE(){
  const user=await currentUser();
  if(!user||user.role!=='TRANSPORTER')return NextResponse.json({error:'Transporter access required'},{status:403});
  const rows=await prisma.$queryRaw<Array<{id:string;profileImagePath:string|null}>>`SELECT id, "profileImagePath" FROM "TransporterVerification" WHERE "transporterId"=${user.id} LIMIT 1`;
  const verification=rows[0];
  if(!verification)return NextResponse.json({error:'Transporter profile not found'},{status:404});
  await prisma.$executeRaw`UPDATE "TransporterVerification" SET "profileImagePath"=NULL, "updatedAt"=NOW() WHERE id=${verification.id}`;
  if(verification.profileImagePath)await removeProfileImage(verification.profileImagePath);
  return NextResponse.json({ok:true});
}
