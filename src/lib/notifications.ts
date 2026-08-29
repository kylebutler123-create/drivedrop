import {randomUUID} from 'crypto';
import {prisma} from '@/lib/prisma';

export type NotificationInput={
 userId:string;
 type:string;
 title:string;
 body:string;
 href?:string|null;
};

export async function createNotification(input:NotificationInput){
 const id=randomUUID();
 await prisma.$executeRaw`
  INSERT INTO "Notification" ("id","userId","type","title","body","href","createdAt")
  VALUES (${id},${input.userId},${input.type},${input.title},${input.body},${input.href??null},NOW())
 `;
 return id;
}

export async function createNotificationSafely(input:NotificationInput){
 try{return await createNotification(input)}catch(error){console.error('Notification creation failed',error);return null}
}

export async function createNotificationsSafely(inputs:NotificationInput[]){
 await Promise.all(inputs.map(input=>createNotificationSafely(input)));
}
