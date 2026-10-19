import {timingSafeEqual} from 'node:crypto';
import {NextResponse} from 'next/server';
import {sendDailyJobDigest} from '@/lib/job-digest';

export const dynamic='force-dynamic';
export const maxDuration=300;

export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;
 const received=Buffer.from(request.headers.get('authorization')||'');
 const expected=Buffer.from(`Bearer ${secret||''}`);
 if(!secret||received.length!==expected.length||!timingSafeEqual(received,expected))return new NextResponse('Unauthorized',{status:401});
 try{
  const result=await sendDailyJobDigest();
  return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  console.error('Daily job summary failed',error);
  return NextResponse.json({error:'Daily summary paused. Retry this endpoint to resume safely.'},{status:503,headers:{'Cache-Control':'no-store','Retry-After':'60'}});
 }
}
