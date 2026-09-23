import {NextResponse} from 'next/server';
import {z} from 'zod';
import {currentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';

const RequestBody=z.object({
 bookingId:z.string().min(1),
 eventKey:z.string().min(1).max(200)
});

export async function PATCH(request:Request){
 const user=await currentUser();
 if(!user||user.role!=='TRANSPORTER')return NextResponse.json({error:'Transporter access required'},{status:403});
 const parsed=RequestBody.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Invalid request'},{status:400});
 const booking=await prisma.booking.findFirst({
  where:{id:parsed.data.bookingId,transporterId:user.id,status:'DELIVERED',customerConfirmedAt:{not:null},payment:{payoutStatus:'READY'}},
  select:{id:true,customerConfirmedAt:true}
 });
 if(!booking||!booking.customerConfirmedAt)return NextResponse.json({error:'Ready delivery not found'},{status:404});
 const expectedEventKey=`READY:${booking.customerConfirmedAt.toISOString()}`;
 if(parsed.data.eventKey!==expectedEventKey)return NextResponse.json({error:'Delivery activity has changed. Refresh and try again.'},{status:409});
 await prisma.booking.update({where:{id:booking.id},data:{transporterReadySeenEventKey:expectedEventKey}});
 return NextResponse.json({ok:true,eventKey:expectedEventKey},{headers:{'Cache-Control':'no-store, max-age=0'}});
}
