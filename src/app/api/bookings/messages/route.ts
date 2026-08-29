import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';
import {z} from 'zod';

const S=z.object({bookingId:z.string().min(1),body:z.string().trim().min(1).max(2000)});
async function access(id:string,u:any){return prisma.booking.findFirst({where:{id,...(u.role==='ADMIN'?{}:{OR:[{customerId:u.id},{transporterId:u.id}]})},select:{id:true}})}

export async function GET(r:Request){
 const u=await currentUser();
 if(!u)return NextResponse.json({error:'Unauthorized'},{status:401});
 const bookingId=new URL(r.url).searchParams.get('bookingId');
 if(!bookingId)return NextResponse.json({error:'Booking is required'},{status:400});
 if(!await access(bookingId,u))return NextResponse.json({error:'Forbidden'},{status:403});
 const messages=await prisma.message.findMany({where:{bookingId},select:{id:true,body:true,createdAt:true,senderId:true,sender:{select:{name:true,role:true}}},orderBy:{createdAt:'asc'}});
 return NextResponse.json(messages,{headers:{'Cache-Control':'no-store, max-age=0'}});
}

export async function POST(r:Request){
 const u=await currentUser();
 if(!u)return NextResponse.json({error:'Unauthorized'},{status:401});
 const x=S.safeParse(await r.json());
 if(!x.success)return NextResponse.json({error:'Invalid message'},{status:400});
 if(!await access(x.data.bookingId,u))return NextResponse.json({error:'Forbidden'},{status:403});
 const message=await prisma.message.create({data:{...x.data,senderId:u.id},select:{id:true,body:true,createdAt:true,senderId:true,sender:{select:{name:true,role:true}}}});
 return NextResponse.json(message,{status:201,headers:{'Cache-Control':'no-store, max-age=0'}});
}
