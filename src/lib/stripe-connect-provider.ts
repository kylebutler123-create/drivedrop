import Stripe from 'stripe';
import {createNetworkQaClient} from './stripe-refund-network-qa';
import {checkoutOrigin, paymentEnvironment} from './booking-authorisation-provider';

export const CONNECT_SANDBOX_ACCOUNT = 'acct_1US4BzLAzgkvCvrI';
export const CONNECT_RETRY_WINDOW_MS = 23 * 60 * 60 * 1000;
export class ConnectError extends Error {
  constructor(message: string, public code = 'CONNECT_UNAVAILABLE') { super(message); }
}

export function connectEnabled() {
  return process.env.STRIPE_CONNECT_ENABLED === 'true' &&
    paymentEnvironment() !== 'production' &&
    !(!process.env.VERCEL_ENV && process.env.NODE_ENV === 'production');
}

export function connectClient() {
  if (!connectEnabled()) throw new ConnectError('Stripe sandbox payout setup is not enabled yet.');
  const key = process.env.STRIPE_CONNECT_SECRET_KEY || '';
  if (!key.startsWith('rk_test_')) throw new ConnectError('A restricted Stripe sandbox key is required.');
  if (!process.env.STRIPE_CONNECT_WEBHOOK_SECRET || !process.env.STRIPE_CONNECT_EVENTS_SECRET || !process.env.CRON_SECRET) {
    throw new ConnectError('Stripe payout webhooks and recovery must be configured first.');
  }
  // The SDK's pinned API version applies only to this new Connect integration.
  // Existing, verified Checkout authorisations keep their current API version.
  return new Stripe(key, {timeout: 12_000, maxNetworkRetries: 0, httpClient: createNetworkQaClient()});
}

export async function verifiedConnectClient() {
  const stripe = connectClient();
  const account = await stripe.accounts.retrieveCurrent();
  if (account.id !== CONNECT_SANDBOX_ACCOUNT) throw new ConnectError('Stripe sandbox account does not match this preview.');
  return stripe;
}

export function connectOrigin() {
  const origin = checkoutOrigin();
  if (!origin.startsWith('https://')) throw new ConnectError('Stripe onboarding requires an HTTPS return address.');
  return origin;
}

export function connectErrorMessage(error: unknown) {
  return error instanceof ConnectError ? error.message : 'Stripe could not complete this request. Please refresh the status and try again.';
}

// Payment/identity data and raw Stripe error bodies must never reach logs or clients.
export function connectFailureCode(error: unknown) {
  if (error instanceof ConnectError) return error.code;
  // Keep database failures diagnosable without logging queries or parameters.
  if (error instanceof Error && 'code' in error && typeof error.code === 'string' && /^P\d{4}$/.test(error.code)) return error.code;
  if (error instanceof Stripe.errors.StripeError) {
    if (error.type === 'StripePermissionError' || error.type === 'StripeAuthenticationError') return 'CONFIGURATION';
    if (error.code === 'balance_insufficient') return 'INSUFFICIENT_BALANCE';
    if (error.type === 'StripeConnectionError' || error.type === 'StripeAPIError') return 'RETRY_PENDING';
  }
  return 'RETRY_PENDING';
}

export function safeStripeRedirect(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !['connect.stripe.com', 'connect-js.stripe.com'].includes(url.hostname)) {
    throw new ConnectError('Stripe returned an invalid account link.');
  }
  return url.toString();
}
