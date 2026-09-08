import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {createSession} from '@/lib/auth';
import bcrypt from 'bcryptjs';
import {z} from 'zod';
import {checkRateLimit,rateLimitResponse} from '@/lib/rate-limit';

const Phone=z.string().trim().min(7,'Enter a valid phone number').max(30,'Phone number is too long').regex(/^[0-9+() .-]+$/,'Enter a valid phone number');
const Schema=z.object({
 name:z.string().trim().min(2),
 email:z.string().email(),
 password:z.string().min(8),
 role:z.enum(['CUSTOMER','TRANSPORTER']),
 phone:Phone.optional()
}).refine(data=>data.role!=='CUSTOMER'||Boolean(data.phone),{message:'Phone number is required',path:['phone']});

export async function POST(request:Request){
 try{
  const data=Schema.parse(await request.json());
  const limit=checkRateLimit(request,'register',5,60*60*1000,data.email);
  if(!limit.allowed)return rateLimitResponse(limit.retryAfterSeconds);
  const passwordHash=await bcrypt.hash(data.password,12);
  const user=await prisma.user.create({data:{name:data.name,email:data.email.toLowerCase(),role:data.role,passwordHash,phone:data.role==='CUSTOMER'?data.phone:undefined}});
  await createSession(user.id);
  return NextResponse.json({id:user.id,name:user.name,role:user.role},{status:201});
 }catch(error:any){
  const message=error instanceof z.ZodError?error.issues[0]?.message:error?.code==='P2002'?'Email already registered':'Unable to register';
  return NextResponse.json({error:message||'Unable to register'},{status:400});
 }
}
