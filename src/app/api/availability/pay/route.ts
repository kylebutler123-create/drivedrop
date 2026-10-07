import {after,NextResponse} from 'next/server';
import {z} from 'zod';
import {currentUser} from '@/lib/auth';
import {apiError,parseJson} from '@/lib/api';
import {payConfirmedRequest} from '@/lib/availability';
import {notifyAvailability} from '@/lib/availability-notifications';
const S=z.object({requestId:z.string().min(1)});
export async function POST(r:Request){try{const u=await currentUser();if(!u)return NextResponse.json({error:'Customer login required'},{status:403});const d=await parseJson(r,S);const result=await payConfirmedRequest(u,d.requestId);if(result.created)after(()=>notifyAvailability(result.request.id));return NextResponse.json(result.booking);}catch(e){return apiError(e,'Unable to complete payment');}}
