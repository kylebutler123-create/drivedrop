import type Stripe from 'stripe';
import {prisma} from './prisma';
import {paymentEnvironment} from './booking-authorisation-provider';
import {stripeLivemode} from './payment-runtime';
import {ConnectError, CONNECT_RETRY_WINDOW_MS, connectEnabled, connectReconciliationEnabled, connectOrigin, safeStripeRedirect, verifiedConnectClient} from './stripe-connect-provider';

type Account = Stripe.V2.Core.Account;
const include: Stripe.V2.Core.AccountRetrieveParams.Include[] = ['configuration.recipient', 'requirements', 'defaults'];
function accountIncludes(): Stripe.V2.Core.AccountRetrieveParams.Include[] {
  return stripeLivemode() ? [...include, 'identity'] : include;
}

export function accountReadiness(account: Account, userId: string) {
  if (account.livemode !== stripeLivemode() || account.closed || account.metadata?.driveDropUserId !== userId ||
      account.metadata?.environment !== paymentEnvironment() || account.dashboard !== 'express' ||
      account.defaults?.responsibilities?.fees_collector !== 'application' ||
      account.defaults?.responsibilities?.losses_collector !== 'application' ||
      (stripeLivemode() && (account.identity?.country?.toLowerCase() !== 'gb' || account.defaults?.currency !== 'gbp'))) {
    throw new ConnectError('The Stripe account needs an administrator review.', 'ACCOUNT_MISMATCH');
  }
  const balance = account.configuration?.recipient?.capabilities?.stripe_balance;
  const transfersEnabled = balance?.stripe_transfers?.status === 'active';
  const payoutsEnabled = balance?.payouts?.status === 'active';
  const requirementsDue = !!account.requirements?.entries?.some(entry =>
    ['currently_due', 'past_due'].includes(entry.minimum_deadline?.status || ''));
  return {transfersEnabled, payoutsEnabled, requirementsDue,
    status: transfersEnabled && payoutsEnabled ? 'READY' : 'PENDING', lastCheckedAt: new Date()};
}

export async function syncConnectAccount(id: string, client?: Stripe) {
  const row = await prisma.stripeConnectAccount.findUniqueOrThrow({where: {id}});
  if (row.environment !== paymentEnvironment() || !row.stripeAccountId) throw new ConnectError('Payout account setup is incomplete.');
  const stripe = client || await verifiedConnectClient();
  const account = await stripe.v2.core.accounts.retrieve(row.stripeAccountId, {include: accountIncludes()});
  let readiness;
  try { readiness = accountReadiness(account, row.userId); }
  catch (error) {
    await prisma.stripeConnectAccount.update({where: {id}, data: {status: 'RESTRICTED', transfersEnabled: false, payoutsEnabled: false, lastCheckedAt: new Date()}});
    throw error;
  }
  return prisma.stripeConnectAccount.update({where: {id}, data: readiness});
}

export async function createOrGetConnectAccount(user: {id: string; email: string; name: string}) {
  if (!connectEnabled()) throw new ConnectError('New Stripe payout setup is temporarily paused.');
  const stripe = await verifiedConnectClient();
  const environment = paymentEnvironment();
  // Commit the stable creation id before any Stripe request. A lost response can
  // be retried, but never with a fresh idempotency key after Stripe's expiry.
  const row = await prisma.stripeConnectAccount.upsert({
    where: {userId_environment: {userId: user.id, environment}}, update: {},
    create: {userId: user.id, environment, creationEmail: user.email, creationName: user.name},
  });
  if (row.stripeAccountId) return syncConnectAccount(row.id, stripe);
  const started = row.creationStartedAt || new Date();
  if (Date.now() - started.getTime() >= CONNECT_RETRY_WINDOW_MS) {
    await prisma.stripeConnectAccount.update({where: {id: row.id}, data: {status: 'REVIEW'}});
    throw new ConnectError('Payout setup needs an administrator to reconcile an earlier attempt. A second account will not be created.', 'ACCOUNT_REVIEW');
  }
  await prisma.stripeConnectAccount.updateMany({where: {id: row.id, creationStartedAt: null}, data: {creationStartedAt: started}});
  const account = await stripe.v2.core.accounts.create({
    contact_email: row.creationEmail, display_name: row.creationName,
    dashboard: 'express', identity: {country: 'gb'},
    defaults: {currency: 'gbp', responsibilities: {fees_collector: 'application', losses_collector: 'application'}},
    configuration: {recipient: {capabilities: {stripe_balance: {stripe_transfers: {requested: true}}}}},
    metadata: {driveDropUserId: user.id, environment, driveDropAccountId: row.id}, include: accountIncludes(),
  }, {idempotencyKey: `dd-connect-account-${row.id}`});
  const readiness = accountReadiness(account, user.id);
  return prisma.stripeConnectAccount.update({where: {id: row.id}, data: {stripeAccountId: account.id, ...readiness}});
}

export async function connectAccountLink(user: {id: string; email: string; name: string}) {
  const row = await createOrGetConnectAccount(user);
  const stripe = await verifiedConnectClient(), origin = connectOrigin();
  const link = await stripe.v2.core.accountLinks.create({account: row.stripeAccountId!, use_case: {
    type: 'account_onboarding', account_onboarding: {
      refresh_url: `${origin}/api/account/stripe-connect/refresh`,
      return_url: `${origin}/account?stripe=returned#stripe-payouts`,
      collection_options: {fields: 'eventually_due', future_requirements: 'include'},
    },
  }});
  return safeStripeRedirect(link.url);
}

export async function connectDashboardLink(userId: string) {
  const row = await prisma.stripeConnectAccount.findUnique({where: {userId_environment: {userId, environment: paymentEnvironment()}}});
  if (!row?.stripeAccountId) throw new ConnectError('Set up your Stripe payout account first.');
  const stripe = await verifiedConnectClient();
  await syncConnectAccount(row.id, stripe);
  const link = await stripe.accounts.createLoginLink(row.stripeAccountId);
  return safeStripeRedirect(link.url);
}

export async function connectAccountStatus(userId: string) {
  if (!connectReconciliationEnabled()) return {enabled: false};
  const row = await prisma.stripeConnectAccount.findUnique({where: {userId_environment: {userId, environment: paymentEnvironment()}}});
  if (!row) return {enabled: true, creationEnabled: connectEnabled(), status: 'NOT_STARTED', ready: false};
  const fresh = row.stripeAccountId ? await syncConnectAccount(row.id) : row;
  return {enabled: true, creationEnabled: connectEnabled(), status: fresh.status, ready: fresh.transfersEnabled && fresh.payoutsEnabled,
    requirementsDue: fresh.requirementsDue, connected: !!fresh.stripeAccountId,
    lastCheckedAt: fresh.lastCheckedAt, bankPayoutStatus: fresh.lastBankPayoutStatus};
}

export async function payoutAccountReadiness(userIds: string[]) {
  if (!userIds.length) return new Map<string, boolean>();
  const rows = connectEnabled() ? await prisma.stripeConnectAccount.findMany({
    where: {userId: {in: userIds}, environment: paymentEnvironment()},
    select: {userId: true, transfersEnabled: true, payoutsEnabled: true, status: true},
  }) : [];
  return new Map(rows.map(row => [row.userId, row.status === 'READY' && row.transfersEnabled && row.payoutsEnabled]));
}
