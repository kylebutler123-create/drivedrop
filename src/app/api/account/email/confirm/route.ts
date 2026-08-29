import {NextResponse} from 'next/server';
import {confirmEmailChangeToken} from '@/lib/email-change';
import {sendTransactionalEmailSafely} from '@/lib/email';

export async function GET(request:Request){
  const url=new URL(request.url);
  const token=url.searchParams.get('token')||'';
  if(!token)return NextResponse.redirect(new URL('/login?emailChange=invalid',url.origin));
  const result=await confirmEmailChangeToken(token);
  if(!result.ok)return NextResponse.redirect(new URL(`/login?emailChange=${result.reason}`,url.origin));

  await sendTransactionalEmailSafely({
    to:result.oldEmail,
    subject:'Your DriveDrop email address was changed',
    heading:'Your account email has changed',
    body:`The login email for your DriveDrop account has been changed to ${result.newEmail}. If you did not make this change, contact DriveDrop support immediately.`,
    preheader:'DriveDrop account email changed'
  });
  return NextResponse.redirect(new URL(`/login?emailChange=confirmed&email=${encodeURIComponent(result.newEmail)}`,url.origin));
}
