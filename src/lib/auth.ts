import { cookies } from 'next/headers'
import { createHash, randomBytes } from 'crypto'
import { prisma } from './prisma'

const COOKIE='drivedrop_session'
const SESSION_MS=1000*60*60*24*14
const hash=(v:string)=>createHash('sha256').update(v).digest('hex')

export async function createSession(userId:string){
  const token=randomBytes(32).toString('hex')
  const expiresAt=new Date(Date.now()+SESSION_MS)
  // Keep the session table tidy and limit active sessions per account.
  await prisma.$transaction(async(tx:any)=>{
    await tx.session.deleteMany({where:{OR:[{expiresAt:{lt:new Date()}},{userId}]}})
    await tx.session.create({data:{userId,tokenHash:hash(token),expiresAt}})
  })
  const jar=await cookies()
  jar.set(COOKIE,token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',expires:expiresAt})
}

export async function currentUser(){
  const jar=await cookies()
  const token=jar.get(COOKIE)?.value
  if(!token)return null
  const tokenHash=hash(token)
  const s=await prisma.session.findUnique({where:{tokenHash},include:{user:true}})
  if(!s)return null
  if(s.expiresAt<new Date()){
    await prisma.session.deleteMany({where:{tokenHash}})
    jar.delete(COOKIE)
    return null
  }
  return s.user
}

export async function clearSession(){
  const jar=await cookies()
  const token=jar.get(COOKIE)?.value
  if(token)await prisma.session.deleteMany({where:{tokenHash:hash(token)}})
  jar.delete(COOKIE)
}
