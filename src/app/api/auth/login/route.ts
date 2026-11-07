import {NextResponse} from 'next/server';
import bcrypt from 'bcryptjs';
import {z} from 'zod';
import {prisma} from '@/lib/prisma';
import {createSession} from '@/lib/auth';
import {checkRateLimit, rateLimitResponse} from '@/lib/rate-limit';

const login = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  expectedRole: z.enum(['CUSTOMER', 'TRANSPORTER']).optional(),
});

export async function POST(request: Request) {
  let data;
  try {data = login.parse(await request.json());}
  catch {return NextResponse.json({error:'Invalid login details'}, {status:400});}

  const limit = checkRateLimit(request, 'login', 8, 15*60*1000, data.email);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  const user = await prisma.user.findUnique({where:{email:data.email.toLowerCase()}});
  if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
    return NextResponse.json({error:'Invalid email or password'}, {status:401});
  }
  if (user.accountStatus !== 'ACTIVE') {
    const error = user.accountStatus === 'SUSPENDED'
      ? 'This account has been suspended. Please contact MoveAMotor support.'
      : 'This account is no longer active.';
    return NextResponse.json({error}, {status:403});
  }
  if (data.expectedRole && user.role !== data.expectedRole) {
    return NextResponse.json({error:`Please sign in with a ${data.expectedRole.toLowerCase()} account to open this link.`}, {status:403});
  }
  await createSession(user.id);
  return NextResponse.json({id:user.id, name:user.name, role:user.role});
}
