import {createHash, randomBytes} from 'node:crypto';
import {prisma} from './prisma';
import {MOBILE_SESSION_MS, MOBILE_TOKEN_PATTERN, mobileBearer} from './mobile-policy';

export const mobileEnabled = () => process.env.MOBILE_APP_ENABLED === 'true';
export const hashMobileToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const mobileJson = (body: unknown, status = 200) => Response.json(body, {
  status, headers: {'Cache-Control': 'no-store, private', 'X-Robots-Tag': 'noindex, nofollow'},
});
export const mobileUnavailable = () => mobileJson({error: 'DriveDrop app sign-in is temporarily unavailable. Please use the website.'}, 503);

export async function mobileSession(token: string | null) {
  if (!token || !MOBILE_TOKEN_PATTERN.test(token)) return null;
  const session = await prisma.session.findUnique({where: {tokenHash: hashMobileToken(token)}, include: {user: true}});
  if (!session || session.expiresAt <= new Date() || session.user.accountStatus !== 'ACTIVE' || !['CUSTOMER', 'TRANSPORTER'].includes(session.user.role)) return null;
  return session;
}

export const mobileRequestSession = (request: Request) => mobileSession(mobileBearer(request.headers.get('authorization')));

export async function issueMobileSession(userId: string) {
  const token = `ddm_${randomBytes(32).toString('hex')}`;
  const expiresAt = new Date(Date.now() + MOBILE_SESSION_MS);
  // Reuse the revocable Session table. Existing website sessions are preserved.
  await prisma.$transaction(async tx => {
    await tx.session.deleteMany({where: {userId, expiresAt: {lt: new Date()}}});
    const existing = await tx.session.findMany({where: {userId}, orderBy: {createdAt: 'desc'}, select: {id: true}});
    if (existing.length >= 5) await tx.session.deleteMany({where: {id: {in: existing.slice(4).map(item => item.id)}}});
    await tx.session.create({data: {userId, tokenHash: hashMobileToken(token), expiresAt}});
  });
  return {token, expiresAt: expiresAt.toISOString()};
}
