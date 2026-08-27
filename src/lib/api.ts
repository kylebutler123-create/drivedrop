import { NextResponse } from 'next/server'
import { ZodError, ZodType } from 'zod'

function requestId(){return crypto.randomUUID()}
function jsonWithRequestId(body:unknown,status:number,id:string){const response=NextResponse.json(body,{status});response.headers.set('X-Request-ID',id);return response}

export function apiError(error: unknown, fallback='Request failed') {
  const id=requestId()
  if (error instanceof ZodError) return jsonWithRequestId({error:'Invalid request',issues:error.issues.map(i=>({path:i.path.join('.'),message:i.message})),requestId:id},422,id)
  const message=error instanceof Error ? error.message : fallback
  const status=message==='Forbidden'?403:message==='Not found'?404:400
  console.error('DriveDrop API error',{requestId:id,status,errorName:error instanceof Error?error.name:'UnknownError',message,errorStack:error instanceof Error?error.stack:undefined})
  const publicMessage=process.env.NODE_ENV==='production'&&status===400?fallback:message
  return jsonWithRequestId({error:publicMessage,requestId:id},status,id)
}
export async function parseJson<T>(request:Request,schema:ZodType<T>):Promise<T>{
  let body:unknown
  try{body=await request.json()}catch{throw new Error('Invalid JSON body')}
  return schema.parse(body)
}
