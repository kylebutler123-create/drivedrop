import {after,NextResponse} from 'next/server';
import {paymentEnvironment} from '@/lib/booking-authorisation-provider';
import {claimPreviewRecoveryRun,completePreviewRecoveryRun,reconcileBookingAuthorisations} from '@/lib/booking-authorisation-recovery';
export const dynamic='force-dynamic';
export const maxDuration=180;
export async function GET(request:Request){
 if(!process.env.CRON_SECRET||request.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:'Forbidden'},{status:403});
 if(new URL(request.url).searchParams.get('dispatch')==='1'){
  if(paymentEnvironment()!=='preview')return NextResponse.json({error:'Preview recovery only'},{status:403});
  try{
   const run=await claimPreviewRecoveryRun();
   if(!run)return NextResponse.json({error:'Recovery dispatcher busy'},{status:503});
   if(run.created)after(()=>completePreviewRecoveryRun(run.id));
   // Accepted is deliberately distinct from completed. The private run record is
   // the completion evidence; next minute's tick retries interrupted work.
   return NextResponse.json({accepted:true,runId:run.id,reused:!run.created},{status:202});
  }catch{
   console.error('Preview recovery dispatch failed');
   return NextResponse.json({error:'Recovery dispatch failed'},{status:503});
  }
 }
 const result=await reconcileBookingAuthorisations();
 return NextResponse.json(result,{status:result.failed?503:200});
}
