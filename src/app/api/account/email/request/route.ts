import {NextResponse} from 'next/server';
import bcrypt from 'bcryptjs';
import {z} from 'zod';
import {currentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {createEmailChangeToken,cancelEmailChangeTokens} from '@/lib/email-change';
import {sendTransactionalEmailSafely} from '@/lib/email';
import {checkRateLimit,rateLimitResponse} from '@/lib/rate-limit';

const Schema=z.object({newEmail:z.string().trim().email(),currentPassword:z.string().min(1)});

export async function POST(request:Request){
  const user=await currentUser();
  if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
  const parsed=Schema.safeParse(await request.json());
  if(!parsed.success)return NextResponse.json({error:'Enter a valid email address and your current password'},{status:400});
  const newEmail=parsed.data.newEmail.toLowerCase();
  const limit=checkRateLimit(request,'email-change',5,60*60*1000,user.id);
  if(!limit.allowed)return rateLimitResponse(limit.retryAfterSeconds);

  const current=await prisma.user.findUnique({where:{id:user.id},select:{email:true,passwordHash:true}});
  if(!current)return NextResponse.json({error:'Account not found'},{status:404});
  if(!(await bcrypt.compare(parsed.data.currentPassword,current.passwordHash)))return NextResponse.json({error:'Current password is incorrect'},{status:401});
  if(newEmail===current.email.toLowerCase())return NextResponse.json({error:'That is already your account email'},{status:400});
  const existing=await prisma.user.findUnique({where:{email:newEmail},select:{id:true}});
  if(existing)return NextResponse.json({error:'That email address is already in use'},{status:409});

  const {token}=await createEmailChangeToken(user.id,newEmail);
  const sent=await sendTransactionalEmailSafely({
    to:newEmail,
    subject:'Confirm your new DriveDrop email address',
    heading:'Confirm your new email address',
    body:`A request was made to change the login email on your DriveDrop account to ${newEmail}. Your current email remains active until you confirm this change. This link expires in 1 hour.`,
    ctaLabel:'Confirm new email',
    ctaPath:`/api/account/email/confirm?token=${encodeURIComponent(token)}`,
    preheader:'Confirm your new DriveDrop login email'
  });
  if(!sent.sent){
    await cancelEmailChangeTokens(user.id);
    return NextResponse.json({error:'We could not send the verification email. Please try again shortly.'},{status:503});
  }
  return NextResponse.json({ok:true,message:`Verification sent to ${newEmail}. Your current login email stays active until you confirm it.`});
}
