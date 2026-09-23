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
 if(!user||user.role!=='CUSTOMER')return NextResponse.json({error:'Customer access required'},{status:403});
 const parsed=RequestBody.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Invalid request'},{status:400});
 const booking=await prisma.booking.findFirst({
  where:{id:parsed.data.bookingId,customerId:user.id,status:'CANCELLED'},
  select:{id:true,trackingEvents:{where:{status:'CANCELLED'},orderBy:{createdAt:'desc'},take:1,select:{id:true}}}
 });
 if(!booking)return NextResponse.json({error:'Cancelled delivery not found'},{status:404});
 const expectedEventKey=`CANCELLED:${booking.trackingEvents[0]?.id||''}`;
 if(parsed.data.eventKey!==expectedEventKey)return NextResponse.json({error:'Delivery activity has changed. Refresh and try again.'},{status:409});
 await prisma.booking.update({where:{id:booking.id},data:{customerCancellationSeenEventKey:expectedEventKey}});
 return NextResponse.json({ok:true,eventKey:expectedEventKey},{headers:{'Cache-Control':'no-store, max-age=0'}});
}
