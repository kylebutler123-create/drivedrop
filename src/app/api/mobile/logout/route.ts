import {prisma} from '@/lib/prisma';
import {mobileBearer} from '@/lib/mobile-policy';
import {hashMobileToken, mobileEnabled, mobileJson, mobileUnavailable} from '@/lib/mobile-auth';

export async function POST(request: Request) {
  if (!mobileEnabled()) return mobileUnavailable();
  const token = mobileBearer(request.headers.get('authorization'));
  if (token) await prisma.session.deleteMany({where: {tokenHash: hashMobileToken(token)}});
  return mobileJson({ok: true});
}
