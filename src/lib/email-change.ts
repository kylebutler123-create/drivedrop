import {createHash,randomBytes,randomUUID} from 'crypto';
import {prisma} from '@/lib/prisma';

const TOKEN_MS=1000*60*60;
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');

type EmailChangeRow={id:string;newEmail:string;userId:string;expiresAt:Date;usedAt:Date|null};

export async function createEmailChangeToken(userId:string,newEmail:string){
  const token=randomBytes(32).toString('hex');
  const tokenHash=hash(token);
  const expiresAt=new Date(Date.now()+TOKEN_MS);
  await prisma.$transaction(async tx=>{
    await tx.$executeRaw`delete from "EmailChangeToken" where "userId"=${userId} and "usedAt" is null`;
    await tx.$executeRaw`insert into "EmailChangeToken" ("id","tokenHash","newEmail","userId","expiresAt","createdAt") values (${randomUUID()},${tokenHash},${newEmail},${userId},${expiresAt},now())`;
  });
  return {token,expiresAt};
}

export async function cancelEmailChangeTokens(userId:string){
  await prisma.$executeRaw`delete from "EmailChangeToken" where "userId"=${userId} and "usedAt" is null`;
}

export async function confirmEmailChangeToken(token:string){
  const tokenHash=hash(token);
  return prisma.$transaction(async tx=>{
    const rows=await tx.$queryRaw<EmailChangeRow[]>`select "id","newEmail","userId","expiresAt","usedAt" from "EmailChangeToken" where "tokenHash"=${tokenHash} limit 1`;
    const row=rows[0];
    if(!row||row.usedAt||row.expiresAt<new Date())return {ok:false as const,reason:'invalid'};
    const existing=await tx.user.findUnique({where:{email:row.newEmail},select:{id:true}});
    if(existing&&existing.id!==row.userId)return {ok:false as const,reason:'taken'};
    const user=await tx.user.findUnique({where:{id:row.userId},select:{email:true}});
    if(!user)return {ok:false as const,reason:'invalid'};
    await tx.user.update({where:{id:row.userId},data:{email:row.newEmail}});
    await tx.$executeRaw`update "EmailChangeToken" set "usedAt"=now() where "id"=${row.id}`;
    await tx.$executeRaw`delete from "EmailChangeToken" where "userId"=${row.userId} and "id"<>${row.id}`;
    return {ok:true as const,oldEmail:user.email,newEmail:row.newEmail,userId:row.userId};
  });
}
