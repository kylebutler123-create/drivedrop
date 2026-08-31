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
    job:{select:{collection:true,delivery:true,vehicleMake:true,vehicleModel:true,registration:true,collectionDate:true}},
    customer:{select:{name:true}},
    trackingEvents:{where:{status:'DELIVERED'},select:{createdAt:true,note:true},orderBy:{createdAt:'desc'},take:1},
    evidence:{select:{id:true,type:true,note:true,createdAt:true},orderBy:{createdAt:'asc'}},
    payment:{select:{transporterProceedsPence:true,payoutStatus:true,status:true}}
   },
   orderBy:{createdAt:'desc'}
  }),
  prisma.$queryRaw<any[]>`SELECT "id" FROM "TransporterPayoutDetails" WHERE "userId"=${user.id} LIMIT 1`
 ]);
 const deliveredProceedsPence=bookings.reduce((total,booking)=>total+(booking.payment?.transporterProceedsPence||0),0);
 return NextResponse.json({bookings,deliveredProceedsPence,payoutDetailsComplete:payoutDetails.length>0},{headers:{'Cache-Control':'no-store, max-age=0'}});
}
