import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function databaseUrl(){
 const raw=process.env.POSTGRES_PRISMA_URL
 if(!raw)return undefined
 try{
  const url=new URL(raw)
  url.searchParams.set('connection_limit','1')
  url.searchParams.set('pool_timeout','20')
  return url.toString()
 }catch{return raw}
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
 datasources:{db:{url:databaseUrl()}}
})

globalForPrisma.prisma = prisma
