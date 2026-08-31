import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function databaseUrl(){
 const raw=process.env.POSTGRES_PRISMA_URL?.trim()
 if(!raw)return undefined
 const setParam=(value:string,key:string,next:string)=>{
  const pattern=new RegExp(`([?&])${key}=[^&]*`,'i')
  if(pattern.test(value))return value.replace(pattern,`$1${key}=${next}`)
  return `${value}${value.includes('?')?'&':'?'}${key}=${next}`
 }
 let value=setParam(raw,'connection_limit','1')
 value=setParam(value,'pool_timeout','20')
 return value
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
 datasources:{db:{url:databaseUrl()}}
})

globalForPrisma.prisma = prisma
