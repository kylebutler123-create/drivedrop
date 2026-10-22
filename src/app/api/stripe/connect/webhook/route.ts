import {NextResponse} from 'next/server';
import {connectClient, connectReconciliationEnabled} from '@/lib/stripe-connect-provider';
import {stripeLivemode} from '@/lib/payment-runtime';
import {handleConnectSnapshot} from '@/lib/stripe-connect-events';
export const runtime = 'nodejs';
export const maxDuration = 180;
export async function POST(request: Request) {
  if (!connectReconciliationEnabled()) return NextResponse.json({error: 'Connect is disabled'}, {status: 503});
  let event;
  try {
    event = connectClient().webhooks.constructEvent(await request.text(), request.headers.get('stripe-signature') || '', process.env.STRIPE_CONNECT_WEBHOOK_SECRET!);
    if (event.livemode !== stripeLivemode()) throw new Error('Stripe event mode mismatch');
  } catch { return NextResponse.json({error: 'Invalid webhook signature'}, {status: 400}); }
  try { await handleConnectSnapshot(event); return NextResponse.json({received: true}); }
  catch { return NextResponse.json({error: 'Connect reconciliation pending'}, {status: 500}); }
}
