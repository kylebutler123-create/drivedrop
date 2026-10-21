import {currentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {alternativeRefundsEnabled} from '@/lib/alternative-refunds';
import {paymentEnvironment} from '@/lib/booking-authorisation-provider';

export const runtime = 'nodejs';
export async function GET(_request: Request, context: {params: Promise<{id: string}>}) {
  const user = await currentUser();
  if (!alternativeRefundsEnabled() || !user || user.role !== 'ADMIN' || user.accountStatus !== 'ACTIVE') return new Response('Administrator access required', {status: 403});
  const {id} = await context.params;
  const record = await prisma.alternativeRefund.findUnique({where: {id}, select: {
    environment: true, evidenceName: true, evidenceType: true, evidenceBytes: true,
  }});
  if (!record || record.environment !== paymentEnvironment()) return new Response('Not found', {status: 404});
  return new Response(new Uint8Array(record.evidenceBytes), {headers: {
    'Content-Type': record.evidenceType,
    'Content-Disposition': `attachment; filename="${record.evidenceName.replace(/[^A-Za-z0-9 ._-]/g, '_')}"`,
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "sandbox; default-src 'none'",
  }});
}
