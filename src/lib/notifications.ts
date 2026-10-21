import {randomUUID} from 'crypto';
import {prisma} from '@/lib/prisma';

export type NotificationInput={userId:string;type:string;title:string;body:string;href?:string|null};

export async function createNotification(input:NotificationInput){const id=randomUUID();await prisma.$executeRaw`INSERT INTO "Notification" ("id","userId","type","title","body","href","createdAt") VALUES (${id},${input.userId},${input.type},${input.title},${input.body},${input.href??null},NOW())`;return id}
export async function createNotificationSafely(input:NotificationInput){try{return await createNotification(input)}catch(error){console.error('Notification creation failed',error);return null}}
// The notification's primary key is also the durable claim for its best-effort email.
// Only the caller that inserts the row may send; a read-before-insert races across workers.
export async function createNotificationOnceSafely(id:string,input:NotificationInput){
 try{
  const inserted=await prisma.$executeRaw`INSERT INTO "Notification" ("id","userId","type","title","body","href","createdAt") VALUES (${id},${input.userId},${input.type},${input.title},${input.body},${input.href??null},NOW()) ON CONFLICT ("id") DO NOTHING`;
  return inserted===1;
 }catch(error){console.error('Notification creation failed',error);return false}
}
export async function createNotificationsSafely(inputs:NotificationInput[]){await Promise.all(inputs.map(input=>createNotificationSafely(input)))}
export async function notifyAdminsSafely(input:Omit<NotificationInput,'userId'>){try{const admins=await prisma.user.findMany({where:{role:'ADMIN',accountStatus:'ACTIVE'},select:{id:true}});await createNotificationsSafely(admins.map(a=>({...input,userId:a.id})));return admins.length}catch(error){console.error('Admin notification creation failed',error);return 0}}
