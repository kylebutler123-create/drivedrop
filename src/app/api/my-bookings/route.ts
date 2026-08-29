import {NextResponse} from 'next/server';import {prisma} from '@/lib/prisma';import {currentUser} from '@/lib/auth';
export const dynamic='force-dynamic';
export const revalidate=0;
export async function GET(){
 const u=await currentUser();if(!u)return NextResponse.json({error:'Unauthorized'},{status:401,headers:{'Cache-Control':'no-store, max-age=0'}});
 const where=u.role==='CUSTOMER'?{customerId:u.id}:u.role==='TRANSPORTER'?{transporterId:u.id}:u.role==='ADMIN'?{}:{id:'__none__'};
 const bookings=await prisma.booking.findMany({where,select:{
  id:true,status:true,agreedPricePence:true,customerConfirmedAt:true,createdAt:true,
  job:{select:{id:true,collection:true,delivery:true,vehicleMake:true,vehicleModel:true,registration:true,running:true,collectionDate:true,status:true}},
  customer:{select:{name:true}},transporter:{select:{name:true}},
  trackingEvents:{select:{id:true,status:true,note:true,createdAt:true},orderBy:{createdAt:'asc'}},
  messages:{select:{id:true,body:true,createdAt:true,sender:{select:{name:true,role:true}}},orderBy:{createdAt:'asc'}},
  evidence:{select:{id:true,type:true,note:true,createdAt:true},orderBy:{createdAt:'asc'}},
  review:{select:{id:true,rating:true,body:true,verified:true,createdAt:true}},
  payment:{select:{status:true,transportValuePence:true,depositPence:true,paidPence:true,refundedPence:true,platformFeePence:true,transporterProceedsPence:true,payoutStatus:true}}
 },orderBy:{createdAt:'desc'}});
 const scoped=bookings.map(({payment,...booking})=>{
  if(!payment)return{...booking,payment:null};
  if(u.role==='CUSTOMER')return{...booking,payment:{status:payment.status,transportValuePence:payment.transportValuePence,depositPence:payment.depositPence,paidPence:payment.paidPence,refundedPence:payment.refundedPence,platformFeePence:payment.platformFeePence}};
  if(u.role==='TRANSPORTER')return{...booking,payment:{status:payment.status,transportValuePence:payment.transportValuePence,depositPence:payment.depositPence,paidPence:payment.paidPence,refundedPence:payment.refundedPence,platformFeePence:payment.platformFeePence,transporterProceedsPence:payment.transporterProceedsPence,payoutStatus:payment.payoutStatus}};
  return{...booking,payment};
 });
 return NextResponse.json(scoped,{headers:{'Cache-Control':'no-store, max-age=0'}})
}
