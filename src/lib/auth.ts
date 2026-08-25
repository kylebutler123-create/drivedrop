import { cookies } from 'next/headers'
import { createHash, randomBytes } from 'crypto'
import { prisma } from './prisma'

const COOKIE='drivedrop_session'
const hash=(v:string)=>createHash('sha256').update(v).digest('hex')
export async function createSession(userId:string){
  const token=randomBytes(32).toString('hex'); const expiresAt=new Date(Date.now()+1000*60*60*24*14)
  await prisma.session.create({data:{userId,tokenHash:hash(token),expiresAt}})
  const jar=await cookies(); jar.set(COOKIE,token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',expires:expiresAt})
}
export async function currentUser(){
  const token=(await cookies()).get(COOKIE)?.value; if(!token)return null
  const s=await prisma.session.findUnique({where:{tokenHash:hash(token)},include:{user:true}})
  if(!s||s.expiresAt<new Date())return null
  return s.user
}
export async function clearSession(){const jar=await cookies();const token=jar.get(COOKIE)?.value;if(token)await prisma.session.deleteMany({where:{tokenHash:hash(token)}});jar.delete(COOKIE)}
