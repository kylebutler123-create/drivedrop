import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';

export const dynamic='force-dynamic';
export const revalidate=0;

export async function GET(){
 const user=await currentUser();
 if(!user||user.role!=='TRANSPORTER')return NextResponse.json({error:'Unauthorized'},{status:401,headers:{'Cache-Control':'no-store, max-age=0'}});
 const [bookings,payoutDetails] = await Promise.all([
  prisma.booking.findMany({
   where:{transporterId:user.id,status:'DELIVERED'},
   select:{
    id:true,status:true,agreedPricePence:true,customerConfirmedAt:true,createdAt:true,
    job:{select:{id:true,collection:true,delivery:true,vehicleMake:true,vehicleModel:true,registration:true,running:true,collectionDate:true}},
    customer:{select:{name:true}},
    trackingEvents:{where:{status:'DELIVERED'},select:{createdAt:true,note:true},orderBy:{createdAt:'desc'},take:1},
    evidence:{select:{id:true,type:true,note:true,createdAt:true},orderBy:{createdAt:'asc'}},
    payment:{select:{transporterProceedsPence:true,payoutStatus:true,status:true}}
   },
   orderBy:{createdAt:'desc'}
  }),
  prisma.$queryRaw<any[]>`SELECT "id" FROM "TransporterPayoutDetails" WHERE "userId"=${user.id} LIMIT 1`
 ]);
 const jobIds=bookings.map(booking=>booking.job.id);
 const vehicleRows=jobIds.length?await prisma.$queryRawUnsafe<Array<{id:string;vehicleType:string|null}>>(`SELECT "id", "vehicleType" FROM "TransportJob" WHERE "id" IN (${jobIds.map((_,i)=>`$${i+1}`).join(',')})`,...jobIds):[];
 const vehicleTypes=new Map(vehicleRows.map(row=>[row.id,row.vehicleType]));
 const completedBookings=bookings
  .map(booking=>({...booking,job:{...booking.job,vehicleType:vehicleTypes.get(booking.job.id)||null}}))
  .sort((a,b)=>{
   const aCompletedAt=new Date(a.trackingEvents[0]?.createdAt||a.createdAt).getTime();
   const bCompletedAt=new Date(b.trackingEvents[0]?.createdAt||b.createdAt).getTime();
   return bCompletedAt-aCompletedAt;
  });
 const deliveredProceedsPence=completedBookings.reduce((total,booking)=>total+(booking.payment?.transporterProceedsPence||0),0);
 return NextResponse.json({bookings:completedBookings,deliveredProceedsPence,payoutDetailsComplete:payoutDetails.length>0},{headers:{'Cache-Control':'no-store, max-age=0'}});
}
