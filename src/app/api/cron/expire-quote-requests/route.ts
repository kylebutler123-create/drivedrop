import {NextResponse} from 'next/server';
import {deleteExpiredQuoteRequests} from '@/lib/job-expiry';

export const dynamic='force-dynamic';

export async function GET(){
 const deleted=await deleteExpiredQuoteRequests();
 return NextResponse.json({ok:true,deleted});
}
