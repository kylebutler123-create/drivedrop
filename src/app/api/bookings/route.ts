import {availabilityForAccount} from '@/lib/price-visibility';
import {after,NextResponse} from 'next/server';
import {z} from 'zod';
import {currentUser} from '@/lib/auth';
import {apiError,parseJson} from '@/lib/api';
import {selectQuote} from '@/lib/availability';
import {authoriseRequest} from '@/lib/booking-authorisation';
import {notifyAvailability} from '@/lib/availability-notifications';
const S=z.object({quoteId:z.string().min(1),collectionFrom:z.string().optional(),collectionUntil:z.string().optional()});
export async function POST(r:Request){try{
 const u=await currentUser();if(!u||u.role!=='CUSTOMER')return NextResponse.json({error:'Customer login required'},{status:403});
 const d=await parseJson(r,S);const result=await selectQuote(u,d.quoteId,d);
 const authorised=await authoriseRequest(u,result.request.id);
 if(authorised.request.status==='AWAITING_TRANSPORTER'&&result.created)after(()=>notifyAvailability(result.request.id));
 return NextResponse.json({...availabilityForAccount(authorised.request,u.role),checkoutUrl:authorised.checkoutUrl},{status:result.created?201:200});
}catch(e){return apiError(e,'Unable to request transporter availability');}}
