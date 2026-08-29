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

export async function createNotifications(inputs:NotificationInput[]){
 for(const input of inputs)await createNotification(input);
}
