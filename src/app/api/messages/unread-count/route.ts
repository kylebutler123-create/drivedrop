import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';

export const dynamic='force-dynamic';
export const revalidate=0;

export async function GET(){
 const u=await currentUser();
 if(!u)return NextResponse.json({count:0},{status:401,headers:{'Cache-Control':'no-store, max-age=0'}});
 if(u.role==='ADMIN')return NextResponse.json({count:0},{headers:{'Cache-Control':'no-store, max-age=0'}});
 const count=await prisma.message.count({where:{readAt:null,senderId:{not:u.id},booking:u.role==='CUSTOMER'?{customerId:u.id}:{transporterId:u.id}}});
 return NextResponse.json({count},{headers:{'Cache-Control':'no-store, max-age=0'}});
}
