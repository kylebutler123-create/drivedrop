import {payoutAccountReadiness} from '@/lib/stripe-connect-accounts';
import {transporterRefund} from '@/lib/price-visibility';
import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';
import {Prisma} from '@prisma/client';

export const dynamic='force-dynamic';
export const revalidate=0;

export async function GET(){
 const user=await currentUser();
 if(!user||user.role!=='TRANSPORTER')return NextResponse.json({error:'Unauthorized'},{status:401,headers:{'Cache-Control':'no-store, max-age=0'}});
 const [bookings,payoutDetails] = await Promise.all([
  prisma.booking.findMany({
   where:{transporterId:user.id,status:'DELIVERED'},
   select:{
    id:true,status:true,agreedPricePence:true,customerConfirmedAt:true,transporterAwaitingSeenEventKey:true,transporterReadySeenEventKey:true,transporterPaidSeenEventKey:true,deliveryLatitude:true,deliveryLongitude:true,deliveryLocationAccuracyMeters:true,deliveryLocationCapturedAt:true,createdAt:true,
    job:{select:{id:true,vehiclePhotoPath:true,collection:true,delivery:true,vehicleMake:true,vehicleModel:true,registration:true,running:true,transportType:true,collectionDate:true}},
    customer:{select:{name:true,phone:true}},
    trackingEvents:{select:{id:true,status:true,createdAt:true,note:true},orderBy:{createdAt:'desc'}},
    evidence:{select:{id:true,type:true,note:true,createdAt:true},orderBy:{createdAt:'asc'}},
    disputes:{select:{id:true,status:true,resolution:true,reason:true,createdAt:true,raisedBy:{select:{role:true}}},orderBy:{createdAt:'desc'}},
    payment:{select:{provider:true,transporterProceedsPence:true,refundedPence:true,cancellationDeductionPence:true,payoutStatus:true,status:true,events:{where:{type:{in:['PAYOUT_PAID','PAYOUT_READY']}},select:{id:true,type:true,note:true,createdAt:true},orderBy:{createdAt:'desc'}}}}
   },
   orderBy:{createdAt:'desc'}
  }),
  prisma.$queryRaw<any[]>`SELECT "id" FROM "TransporterPayoutDetails" WHERE "userId"=${user.id} LIMIT 1`
 ]);
 const jobIds=bookings.map(booking=>booking.job.id);
 const vehicleRows=jobIds.length?await prisma.$queryRawUnsafe<Array<{id:string;vehicleType:string|null}>>(`SELECT "id", "vehicleType" FROM "TransportJob" WHERE "id" IN (${jobIds.map((_,i)=>`$${i+1}`).join(',')})`,...jobIds):[];
 const vehicleTypes=new Map(vehicleRows.map(row=>[row.id,row.vehicleType]));
 // Scope proof metadata to the bookings already authorised above. No payout mutation.
 const bookingIds=bookings.map(booking=>booking.id);
 const proofRows=bookingIds.length?await prisma.$queryRaw<Array<{id:string;pocReleasedByName:string|null;pocCondition:string|null;pocDamageNotes:string|null;pocSubmittedAt:Date|null;podRecipientName:string|null;podNotes:string|null;podSubmittedAt:Date|null}>>(Prisma.sql`SELECT "id","pocReleasedByName","pocCondition","pocDamageNotes","pocSubmittedAt","podRecipientName","podNotes","podSubmittedAt" FROM "Booking" WHERE "id" IN (${Prisma.join(bookingIds)})`):[];
 const proofMap=new Map(proofRows.map(row=>[row.id,row]));
 const stripeReady=await payoutAccountReadiness([user.id]);
 const completedBookings=bookings
  .map(booking=>{const proof=proofMap.get(booking.id);return {...booking,payoutDetailsComplete:booking.payment?.provider==='STRIPE'?!!stripeReady.get(user.id):payoutDetails.length>0,trackingEvents:booking.trackingEvents.filter(event=>event.status==='DELIVERED').slice(0,1),deliveryProgressEvents:booking.trackingEvents,proofOfCollection:{releasedByName:proof?.pocReleasedByName,condition:proof?.pocCondition,damageNotes:proof?.pocDamageNotes,submittedAt:proof?.pocSubmittedAt},proofOfDelivery:{recipientName:proof?.podRecipientName,notes:proof?.podNotes,submittedAt:proof?.podSubmittedAt},payment:booking.payment?{...booking.payment,refundedPence:transporterRefund(booking.agreedPricePence,booking.payment)}:null,job:{...booking.job,vehicleType:vehicleTypes.get(booking.job.id)||null}}})
  .sort((a,b)=>{
   const aCompletedAt=new Date(a.trackingEvents.find(event=>event.status==='DELIVERED')?.createdAt||a.createdAt).getTime();
   const bCompletedAt=new Date(b.trackingEvents.find(event=>event.status==='DELIVERED')?.createdAt||b.createdAt).getTime();
   return bCompletedAt-aCompletedAt;
  });
 const deliveredProceedsPence=completedBookings.reduce((total,booking)=>total+(booking.payment?.transporterProceedsPence||0),0);
 return NextResponse.json({bookings:completedBookings,deliveredProceedsPence,payoutDetailsComplete:payoutDetails.length>0},{headers:{'Cache-Control':'no-store, max-age=0'}});
}
