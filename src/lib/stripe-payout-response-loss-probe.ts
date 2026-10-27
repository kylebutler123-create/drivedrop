import Stripe from 'stripe';
import {IncomingMessage} from 'node:http';
import {createHash} from 'node:crypto';
import {STRIPE_SANDBOX_ACCOUNT} from './payment-runtime';

// Temporary QA25 probe. No client input can enable it. The ordinary client,
// request, retry policy, locks and accounting remain authoritative.
const ORIGIN = 'https://drivedrop-git-feature-ui-polish-future-9f39.vercel.app';
const MANIFEST_KEY = 'DRIVEDROP_QA25_RESPONSE_LOSS';
const MAX_WINDOW = 10 * 60_000;
const fields = ['version', 'platformId', 'bookingId', 'paymentId', 'connectAccountId',
  'destinationAccountId', 'paymentIntentId', 'sourceChargeId', 'armedAt', 'expiresAt'];
type Manifest = {version: 1; platformId: string; bookingId: string; paymentId: string;
  connectAccountId: string; destinationAccountId: string; paymentIntentId: string;
  sourceChargeId: string; armedAt: string; expiresAt: string};
type Payout = {id: string; paymentId: string; connectAccountId: string; environment: string;
  destinationAccountId: string; paymentIntentId: string; sourceChargeId: string;
  grossPence: number; finePence: number; amountPence: number; paidPence: number;
  refundedPence: number; reversedPence: number; status: string; attemptCount: number;
  createdAt: Date; firstAttemptAt: Date | null; stripeTransferId: string | null;
  transferredAt: Date | null; payment?: {bookingId: string}};

function manifest(): Manifest | null {
  if (process.env.VERCEL_ENV !== 'preview' ||
      process.env.VERCEL_GIT_COMMIT_REF !== 'feature/ui-polish' ||
      process.env.STRIPE_CHECKOUT_ORIGIN !== ORIGIN ||
      process.env.STRIPE_CONNECT_ENABLED !== 'true' ||
      process.env.STRIPE_REFUNDS_ENABLED !== 'false') return null;
  try {
    const raw = process.env[MANIFEST_KEY];
    if (!raw || raw.length > 2048) return null;
    const value = JSON.parse(raw);
    if (!value || Array.isArray(value) || Object.keys(value).length !== fields.length ||
        fields.some(key => !Object.hasOwn(value, key)) || value.version !== 1 ||
        value.platformId !== STRIPE_SANDBOX_ACCOUNT) return null;
    for (const key of fields.slice(1, 8)) {
      if (typeof value[key] !== 'string' || !/^[a-zA-Z0-9_-]{3,100}$/.test(value[key])) return null;
    }
    const start = Date.parse(value.armedAt), end = Date.parse(value.expiresAt), now = Date.now();
    if (!Number.isFinite(start) || !Number.isFinite(end) ||
        new Date(start).toISOString() !== value.armedAt || new Date(end).toISOString() !== value.expiresAt ||
        start > now || end <= now || end <= start || end - start > MAX_WINDOW) return null;
    return value;
  } catch { return null; }
}

function sameCase(payout: Payout, value: Manifest) {
  return payout.environment === 'preview' && payout.paymentId === value.paymentId &&
    payout.connectAccountId === value.connectAccountId && payout.destinationAccountId === value.destinationAccountId &&
    payout.paymentIntentId === value.paymentIntentId && payout.sourceChargeId === value.sourceChargeId &&
    payout.grossPence === 1000 && payout.amountPence === 1000 && payout.paidPence === 1100 &&
    payout.finePence === 0 && payout.refundedPence === 0 && payout.reversedPence === 0 &&
    payout.status === 'PENDING' && !payout.stripeTransferId && !payout.transferredAt &&
    payout.createdAt instanceof Date && +payout.createdAt >= Date.parse(value.armedAt) &&
    +payout.createdAt <= Date.now();
}

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
function header(headers: Record<string, unknown>, name: string) {
  const matches = Object.entries(headers).filter(([key, value]) => key.toLowerCase() === name && value !== undefined);
  return matches.length === 1 && typeof matches[0][1] === 'string' ? matches[0][1] : null;
}

export function createPayoutResponseLossProbe(original: Payout) {
  const initial = manifest();
  if (!initial || original.payment?.bookingId !== initial.bookingId || !sameCase(original, initial) ||
      original.attemptCount !== 0 || original.firstAttemptAt !== null) return undefined;
  const pinned = JSON.stringify(initial);
  const currentScope = () => {const next = manifest(); return next && JSON.stringify(next) === pinned ? next : null;};
  const inner = Stripe.createNodeHttpClient();
  let armed = false, fired = false, requests = 0;
  const expected = new Map(Object.entries({amount: '1000', currency: 'gbp',
    destination: original.destinationAccountId, source_transaction: original.sourceChargeId,
    transfer_group: `dd_payout_${original.id}`, 'metadata[driveDropPayoutId]': original.id,
    'metadata[paymentId]': original.paymentId, 'metadata[environment]': 'preview'}));
  const key = `dd-payout-${original.id}`;
  const log = (stage: string, extra: Record<string, unknown> = {}) => {
    // Only bounded identifiers, hashes and outcomes; never credentials or raw bodies.
    try { console.info('QA25 payout response loss', {stage, payoutId: original.id,
      paymentId: original.paymentId, ...extra}); } catch {}
  };
  const httpClient: Stripe.HttpClient = {
    getClientName: () => inner.getClientName(),
    async makeRequest(host, port, path, method, headers, body, protocol, timeout) {
      const params = new URLSearchParams(body);
      const eligible = armed && !!currentScope() && host === 'api.stripe.com' && String(port) === '443' &&
        protocol === 'https' && path === '/v1/transfers' && method === 'POST' &&
        header(headers, 'idempotency-key') === key &&
        !Object.entries(headers).some(([name, value]) => value !== undefined &&
          ['stripe-account', 'stripe-context'].includes(name.toLowerCase())) &&
        Array.from(params.keys()).length === expected.size &&
        Array.from(expected).every(([name, value]) => params.getAll(name).length === 1 && params.get(name) === value);
      let ordinal = 0;
      if (eligible) {
        ordinal = ++requests;
        log('transfer_post_submitted', {ordinal, requestFingerprint: digest(`${method}\n${path}\n${body}`), keyFingerprint: digest(key)});
      }
      const response = await inner.makeRequest(host, port, path, method, headers, body, protocol, timeout);
      if (!eligible) return response;
      const requestId = header(response.getHeaders(), 'request-id');
      const status = response.getStatusCode();
      log('transfer_response_headers', {ordinal, status, requestId: requestId && /^req_[a-zA-Z0-9]+$/.test(requestId) ? requestId : null,
        idempotentReplayed: header(response.getHeaders(), 'idempotent-replayed') === 'true'});
      const stream = response.getRawResponse();
      if (fired || ordinal !== 1 || !currentScope() || status !== 200 ||
          !requestId || !/^req_[a-zA-Z0-9]+$/.test(requestId) || !(stream instanceof IncomingMessage)) return response;
      fired = true;
      // The real upstream POST returned 200. Discard this response before the SDK
      // consumes its body. Its existing ECONNRESET retry reuses the same request.
      stream.destroy();
      log('response_discarded', {ordinal, requestId, fault: 'ECONNRESET'});
      throw Object.assign(new Error('QA25 controlled response discard'), {code: 'ECONNRESET'});
    },
  };
  return {
    httpClient,
    arm(payout: Payout, payment: any, intent: any) {
      const value = currentScope();
      const confirmed = payment.booking?.customerConfirmedAt;
      armed = !!value && sameCase(payout, value) && payout.id === original.id && payout.attemptCount === 1 &&
        payout.firstAttemptAt instanceof Date && +payout.firstAttemptAt >= Date.parse(value.armedAt) &&
        +payout.firstAttemptAt <= Date.now() &&
        payment.id === value.paymentId && payment.bookingId === value.bookingId && payment.provider === 'STRIPE' &&
        payment.providerReference === value.paymentIntentId && payment.currency === 'GBP' && payment.status === 'PAID' &&
        payment.payoutStatus === 'PROCESSING' && payment.paidPence === 1100 && payment.refundedPence === 0 &&
        payment.platformFeePence === 100 && payment.transporterProceedsPence === 1000 && payment.cancellationDeductionPence === 0 &&
        payment.booking?.status === 'DELIVERED' && confirmed instanceof Date &&
        +confirmed <= Date.now() - 24 * 60 * 60_000 && payment.booking.disputes?.length === 0 &&
        intent?.id === value.paymentIntentId && intent.livemode === false && intent.status === 'succeeded' &&
        intent.capture_method === 'manual' && intent.amount === 1100 && intent.amount_received === 1100 && intent.currency === 'gbp' &&
        intent.latest_charge?.id === value.sourceChargeId && intent.latest_charge.livemode === false &&
        intent.latest_charge.paid === true && intent.latest_charge.captured === true &&
        intent.latest_charge.disputed === false && intent.latest_charge.amount_refunded === 0;
    },
    returned(transfer: Stripe.Transfer) {
      if (fired) log('sdk_transfer_returned', {transferId: transfer.id, livemode: transfer.livemode,
        amount: transfer.amount, currency: transfer.currency, requestCount: requests});
    },
  };
}
