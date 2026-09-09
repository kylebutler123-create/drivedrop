import {NextResponse} from 'next/server';
import {sendInsuranceExpiryNotifications} from '@/lib/insurance-expiry-notifications';

export const dynamic='force-dynamic';

export async function GET(request:Request){
 const cronSecret=process.env.CRON_SECRET;
 if(!cronSecret||request.headers.get('authorization')!==`Bearer ${cronSecret}`){
  return new NextResponse('Unauthorized',{status:401});
 }

 const result=await sendInsuranceExpiryNotifications();
 return NextResponse.json({ok:true,...result},{headers:{'Cache-Control':'no-store, max-age=0'}});
}
