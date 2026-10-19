import {NextResponse} from 'next/server';
import {connectClient, connectEnabled} from '@/lib/stripe-connect-provider';
import {handleConnectNotification} from '@/lib/stripe-connect-events';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  if (!connectEnabled()) return NextResponse.json({error: 'Connect is disabled'}, {status: 503});
  let notification;
  try { notification = connectClient().parseEventNotification(await request.text(), request.headers.get('stripe-signature') || '', process.env.STRIPE_CONNECT_EVENTS_SECRET!); }
  catch { return NextResponse.json({error: 'Invalid webhook signature'}, {status: 400}); }
  try { await handleConnectNotification(notification); return NextResponse.json({received: true}); }
  catch { return NextResponse.json({error: 'Account reconciliation pending'}, {status: 500}); }
}
