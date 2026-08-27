import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'

export async function GET(){
  const requestId=randomUUID()
  const timestamp=new Date().toISOString()
  const version=process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,12)||process.env.npm_package_version||'unknown'
  try{
    await prisma.$queryRaw`SELECT 1`
    const response=NextResponse.json({ok:true,timestamp,version})
    response.headers.set('X-Request-ID',requestId)
    response.headers.set('Cache-Control','no-store')
    return response
  }catch(error){
    console.error('DriveDrop health check failed',{requestId,timestamp,error})
    const response=NextResponse.json({ok:false,timestamp,version,requestId},{status:503})
    response.headers.set('X-Request-ID',requestId)
    response.headers.set('Cache-Control','no-store')
    return response
  }
}
