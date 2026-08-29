import {NextResponse} from 'next/server';
import bcrypt from 'bcryptjs';
import {z} from 'zod';
import {currentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';

const Schema=z.object({
  currentPassword:z.string().min(1),
  newPassword:z.string().min(8).max(128),
  confirmPassword:z.string().min(8).max(128)
}).refine(d=>d.newPassword===d.confirmPassword,{message:'New passwords do not match',path:['confirmPassword']});

export async function PUT(request:Request){
  const sessionUser=await currentUser();
  if(!sessionUser)return NextResponse.json({error:'Sign in required'},{status:401});

  let body:unknown;
  try{body=await request.json()}catch{return NextResponse.json({error:'Invalid request'},{status:400})}
  const parsed=Schema.safeParse(body);
  if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||'Invalid password details'},{status:400});

  const user=await prisma.user.findUnique({where:{id:sessionUser.id},select:{passwordHash:true}});
  if(!user)return NextResponse.json({error:'Account not found'},{status:404});

  const currentValid=await bcrypt.compare(parsed.data.currentPassword,user.passwordHash);
  if(!currentValid)return NextResponse.json({error:'Current password is incorrect'},{status:400});
  if(await bcrypt.compare(parsed.data.newPassword,user.passwordHash))return NextResponse.json({error:'New password must be different from your current password'},{status:400});

  const passwordHash=await bcrypt.hash(parsed.data.newPassword,12);
  await prisma.user.update({where:{id:sessionUser.id},data:{passwordHash}});
  return NextResponse.json({ok:true});
}
