import {createHash} from 'node:crypto';
import type Stripe from 'stripe';
import type {Prisma} from '@prisma/client';
import {z} from 'zod';
import {prisma} from './prisma';
import {paymentEnvironment} from './booking-authorisation-provider';
import {connectEnabled, verifiedConnectClient} from './stripe-connect-provider';
import {assertCapturedSource} from './stripe-payout-policy';
import {assertStripeRefundMatches} from './stripe-refund-policy';
import {ALTERNATIVE_METHODS, alternativeReview, assertAlternativeEligible} from './alternative-refund-policy';
import {validateAlternativeRefundFile} from './supabase-storage';

// Never serialize evidence bytes, reference, internal note or request hash into
// a general payment response. The evidence download has its own admin check.
export const alternativeRefundSummarySelect = {id: true, failedRefundId: true, amountPence: true,
  stripeRefundedPence: true, method: true, settledOn: true, createdAt: true} satisfies Prisma.AlternativeRefundSelect;
const include = {stripePayout: true, stripeRefunds: true, alternativeRefund: {select: alternativeRefundSummarySelect},
  booking: {include: {disputes: true}}} satisfies Prisma.BookingPaymentInclude;
const details = z.object({
  id: z.string().uuid(), paymentId: z.string().min(1).max(100), failedRefundId: z.string().uuid(),
  amountPence: z.number().int().positive(), expectedRefundedPence: z.literal(0),
  method: z.enum(ALTERNATIVE_METHODS), reference: z.string().trim().min(3).max(120).regex(/^[A-Za-z0-9 ._/-]+$/),
  settledOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), note: z.string().trim().max(1000), confirmed: z.literal(true),
});
const sha = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
export function alternativeRefundsEnabled() {return connectEnabled() && ['preview', 'development'].includes(paymentEnvironment());}
function requireEnabled() {if (!alternativeRefundsEnabled()) alternativeReview('Alternative refund recording is not enabled in this environment.');}

async function allPages<T extends {id: string}>(fetchPage: (cursor?: string) => Promise<{data: T[]; has_more: boolean}>) {
  const rows: T[] = []; let cursor: string | undefined;
  for (let page = 0; page < 20; page++) {
    const result = await fetchPage(cursor); rows.push(...result.data);
    if (!result.has_more) return rows;
    const next = result.data.at(-1)?.id;
    if (!next || next === cursor) break;
    cursor = next;
  }
  return alternativeReview('Stripe history could not be completely checked. Nothing has been recorded.');
}

// All Stripe operations in this module are reads. Canonical reads happen while
// holding the same booking lock used by refund, dispute and payout workers.
async function checkCanonical(tx: Prisma.TransactionClient, stripe: Stripe, payment: Prisma.BookingPaymentGetPayload<{include: typeof include}>, row: ReturnType<typeof assertAlternativeEligible>) {
  const request = await tx.availabilityRequest.findFirst({where: {bookingId: payment.bookingId,
    paymentIntentId: row.paymentIntentId, paymentProvider: 'STRIPE', paymentEnvironment: row.environment}});
  if (!request) return alternativeReview('The captured sandbox payment could not be matched.');
  const checkIntent = async () => {
    const intent = await stripe.paymentIntents.retrieve(row.paymentIntentId, {expand: ['latest_charge']});
    const chargeId = assertCapturedSource(intent, {...payment, environment: row.environment}, request);
    if (chargeId !== row.sourceChargeId) alternativeReview('The refund charge has changed.');
  };
  await checkIntent();
  const refunds = await allPages(cursor => stripe.refunds.list({charge: row.sourceChargeId, limit: 100, ...(cursor ? {starting_after: cursor} : {})}));
  if (refunds.length !== 1 || refunds[0].id !== row.stripeRefundId || !assertStripeRefundMatches(refunds[0], row).failed) {
    alternativeReview('Stripe has a new or unsettled refund. Reconcile it before recording another repayment.');
  }
  // No app payout row alone is insufficient: a dashboard-created transfer can
  // exist. Scan bounded, complete sandbox history and reject any matching source.
  const transfers = await allPages(cursor => stripe.transfers.list({limit: 100, ...(cursor ? {starting_after: cursor} : {})}));
  if (transfers.some(t => t.livemode || (typeof t.source_transaction === 'string' ? t.source_transaction : t.source_transaction?.id) === row.sourceChargeId ||
      t.metadata?.paymentId === payment.id || t.metadata?.bookingId === payment.bookingId)) {
    alternativeReview('A transporter transfer needs separate recovery review.');
  }
  // Fence changes during pagination. Later external Stripe changes are still
  // held by webhook reconciliation; an external dashboard cannot share our lock.
  await checkIntent();
  const freshRefund = await stripe.refunds.retrieve(row.stripeRefundId!);
  if (!assertStripeRefundMatches(freshRefund, row).failed) alternativeReview('The Stripe refund changed during review.');
}

// Read-only preflight for opening the form. Recording repeats every check inside
// its own locked transaction, so this response is never an authorization token.
export async function reviewAlternativeRefund(raw: unknown, actorId: string) {
  requireEnabled();
  const parsed = details.pick({paymentId: true, failedRefundId: true, amountPence: true, expectedRefundedPence: true}).safeParse(raw);
  if (!parsed.success) return alternativeReview('Refresh this payment before checking its repayment status.');
  const input = parsed.data, stripe = await verifiedConnectClient();
  return prisma.$transaction(async tx => {
    const ref = await tx.bookingPayment.findUnique({where: {id: input.paymentId}, select: {bookingId: true}});
    if (!ref) return alternativeReview('Payment not found.');
    await tx.$queryRaw`SELECT id FROM "Booking" WHERE id=${ref.bookingId} FOR UPDATE`;
    const actor = await tx.user.findUnique({where: {id: actorId}, select: {role: true, accountStatus: true}});
    if (actor?.role !== 'ADMIN' || actor.accountStatus !== 'ACTIVE') return alternativeReview('Active administrator access is required.');
    const payment = await tx.bookingPayment.findUniqueOrThrow({where: {id: input.paymentId}, include});
    const row = assertAlternativeEligible(payment, input.failedRefundId, input.amountPence, paymentEnvironment());
    await checkCanonical(tx, stripe, payment, row);
    return {eligible: true, amountPence: payment.paidPence, stripeRefundedPence: 0, checkedAt: new Date().toISOString()};
  }, {timeout: 60_000, maxWait: 5_000});
}

export async function recordAlternativeRefund(raw: unknown, file: File, actorId: string) {
  requireEnabled();
  const parsed = details.safeParse(raw);
  if (!parsed.success) return alternativeReview('Complete the repayment details and confirm that the customer has received the full amount.');
  const input = parsed.data, date = new Date(`${input.settledOn}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== input.settledOn || input.settledOn > new Date().toISOString().slice(0,10)) {
    return alternativeReview('Enter a valid settlement date that is not in the future.');
  }
  const validation = await validateAlternativeRefundFile(file);
  if (!validation.ok) return alternativeReview(validation.error);
  const bytes = new Uint8Array(await file.arrayBuffer()), evidenceSha256 = sha(bytes);
  const evidenceName = file.name.replace(/[^A-Za-z0-9 ._-]/g, '_').slice(0,120) || `repayment.${validation.extension}`;
  const normalizedReference = input.reference.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (normalizedReference.length < 3) return alternativeReview('Enter a meaningful, unique repayment reference.');
  const referenceHash = sha(normalizedReference);
  const requestHash = sha(JSON.stringify({...input, actorId, evidenceSha256, evidenceName, evidenceType: file.type}));
  const environment = paymentEnvironment();
  const stripe = await verifiedConnectClient();
  return prisma.$transaction(async tx => {
    const ref = await tx.bookingPayment.findUnique({where: {id: input.paymentId}, select: {bookingId: true}});
    if (!ref) return alternativeReview('Payment not found.');
    await tx.$queryRaw`SELECT id FROM "Booking" WHERE id=${ref.bookingId} FOR UPDATE`;
    const actor = await tx.user.findUnique({where: {id: actorId}, select: {role: true, accountStatus: true}});
    if (actor?.role !== 'ADMIN' || actor.accountStatus !== 'ACTIVE') return alternativeReview('Active administrator access is required.');
    const existing = await tx.alternativeRefund.findUnique({where: {paymentId: input.paymentId}, select: {...alternativeRefundSummarySelect, requestHash: true, environment: true}});
    if (existing) {
      if (existing.id !== input.id || existing.requestHash !== requestHash || existing.environment !== environment) {
        return alternativeReview('An alternative repayment is already recorded. Refresh before continuing.');
      }
      const {requestHash: _hash, environment: _env, ...summary} = existing;
      return {record: summary, replayed: true};
    }
    const payment = await tx.bookingPayment.findUniqueOrThrow({where: {id: input.paymentId}, include});
    const row = assertAlternativeEligible(payment, input.failedRefundId, input.amountPence, environment);
    if (input.settledOn < row.createdAt.toISOString().slice(0,10)) return alternativeReview('Settlement cannot predate the refund instruction.');
    if (await tx.alternativeRefund.findUnique({where: {environment_referenceHash: {environment, referenceHash}}, select: {id: true}})) {
      return alternativeReview('This repayment reference has already been used. Nothing has been recorded.');
    }
    if (await tx.alternativeRefund.findUnique({where: {environment_evidenceSha256: {environment, evidenceSha256}}, select: {id: true}})) {
      return alternativeReview('This repayment evidence has already been used. Use evidence unique to this repayment.');
    }
    await checkCanonical(tx, stripe, payment, row);
    const record = await tx.alternativeRefund.create({data: {
      id: input.id, paymentId: payment.id, failedRefundId: row.id, actorId, environment,
      amountPence: input.amountPence, stripeRefundedPence: 0, method: input.method, reference: input.reference,
      referenceHash, settledOn: date, note: input.note, requestHash, evidenceName, evidenceType: file.type,
      evidenceSha256, evidenceBytes: bytes, canonicalCheckedAt: new Date(),
    }, select: alternativeRefundSummarySelect});
    await tx.bookingPayment.update({where: {id: payment.id}, data: {refundedPence: payment.paidPence,
      platformFeePence: 0, transporterProceedsPence: 0, status: 'REFUNDED', payoutStatus: 'CANCELLED'}});
    // Preserve FAILED, failure code, original ledger timestamp and attempt count.
    await tx.stripeRefund.update({where: {id: row.id}, data: {activePaymentId: null}});
    await tx.financeEvent.create({data: {id: `alternative-refund-${record.id}`, paymentId: payment.id,
      type: 'REFUND_CREATED', amountPence: record.amountPence, actorId, note: `ALTERNATIVE_REFUND_RECORDED:${record.id}:${row.id}`}});
    for (const [userId, href] of [[payment.booking.customerId, '/payments'], [payment.booking.transporterId, '/transporter/proceeds']]) {
      const id = `alternative-refund-${record.id}-${userId}`;
      const body = `An administrator recorded a completed alternative repayment of £${(record.amountPence / 100).toFixed(2)}. The customer balance is fully repaid and this booking's transporter payout is cancelled. The original Stripe refund remains failed in the history.`;
      await tx.$executeRaw`INSERT INTO "Notification" ("id","userId","type","title","body","href","createdAt") VALUES (${id},${userId},'PAYMENT','Repaid by alternative method',${body},${href},NOW()) ON CONFLICT ("id") DO NOTHING`;
    }
    return {record, replayed: false};
  }, {timeout: 60_000, maxWait: 5_000});
}
