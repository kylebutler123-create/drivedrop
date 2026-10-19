import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {connectAccountLink} from '@/lib/stripe-connect-accounts';
import {connectOrigin} from '@/lib/stripe-connect-provider';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== 'TRANSPORTER' || user.accountStatus !== 'ACTIVE') return NextResponse.redirect(new URL('/login', connectOrigin()), 303);
  try {
    const response = NextResponse.redirect(await connectAccountLink(user), 303);
    response.headers.set('Cache-Control', 'no-store'); response.headers.set('Referrer-Policy', 'no-referrer');
    return response;
  } catch { return NextResponse.redirect(new URL('/account?stripe=retry#stripe-payouts', connectOrigin()), 303); }
}
