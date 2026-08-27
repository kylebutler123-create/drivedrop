import {createHash,randomBytes} from 'crypto';
import {prisma} from '@/lib/prisma';
const RESET_MS=1000*60*30;
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
export async function createPasswordResetToken(userId:string){const token=randomBytes(32).toString('hex');const expiresAt=new Date(Date.now()+RESET_MS);await prisma.$transaction(async(tx:any)=>{await tx.passwordResetToken.deleteMany({where:{OR:[{userId},{expiresAt:{lt:new Date()}}]}});await tx.passwordResetToken.create({data:{userId,tokenHash:hash(token),expiresAt}})});return {token,expiresAt}}
export function hashPasswordResetToken(token:string){return hash(token)}
