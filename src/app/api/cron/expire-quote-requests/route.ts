import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {openQuoteRequestsWhere} from '@/lib/job-expiry';

export const dynamic='force-dynamic';

// Compatibility endpoint for the existing schedule. Expiry is evaluated on reads;
// requests and quotes are retained, and no booking or financial record is changed.
export async function GET(){
 const expired=await prisma.transportJob.count({where:{status:{in:['OPEN','QUOTED']},NOT:openQuoteRequestsWhere()}});
 return NextResponse.json({ok:true,expired,deleted:0,historyPreserved:true});
}
