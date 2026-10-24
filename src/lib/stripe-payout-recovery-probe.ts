// Temporary server-only QA23 probe. No client-controlled activation and no writes.
// An absent/invalid manifest is inert; ordinary payout processing remains unchanged.
import {z} from 'zod';
import type {StripePayout} from '@prisma/client';
import {prisma} from './prisma';
import {STRIPE_SANDBOX_ACCOUNT} from './payment-runtime';
import {verifiedConnectClient} from './stripe-connect-provider';
import {assertCapturedSource} from './stripe-payout-policy';

const origin = 'https://drivedrop-git-feature-ui-polish-future-9f39.vercel.app';
const maxWindowMs = 10 * 60_000;
const identifier = z.string().regex(/^[a-zA-Z0-9_-]{8,100}$/);
const schema = z.object({
  case: z.literal('QA23'),
  platformAccountId: z.literal(STRIPE_SANDBOX_ACCOUNT),
  bookingId: identifier,
  paymentId: identifier,
  destinationAccountId: z.string().regex(/^acct_[a-zA-Z0-9]+$/),
  paymentIntentId: z.string().regex(/^pi_[a-zA-Z0-9]+$/),
  sourceChargeId: z.string().regex(/^ch_[a-zA-Z0-9]+$/),
  armedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
}).strict();
type Probe = z.infer<typeof schema>;

export function payoutRecoveryProbe(now = Date.now()): Probe | null {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== 'feature/ui-polish' ||
      process.env.STRIPE_CHECKOUT_ORIGIN !== origin || process.env.STRIPE_CONNECT_ENABLED !== 'true' ||
      process.env.STRIPE_REFUNDS_ENABLED !== 'false') return null;
  const value = process.env.DRIVEDROP_QA23_PAYOUT_RECOVERY;
  if (!value || value.length > 2048) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(value));
    if (!parsed.success) return null;
    const probe = parsed.data, start = Date.parse(probe.armedAt), end = Date.parse(probe.expiresAt);
    if (!Number.isFinite(now) || end <= start || end - start > maxWindowMs || now < start || now >= end) return null;
    return probe;
  } catch { return null; }
}

function matches(probe: Probe, payout: StripePayout) {
  return payout.environment === 'preview' && payout.paymentId === probe.paymentId &&
    payout.destinationAccountId === probe.destinationAccountId && payout.paymentIntentId === probe.paymentIntentId &&
    payout.sourceChargeId === probe.sourceChargeId && payout.paidPence === 1100 && payout.grossPence === 1000 &&
    payout.amountPence === 1000 && payout.finePence === 0 && payout.refundedPence === 0;
}

function trace(event: string, payout: StripePayout, details: {runId?: string; status?: string} = {}) {
  // Logging must never change the financial outcome. Never log the manifest,
  // request, provider response, credentials or customer/account personal data.
  try { console.info('QA23 payout recovery', {event, payoutId: payout.id, ...details}); } catch {}
}

export async function deferPayoutRecoveryProbe(payout: StripePayout, request: Request) {
  const probe = payoutRecoveryProbe();
  if (!probe || !matches(probe, payout)) return false;
  const ordinary = () => {trace('foreground_retained', payout); return false;};
  try {
    if (new URL(request.url).origin !== origin || request.headers.get('origin') !== origin ||
        payout.status !== 'PENDING' || +payout.createdAt < Date.parse(probe.armedAt) || payout.attemptCount !== 0 || payout.firstAttemptAt ||
        payout.stripeTransferId || payout.transferredAt || payout.leaseUntil || payout.retryAfter) return ordinary();
    const payment = await prisma.bookingPayment.findUniqueOrThrow({where: {id: payout.paymentId},
      include: {booking: {select: {customerConfirmedAt: true, status: true, disputes: {select: {id: true}}}}}});
    if (payment.bookingId !== probe.bookingId || payment.provider !== 'STRIPE' || payment.currency !== 'GBP' ||
        payment.providerReference !== probe.paymentIntentId || payment.status !== 'PAID' || payment.payoutStatus !== 'PROCESSING' ||
        payment.paidPence !== 1100 || payment.platformFeePence !== 100 || payment.transporterProceedsPence !== 1000 ||
        payment.refundedPence !== 0 || payment.cancellationDeductionPence !== 0 || payment.booking.status !== 'DELIVERED' ||
        !payment.booking.customerConfirmedAt || Date.now() - +payment.booking.customerConfirmedAt < 24 * 60 * 60_000 ||
        payment.booking.disputes.length) return ordinary();
    if (await prisma.stripeRefund.findUnique({where: {activePaymentId: payout.paymentId}}) ||
        await prisma.financeEvent.count({where: {paymentId: payout.paymentId, type: 'PAYOUT_PAID'}})) return ordinary();
    const authorisation = await prisma.availabilityRequest.findFirst({where: {bookingId: probe.bookingId,
      paymentIntentId: probe.paymentIntentId, paymentProvider: 'STRIPE', paymentEnvironment: 'preview'}});
    if (!authorisation) return ordinary();
    // Both reads are canonical and read-only. verifiedConnectClient checks the
    // pinned sandbox platform; assertCapturedSource rejects live/mismatched data.
    const stripe = await verifiedConnectClient();
    const intent = await stripe.paymentIntents.retrieve(probe.paymentIntentId, {expand: ['latest_charge']});
    if (assertCapturedSource(intent, {...payment, environment: 'preview'}, authorisation) !== probe.sourceChargeId) return ordinary();
    const transfers = await stripe.transfers.list({transfer_group: `dd_payout_${payout.id}`, limit: 1});
    if (transfers.has_more || transfers.data.length) return ordinary();
    // A minute worker can win while the canonical reads are in flight. Never
    // describe that as a deferred, untouched instruction or hold its lease back.
    const fresh = await prisma.stripePayout.findUniqueOrThrow({where: {id: payout.id}});
    if (!payoutRecoveryProbe() || fresh.status !== 'PENDING' || fresh.attemptCount !== 0 ||
        fresh.firstAttemptAt || fresh.stripeTransferId || fresh.transferredAt || fresh.leaseUntil) return ordinary();
    trace('foreground_deferred', payout, {status: fresh.status});
    return true;
  } catch { return ordinary(); }
}

export function tracePayoutRecoveryProbe(payout: StripePayout, runId: string | undefined,
  event: 'worker_selected' | 'worker_claimed' | 'worker_transfer_submitted' | 'worker_transfer_returned' | 'worker_finished' | 'worker_threw') {
  const probe = payoutRecoveryProbe();
  if (probe && runId && matches(probe, payout)) trace(event, payout, {runId, status: payout.status});
}
