import {AvailabilityError} from './availability-error';

export const STRIPE_SANDBOX_ACCOUNT = 'acct_1US4BzLAzgkvCvrI';
export const PRODUCTION_SUPABASE_PROJECT = 'srqhjgrhgyyfdaxckjum';
export type PaymentEnvironment = 'production' | 'preview' | 'development';

export function supportedPaymentEnvironment(value: string): value is PaymentEnvironment {
  return ['production', 'preview', 'development'].includes(value);
}

export function paymentEnvironment(): PaymentEnvironment {
  const value = process.env.VERCEL_ENV || (process.env.NODE_ENV === 'production' ? 'production' : 'development');
  if (!supportedPaymentEnvironment(value)) throw new AvailabilityError('Unsupported payment environment.');
  return value;
}

export function stripeLivemode(environment: string = paymentEnvironment()) {
  if (!supportedPaymentEnvironment(environment)) throw new AvailabilityError('Unsupported payment environment.');
  return environment === 'production';
}

// This enables canonical reconciliation, not new money operations. Keep it on
// during an incident pause; the creation flags can all be switched off separately.
export function productionPaymentsEnabled() {
  return paymentEnvironment() === 'production' && process.env.STRIPE_PAYMENTS_ENABLED === 'true';
}

export function productionAppOrigin() {
  const value = process.env.NEXT_PUBLIC_APP_URL;
  try {
    const url = new URL(value || '');
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' ||
        url.search || url.hash || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error();
    return url.origin;
  } catch { throw new AvailabilityError('Configure the production HTTPS application origin.'); }
}

export function expectedStripePlatform() {
  if (paymentEnvironment() !== 'production') return STRIPE_SANDBOX_ACCOUNT;
  const id = process.env.STRIPE_PLATFORM_ACCOUNT_ID || '';
  if (!/^acct_[a-zA-Z0-9]+$/.test(id) || id === STRIPE_SANDBOX_ACCOUNT) {
    throw new AvailabilityError('Configure the expected live Stripe platform account.');
  }
  return id;
}

export function assertProductionPaymentConfiguration() {
  if (paymentEnvironment() !== 'production') return;
  if (!productionPaymentsEnabled()) throw new AvailabilityError('Booking payments are not enabled in production yet.');
  expectedStripePlatform();
  // Validate the whole financial integration before any live operation. A
  // working Checkout key alone must not admit bookings with recovery unconfigured.
  for (const name of ['STRIPE_SECRET_KEY', 'STRIPE_CONNECT_SECRET_KEY']) {
    if (!process.env[name]?.startsWith('rk_live_')) {
      throw new AvailabilityError('Production requires restricted Stripe keys matching the live environment.');
    }
  }
  for (const name of ['STRIPE_WEBHOOK_SECRET', 'STRIPE_CONNECT_WEBHOOK_SECRET', 'STRIPE_CONNECT_EVENTS_SECRET', 'CRON_SECRET']) {
    if (!process.env[name]?.trim()) throw new AvailabilityError('Configure all production payment webhooks and recovery before enabling payments.');
  }
  if (process.env.STRIPE_CHECKOUT_ORIGIN !== productionAppOrigin()) {
    throw new AvailabilityError('Production Checkout and application origins must match.');
  }
  // Existing Vercel variables include shared preview scopes. A production payment
  // must never run against that database, even if live keys were added by mistake.
  try {
    const storage = new URL(process.env.SUPABASE_URL || '');
    const db = new URL(process.env.POSTGRES_PRISMA_URL || '');
    const direct = db.hostname === `db.${PRODUCTION_SUPABASE_PROJECT}.supabase.co`;
    const pooled = db.hostname.endsWith('.pooler.supabase.com') && decodeURIComponent(db.username) === `postgres.${PRODUCTION_SUPABASE_PROJECT}`;
    if (storage.origin !== `https://${PRODUCTION_SUPABASE_PROJECT}.supabase.co` ||
        !['postgres:', 'postgresql:'].includes(db.protocol) || (!direct && !pooled) || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error();
  } catch { throw new AvailabilityError('Production payments require the isolated production database and storage configuration.'); }
}

export function assertTestFinanceAllowed() {
  if (paymentEnvironment() === 'production') throw new AvailabilityError('Test finance is permanently disabled in production.');
}
