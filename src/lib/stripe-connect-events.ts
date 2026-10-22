import {prisma} from './prisma';
import {paymentEnvironment} from './booking-authorisation-provider';
import {verifiedConnectClient, ConnectError} from './stripe-connect-provider';
import {stripeLivemode} from './payment-runtime';
import {syncConnectAccount} from './stripe-connect-accounts';
import {reconcileStripePayout} from './stripe-payouts';

export async function handleConnectSnapshot(event: any) {
  if (event.livemode !== stripeLivemode()) throw new ConnectError('Stripe event mode does not match this environment.');
  const stripe = await verifiedConnectClient(), environment = paymentEnvironment();
  if (['transfer.created', 'transfer.updated', 'transfer.reversed'].includes(event.type)) {
    if (event.account) return; // Transfers belong to the platform, never another account.
    const id = event.data?.object?.metadata?.driveDropPayoutId;
    if (typeof id !== 'string') return;
    const row = await prisma.stripePayout.findUnique({where: {id}});
    if (!row || row.environment !== environment) return;
    await reconcileStripePayout(row.id);
    return;
  }
  if (!['payout.created', 'payout.updated', 'payout.paid', 'payout.failed', 'payout.canceled'].includes(event.type) || typeof event.account !== 'string') return;
  const account = await prisma.stripeConnectAccount.findFirst({where: {stripeAccountId: event.account, environment}});
  if (!account) return;
  const payoutId = event.data?.object?.id;
  if (typeof payoutId !== 'string' || !payoutId.startsWith('po_')) return;
  // A bank payout may aggregate several transfers. Record it at account level,
  // never assume that an individual booking has reached the bank.
  const payout = await stripe.payouts.retrieve(payoutId, {}, {stripeAccount: event.account});
  if (payout.livemode !== stripeLivemode()) throw new ConnectError('Bank payout mode does not match this environment.');
  await prisma.stripeConnectAccount.updateMany({where: {id: account.id, OR: [
    {lastBankPayoutCreated: null}, {lastBankPayoutCreated: {lt: payout.created}}, {lastBankPayoutId: payout.id},
  ]}, data: {lastBankPayoutId: payout.id, lastBankPayoutStatus: payout.status, lastBankPayoutCreated: payout.created}});
  await syncConnectAccount(account.id, stripe);
}

export async function handleConnectNotification(notification: any) {
  if (!notification.type?.startsWith('v2.core.account')) return;
  const id = notification.related_object?.id;
  if (typeof id !== 'string' || !id.startsWith('acct_')) return;
  const account = await prisma.stripeConnectAccount.findFirst({where: {stripeAccountId: id, environment: paymentEnvironment()}});
  if (!account) return;
  // Thin events only identify changed objects. Retrieve current account state,
  // including livemode and ownership, instead of trusting the event as readiness.
  await syncConnectAccount(account.id);
}
