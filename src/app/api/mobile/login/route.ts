import bcrypt from 'bcryptjs';
import {z} from 'zod';
import {prisma} from '@/lib/prisma';
import {checkRateLimit, rateLimitResponse} from '@/lib/rate-limit';
import {issueMobileSession, mobileEnabled, mobileJson, mobileUnavailable} from '@/lib/mobile-auth';

const Login = z.object({email: z.string().trim().email().max(254), password: z.string().min(1).max(1024)});
export async function POST(request: Request) {
  if (!mobileEnabled()) return mobileUnavailable();
  const ipLimit = checkRateLimit(request, 'mobile-login-ip', 30, 15 * 60 * 1000);
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterSeconds);
  const parsed = Login.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return mobileJson({error: 'Enter your email and password.'}, 400);
  const limit = checkRateLimit(request, 'mobile-login', 8, 15 * 60 * 1000, parsed.data.email);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  try {
    const user = await prisma.user.findUnique({where: {email: parsed.data.email.toLowerCase()}});
    if (!user || !await bcrypt.compare(parsed.data.password, user.passwordHash)) return mobileJson({error: 'Invalid email or password.'}, 401);
    if (user.accountStatus !== 'ACTIVE') return mobileJson({error: 'This account is not active. Please contact DriveDrop support.'}, 403);
    if (user.role === 'ADMIN') return mobileJson({error: 'Please use the website to access your administrator account.'}, 403);
    return mobileJson(await issueMobileSession(user.id));
  } catch {
    return mobileJson({error: 'Unable to sign in right now. Please try again.'}, 503);
  }
}
