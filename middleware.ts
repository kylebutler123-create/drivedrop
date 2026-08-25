import { NextRequest, NextResponse } from 'next/server'

const MUTATING=new Set(['POST','PUT','PATCH','DELETE'])
export function middleware(req:NextRequest){
  if(req.nextUrl.pathname.startsWith('/api/') && MUTATING.has(req.method)){
    const origin=req.headers.get('origin')
    if(origin && origin!==req.nextUrl.origin) return NextResponse.json({error:'Cross-site request blocked'},{status:403})
  }
  const res=NextResponse.next()
  res.headers.set('X-Content-Type-Options','nosniff')
  res.headers.set('Referrer-Policy','strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(self)')
  res.headers.set('X-Frame-Options','DENY')
  return res
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']}
