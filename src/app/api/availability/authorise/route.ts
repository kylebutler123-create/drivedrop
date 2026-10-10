import {availabilityForAccount} from '@/lib/price-visibility';
import {after,NextResponse} from 'next/server';
import {z} from 'zod';
import {currentUser} from '@/lib/auth';
import {apiError,parseJson} from '@/lib/api';
import {authoriseRequest} from '@/lib/booking-authorisation';
import {authorisationProvider} from '@/lib/booking-authorisation-provider';
import {notifyAvailability} from '@/lib/availability-notifications';
export async function GET(){try{return NextResponse.json({provider:authorisationProvider(),testMode:true});}catch(e){return apiError(e,'Payments unavailable');}}
export async function POST(r:Request){try{
 const user=await currentUser();if(!user)return NextResponse.json({error:'Login required'},{status:403});
 const {requestId}=await parseJson(r,z.object({requestId:z.string().min(1)}));
 const result=await authoriseRequest(user,requestId);
 if(result.request.status==='AWAITING_TRANSPORTER')after(()=>notifyAvailability(requestId));
 return NextResponse.json({...availabilityForAccount(result.request,user.role),checkoutUrl:result.checkoutUrl});
}catch(e){return apiError(e,'Unable to authorise payment');}}
