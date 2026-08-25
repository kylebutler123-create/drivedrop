import { NextResponse } from 'next/server'
import { ZodError, ZodType } from 'zod'

export function apiError(error: unknown, fallback='Request failed') {
  if (error instanceof ZodError) return NextResponse.json({error:'Invalid request',issues:error.issues.map(i=>({path:i.path.join('.'),message:i.message}))},{status:422})
  const message=error instanceof Error ? error.message : fallback
  const status=message==='Forbidden'?403:message==='Not found'?404:400
  return NextResponse.json({error: process.env.NODE_ENV==='production' && status===400 ? fallback : message},{status})
}
export async function parseJson<T>(request:Request,schema:ZodType<T>):Promise<T>{
  let body:unknown
  try{body=await request.json()}catch{throw new Error('Invalid JSON body')}
  return schema.parse(body)
}
