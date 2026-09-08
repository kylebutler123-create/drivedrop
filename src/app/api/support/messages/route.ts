import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';
import {z} from 'zod';
import {createNotificationSafely} from '@/lib/notifications';
import type {Prisma} from '@prisma/client';

const MessageSchema=z.object({conversationId:z.string().min(1),body:z.string().trim().min(1).max(2000)});
const ReadSchema=z.object({conversationId:z.string().min(1)});

async function access(conversationId:string,user:{id:string;role:string}){
 return prisma.supportConversation.findFirst({
  where:{id:conversationId,...(user.role==='ADMIN'?{}:{userId:user.id})},
  select:{id:true,userId:true,user:{select:{name:true}}}
 });
}

export async function GET(r:Request){
 const user=await currentUser();
 if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const conversationId=new URL(r.url).searchParams.get('conversationId')||'';
 const conversation=await access(conversationId,user);
 if(!conversation)return NextResponse.json({error:'Forbidden'},{status:403});
 const messages=await prisma.supportMessage.findMany({where:{conversationId},select:{id:true,body:true,createdAt:true,readAt:true,senderId:true,sender:{select:{name:true,role:true}}},orderBy:{createdAt:'asc'}});
 return NextResponse.json(messages,{headers:{'Cache-Control':'no-store, max-age=0'}});
}

export async function POST(r:Request){
 const user=await currentUser();
 if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const parsed=MessageSchema.safeParse(await r.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Write a message of 2000 characters or fewer'},{status:400});
 const conversation=await access(parsed.data.conversationId,user);
 if(!conversation)return NextResponse.json({error:'Forbidden'},{status:403});
 const message=await prisma.$transaction(async tx=>{
  const created=await tx.supportMessage.create({data:{conversationId:conversation.id,senderId:user.id,body:parsed.data.body},select:{id:true,body:true,createdAt:true,readAt:true,senderId:true,sender:{select:{name:true,role:true}}}});
  await tx.supportConversation.update({where:{id:conversation.id},data:{updatedAt:new Date()}});
  return created;
 });
 if(user.role==='ADMIN'){
  await createNotificationSafely({userId:conversation.userId,type:'MESSAGE',title:'New message from DriveDrop Support',body:'DriveDrop Support sent you a private message.',href:`/messages?bookingId=${encodeURIComponent(`support:${conversation.id}`)}`});
 }else{
  const admins=await prisma.user.findMany({where:{role:'ADMIN',accountStatus:'ACTIVE'},select:{id:true}});
  await Promise.all(admins.map(admin=>createNotificationSafely({userId:admin.id,type:'MESSAGE',title:'New support reply',body:`${conversation.user.name} replied to DriveDrop Support.`,href:`/messages?bookingId=${encodeURIComponent(`support:${conversation.id}`)}`})));
 }
 return NextResponse.json(message,{status:201,headers:{'Cache-Control':'no-store, max-age=0'}});
}

export async function PATCH(r:Request){
 const user=await currentUser();
 if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const parsed=ReadSchema.safeParse(await r.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Invalid request'},{status:400});
 const conversation=await access(parsed.data.conversationId,user);
 if(!conversation)return NextResponse.json({error:'Forbidden'},{status:403});
 const where:Prisma.SupportMessageWhereInput=user.role==='ADMIN'
  ?{conversationId:conversation.id,readAt:null,sender:{role:{not:'ADMIN'}}}
  :{conversationId:conversation.id,readAt:null,senderId:{not:user.id}};
 const result=await prisma.supportMessage.updateMany({where,data:{readAt:new Date()}});
 return NextResponse.json({updated:result.count},{headers:{'Cache-Control':'no-store, max-age=0'}});
}
