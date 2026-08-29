import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';
import {z} from 'zod';
import {createNotificationSafely} from '@/lib/notifications';

const S=z.object({bookingId:z.string().min(1),body:z.string().trim().min(1).max(2000)});
const R=z.object({bookingId:z.string().min(1)});
async function access(id:string,u:any){return prisma.booking.findFirst({where:{id,...(u.role==='ADMIN'?{}:{OR:[{customerId:u.id},{transporterId:u.id}]})},select:{id:true,customerId:true,transporterId:true,job:{select:{vehicleMake:true,vehicleModel:true}}}})}

export async function GET(r:Request){
 const u=await currentUser();
 if(!u)return NextResponse.json({error:'Unauthorized'},{status:401});
 const bookingId=new URL(r.url).searchParams.get('bookingId');
 if(!bookingId)return NextResponse.json({error:'Booking is required'},{status:400});
 if(!await access(bookingId,u))return NextResponse.json({error:'Forbidden'},{status:403});
 const messages=await prisma.message.findMany({where:{bookingId},select:{id:true,body:true,createdAt:true,readAt:true,senderId:true,sender:{select:{name:true,role:true}}},orderBy:{createdAt:'asc'}});
 return NextResponse.json(messages,{headers:{'Cache-Control':'no-store, max-age=0'}});
}

export async function POST(r:Request){
 const u=await currentUser();
 if(!u)return NextResponse.json({error:'Unauthorized'},{status:401});
 const x=S.safeParse(await r.json());
 if(!x.success)return NextResponse.json({error:'Invalid message'},{status:400});
 const booking=await access(x.data.bookingId,u);
 if(!booking)return NextResponse.json({error:'Forbidden'},{status:403});
 const message=await prisma.message.create({data:{...x.data,senderId:u.id},select:{id:true,body:true,createdAt:true,readAt:true,senderId:true,sender:{select:{name:true,role:true}}}});
 const recipientId=u.id===booking.customerId?booking.transporterId:u.id===booking.transporterId?booking.customerId:null;
 if(recipientId){const vehicle=`${booking.job.vehicleMake} ${booking.job.vehicleModel}`.trim();await createNotificationSafely({userId:recipientId,type:'MESSAGE',title:'New booking message',body:`${u.name} sent you a message about the ${vehicle}.`,href:'/messages'})}
 return NextResponse.json(message,{status:201,headers:{'Cache-Control':'no-store, max-age=0'}});
}

export async function PATCH(r:Request){
 const u=await currentUser();
 if(!u)return NextResponse.json({error:'Unauthorized'},{status:401});
 const x=R.safeParse(await r.json());
 if(!x.success)return NextResponse.json({error:'Invalid request'},{status:400});
 if(!await access(x.data.bookingId,u))return NextResponse.json({error:'Forbidden'},{status:403});
 const result=await prisma.message.updateMany({where:{bookingId:x.data.bookingId,senderId:{not:u.id},readAt:null},data:{readAt:new Date()}});
 return NextResponse.json({updated:result.count});
}
