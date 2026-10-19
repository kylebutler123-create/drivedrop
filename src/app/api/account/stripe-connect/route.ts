import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {connectAccountLink, connectAccountStatus, connectDashboardLink} from '@/lib/stripe-connect-accounts';
import {connectErrorMessage, connectOrigin} from '@/lib/stripe-connect-provider';
export const runtime = 'nodejs';
export const maxDuration = 60;
const headers = {'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer'};

export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== 'TRANSPORTER' || user.accountStatus !== 'ACTIVE') return NextResponse.json({error: 'Transporter access required'}, {status: 403, headers});
  try { return NextResponse.json(await connectAccountStatus(user.id), {headers}); }
  catch (error) { return NextResponse.json({error: connectErrorMessage(error)}, {status: 503, headers}); }
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user || user.role !== 'TRANSPORTER' || user.accountStatus !== 'ACTIVE') return NextResponse.json({error: 'Transporter access required'}, {status: 403, headers});
  try {
    if (request.headers.get('origin') && request.headers.get('origin') !== connectOrigin()) return NextResponse.json({error: 'Invalid request origin'}, {status: 403, headers});
    const body = await request.json().catch(() => null);
    if (!['onboard', 'dashboard'].includes(body?.action)) return NextResponse.json({error: 'Invalid account action'}, {status: 400, headers});
    const url = body.action === 'dashboard' ? await connectDashboardLink(user.id) : await connectAccountLink(user);
    return NextResponse.json({url}, {headers});
  } catch (error) { return NextResponse.json({error: connectErrorMessage(error)}, {status: 400, headers}); }
}
