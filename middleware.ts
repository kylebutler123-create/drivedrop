import { NextRequest, NextResponse } from 'next/server'

const MUTATING=new Set(['POST','PUT','PATCH','DELETE'])
const CSP=[
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "media-src 'self' blob: https:",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests"
].join('; ')

export function middleware(req:NextRequest){
  if(req.nextUrl.pathname.startsWith('/api/') && MUTATING.has(req.method)){
    const origin=req.headers.get('origin')
    if(origin && origin!==req.nextUrl.origin) return NextResponse.json({error:'Cross-site request blocked'},{status:403})
  }
  const res=NextResponse.next()
  res.headers.set('Content-Security-Policy',CSP)
  res.headers.set('X-Content-Type-Options','nosniff')
  res.headers.set('Referrer-Policy','strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(self)')
  res.headers.set('X-Frame-Options','DENY')
  if(process.env.NODE_ENV==='production') res.headers.set('Strict-Transport-Security','max-age=31536000; includeSubDomains')
  return res
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']}
