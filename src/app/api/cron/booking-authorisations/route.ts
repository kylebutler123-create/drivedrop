import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {reconcileRequest} from '@/lib/booking-authorisation';
import {paymentEnvironment} from '@/lib/booking-authorisation-provider';
import {notifyAvailability} from '@/lib/availability-notifications';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 if(!process.env.CRON_SECRET||request.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:'Forbidden'},{status:403});
 const rows=await prisma.availabilityRequest.findMany({where:{paymentEnvironment:paymentEnvironment(),OR:[{status:'CAPTURING'},{paymentState:'RELEASE_PENDING'},{status:{in:['AWAITING_AUTHORISATION','AWAITING_TRANSPORTER']},respondBy:{lte:new Date()}}]},orderBy:{updatedAt:'asc'},take:100});
 let failed=0;for(const row of rows){try{const next=await reconcileRequest(row.id);if(next.status!==row.status)await notifyAvailability(row.id);}catch{failed++;}}
 return NextResponse.json({checked:rows.length,failed},{status:failed?503:200});
}
