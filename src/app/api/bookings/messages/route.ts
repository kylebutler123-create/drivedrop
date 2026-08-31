import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';
import {z} from 'zod';
import {randomUUID} from 'crypto';
import {createNotificationSafely} from '@/lib/notifications';
import {createMessageStoragePath,uploadMessageImage,validateMessageImage} from '@/lib/supabase-storage';

const R=z.object({bookingId:z.string().min(1)});
async function access(id:string,u:any){return prisma.booking.findFirst({where:{id,...(u.role==='ADMIN'?{}:{OR:[{customerId:u.id},{transporterId:u.id}]})},select:{id:true,customerId:true,transporterId:true,job:{select:{vehicleMake:true,vehicleModel:true}}}})}
async function attachmentsFor(messageIds:string[]){if(!messageIds.length)return new Map<string,any[]>();const rows=await prisma.$queryRawUnsafe<Array<{id:string,messageId:string,mimeType:string,createdAt:Date}>>(`SELECT "id","messageId","mimeType","createdAt" FROM "MessageAttachment" WHERE "messageId" IN (${messageIds.map((_,i)=>`$${i+1}`).join(',')}) ORDER BY "createdAt" ASC`,...messageIds);const map=new Map<string,any[]>();for(const row of rows){const list=map.get(row.messageId)||[];list.push({id:row.id,mimeType:row.mimeType,createdAt:row.createdAt});map.set(row.messageId,list)}return map}

export async function GET(r:Request){
 const u=await currentUser();if(!u)return NextResponse.json({error:'Unauthorized'},{status:401});const bookingId=new URL(r.url).searchParams.get('bookingId');if(!bookingId)return NextResponse.json({error:'Booking is required'},{status:400});if(!await access(bookingId,u))return NextResponse.json({error:'Forbidden'},{status:403});
 const messages=await prisma.message.findMany({where:{bookingId},select:{id:true,body:true,createdAt:true,readAt:true,senderId:true,sender:{select:{name:true,role:true}}},orderBy:{createdAt:'asc'}});const map=await attachmentsFor(messages.map(m=>m.id));return NextResponse.json(messages.map(m=>({...m,attachments:map.get(m.id)||[]})),{headers:{'Cache-Control':'no-store, max-age=0'}});
}

export async function POST(r:Request){
 const u=await currentUser();if(!u)return NextResponse.json({error:'Unauthorized'},{status:401});
 const form=await r.formData();const bookingId=String(form.get('bookingId')||'');const body=String(form.get('body')||'').trim();const files=form.getAll('images').filter((x):x is File=>x instanceof File&&x.size>0);
 if(!bookingId)return NextResponse.json({error:'Booking is required'},{status:400});if(body.length>2000)return NextResponse.json({error:'Message must be 2000 characters or fewer'},{status:400});if(!body&&!files.length)return NextResponse.json({error:'Write a message or add a picture'},{status:400});if(files.length>4)return NextResponse.json({error:'You can attach up to 4 pictures per message'},{status:400});
 const booking=await access(bookingId,u);if(!booking)return NextResponse.json({error:'Forbidden'},{status:403});
 const valid:{file:File,extension:string}[]=[];for(const file of files){const v=await validateMessageImage(file);if(!v.ok)return NextResponse.json({error:v.error},{status:400});valid.push({file,extension:v.extension})}
 const uploads:{id:string,path:string,mimeType:string}[]=[];for(const item of valid){const path=createMessageStoragePath(bookingId,u.id,item.extension);await uploadMessageImage(path,item.file);uploads.push({id:randomUUID(),path,mimeType:item.file.type})}
 const message=await prisma.message.create({data:{bookingId,body:body||'Photo',senderId:u.id},select:{id:true,body:true,createdAt:true,readAt:true,senderId:true,sender:{select:{name:true,role:true}}}});
 for(const a of uploads)await prisma.$executeRaw`INSERT INTO "MessageAttachment" ("id","messageId","storagePath","mimeType","createdAt") VALUES (${a.id},${message.id},${a.path},${a.mimeType},CURRENT_TIMESTAMP)`;
 const recipientId=u.id===booking.customerId?booking.transporterId:u.id===booking.transporterId?booking.customerId:null;if(recipientId){const vehicle=`${booking.job.vehicleMake} ${booking.job.vehicleModel}`.trim();await createNotificationSafely({userId:recipientId,type:'MESSAGE',title:'New booking message',body:`${u.name} sent you ${uploads.length?'a message with a picture':'a message'} about the ${vehicle}.`,href:'/messages'})}
 return NextResponse.json({...message,attachments:uploads.map(a=>({id:a.id,mimeType:a.mimeType}))},{status:201,headers:{'Cache-Control':'no-store, max-age=0'}});
}

export async function PATCH(r:Request){const u=await currentUser();if(!u)return NextResponse.json({error:'Unauthorized'},{status:401});const x=R.safeParse(await r.json());if(!x.success)return NextResponse.json({error:'Invalid request'},{status:400});if(!await access(x.data.bookingId,u))return NextResponse.json({error:'Forbidden'},{status:403});const result=await prisma.message.updateMany({where:{bookingId:x.data.bookingId,senderId:{not:u.id},readAt:null},data:{readAt:new Date()}});return NextResponse.json({updated:result.count});}
