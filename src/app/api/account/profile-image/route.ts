import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {createProfileStoragePath,profileImageUrl,removeProfileImage,uploadProfileImage,validateProfileImage,type ProfileImageKind} from '@/lib/supabase-storage';

type ProfilePaths={id:string;profileImagePath:string|null;transporterPhotoPath:string|null;truckPhotoPath:string|null};

function mediaKind(value:FormDataEntryValue|string|null):ProfileImageKind|null{
  if(value===null)return 'logo';
  return value==='logo'||value==='transporter'||value==='truck'?value:null;
}

function pathForKind(profile:ProfilePaths,kind:ProfileImageKind){
  return kind==='logo'?profile.profileImagePath:kind==='transporter'?profile.transporterPhotoPath:profile.truckPhotoPath;
}

function columnForKind(kind:ProfileImageKind){
  return kind==='logo'?'"profileImagePath"':kind==='transporter'?'"transporterPhotoPath"':'"truckPhotoPath"';
}

async function findProfile(userId:string){
  const rows=await prisma.$queryRawUnsafe<ProfilePaths[]>('SELECT id, "profileImagePath", "transporterPhotoPath", "truckPhotoPath" FROM "TransporterVerification" WHERE "transporterId" = $1 LIMIT 1',userId);
  return rows[0];
}

async function updatePath(id:string,kind:ProfileImageKind,path:string|null){
  const column=columnForKind(kind);
  await prisma.$executeRawUnsafe('UPDATE "TransporterVerification" SET '+column+' = $1, "updatedAt" = NOW() WHERE id = $2',path,id);
}

export async function POST(request:Request){
  const user=await currentUser();
  if(!user||user.role!=='TRANSPORTER')return NextResponse.json({error:'Transporter access required'},{status:403});
  const form=await request.formData();
  const kind=mediaKind(form.get('kind'));
  if(!kind)return NextResponse.json({error:'Choose a valid profile image type'},{status:400});
  const file=form.get('file');
  if(!(file instanceof File))return NextResponse.json({error:'Choose an image to upload'},{status:400});
  const validation=await validateProfileImage(file);
  if(!validation.ok)return NextResponse.json({error:validation.error},{status:400});
  const verification=await findProfile(user.id);
  if(!verification)return NextResponse.json({error:'Save your transporter business details first'},{status:400});
  const previousPath=pathForKind(verification,kind);
  const nextPath=createProfileStoragePath(user.id,kind,validation.extension);
  try{
    await uploadProfileImage(nextPath,file);
    await updatePath(verification.id,kind,nextPath);
    if(previousPath)await removeProfileImage(previousPath).catch(error=>console.error('Previous profile image cleanup failed',error));
    return NextResponse.json({kind,path:nextPath,url:profileImageUrl(nextPath)});
  }catch(error){
    console.error('Profile image upload failed',error);
    await removeProfileImage(nextPath).catch(()=>undefined);
    return NextResponse.json({error:'Unable to upload profile image right now'},{status:500});
  }
}

export async function DELETE(request:Request){
  const user=await currentUser();
  if(!user||user.role!=='TRANSPORTER')return NextResponse.json({error:'Transporter access required'},{status:403});
  const kind=mediaKind(new URL(request.url).searchParams.get('kind'));
  if(!kind)return NextResponse.json({error:'Choose a valid profile image type'},{status:400});
  const verification=await findProfile(user.id);
  if(!verification)return NextResponse.json({error:'Transporter profile not found'},{status:404});
  const previousPath=pathForKind(verification,kind);
  await updatePath(verification.id,kind,null);
  if(previousPath)await removeProfileImage(previousPath).catch(error=>console.error('Profile image cleanup failed',error));
  return NextResponse.json({ok:true,kind});
}
