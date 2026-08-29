import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';

export const dynamic='force-dynamic';
export const revalidate=0;

export async function GET(){
 const u=await currentUser();
 if(!u)return NextResponse.json({count:0,byBooking:{}},{status:401,headers:{'Cache-Control':'no-store, max-age=0'}});
 if(u.role==='ADMIN')return NextResponse.json({count:0,byBooking:{}},{headers:{'Cache-Control':'no-store, max-age=0'}});
 const where={readAt:null,senderId:{not:u.id},booking:u.role==='CUSTOMER'?{customerId:u.id}:{transporterId:u.id}} as const;
 const [count,grouped]=await Promise.all([
  prisma.message.count({where}),
  prisma.message.groupBy({by:['bookingId'],where,_count:{_all:true}})
 ]);
 const byBooking=Object.fromEntries(grouped.map(row=>[row.bookingId,row._count._all]));
 return NextResponse.json({count,byBooking},{headers:{'Cache-Control':'no-store, max-age=0'}});
}
