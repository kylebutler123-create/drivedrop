import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';
import type {Prisma} from '@prisma/client';

export const dynamic='force-dynamic';
export const revalidate=0;

export async function GET(){
 const u=await currentUser();
 if(!u)return NextResponse.json({count:0,byBooking:{}},{status:401,headers:{'Cache-Control':'no-store, max-age=0'}});
 let bookingCount=0;
 let bookingGrouped:Array<{bookingId:string;_count:{_all:number}}>=[];
 if(u.role!=='ADMIN'){
  const bookingWhere={readAt:null,senderId:{not:u.id},booking:u.role==='CUSTOMER'?{customerId:u.id}:{transporterId:u.id}} as const;
  [bookingCount,bookingGrouped]=await Promise.all([
   prisma.message.count({where:bookingWhere}),
   prisma.message.groupBy({by:['bookingId'],where:bookingWhere,_count:{_all:true}})
  ]);
 }
 const supportWhere:Prisma.SupportMessageWhereInput=u.role==='ADMIN'
  ?{readAt:null,sender:{role:{not:'ADMIN'}}}
  :{readAt:null,senderId:{not:u.id},conversation:{userId:u.id}};
 const [supportCount,supportGrouped]=await Promise.all([
  prisma.supportMessage.count({where:supportWhere}),
  prisma.supportMessage.groupBy({by:['conversationId'],where:supportWhere,_count:{_all:true}})
 ]);
 const byBooking:Record<string,number>=Object.fromEntries(bookingGrouped.map(row=>[row.bookingId,row._count._all]));
 for(const row of supportGrouped)byBooking[`support:${row.conversationId}`]=row._count._all;
 return NextResponse.json({count:bookingCount+supportCount,byBooking},{headers:{'Cache-Control':'no-store, max-age=0'}});
}
