import Stripe from 'stripe';
import {checkoutOrigin, paymentEnvironment} from './booking-authorisation-provider';
import {assertProductionPaymentConfiguration, expectedStripePlatform, productionPaymentsEnabled, STRIPE_SANDBOX_ACCOUNT} from './payment-runtime';

export const CONNECT_SANDBOX_ACCOUNT = STRIPE_SANDBOX_ACCOUNT;
export const CONNECT_RETRY_WINDOW_MS = 23 * 60 * 60 * 1000;
export class ConnectError extends Error {
  constructor(message: string, public code = 'CONNECT_UNAVAILABLE') { super(message); }
}

export function connectEnabled() {
  return process.env.STRIPE_CONNECT_ENABLED === 'true' && connectReconciliationEnabled();
}

export function connectReconciliationEnabled() {
  return paymentEnvironment() === 'production' ? productionPaymentsEnabled() : process.env.STRIPE_CONNECT_ENABLED === 'true';
}

export function connectClient() {
  if (!connectReconciliationEnabled()) throw new ConnectError('Stripe payout processing is not enabled yet.');
  try {assertProductionPaymentConfiguration();} catch (error) {throw new ConnectError(error instanceof Error ? error.message : 'Invalid payment configuration.', 'CONFIGURATION');}
  const key = process.env.STRIPE_CONNECT_SECRET_KEY || '';
  if (!key.startsWith(paymentEnvironment() === 'production' ? 'rk_live_' : 'rk_test_')) throw new ConnectError('A restricted Stripe key matching this environment is required.', 'CONFIGURATION');
  if (!process.env.STRIPE_CONNECT_WEBHOOK_SECRET || !process.env.STRIPE_CONNECT_EVENTS_SECRET || !process.env.CRON_SECRET) {
    throw new ConnectError('Stripe payout webhooks and recovery must be configured first.');
  }
  // The SDK's pinned API version applies only to this new Connect integration.
  // Existing, verified Checkout authorisations keep their current API version.
  return new Stripe(key, {timeout: 12_000, maxNetworkRetries: 0});
}

export async function verifiedConnectClient() {
  const stripe = connectClient();
  const account = await stripe.accounts.retrieveCurrent();
  if (account.id !== expectedStripePlatform()) throw new ConnectError('Stripe platform account does not match this environment.', 'CONFIGURATION');
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
