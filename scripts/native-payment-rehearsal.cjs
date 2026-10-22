// Shared safeguards for disposable native database tests. No hosted connection
// or provider call is permitted; production-shaped values below are inert fixtures.
const assert = require('node:assert/strict');

function nativeDatabaseUrl() {
  const url = new URL(process.env.REHEARSAL_DATABASE_URL || 'missing:');
  assert(['postgres:', 'postgresql:'].includes(url.protocol) &&
    ['localhost', '127.0.0.1'].includes(url.hostname) && url.port &&
    /^\/drivedrop_rehearsal_[a-z0-9_]+$/.test(url.pathname) && !url.search,
  'An explicitly named disposable localhost rehearsal database is required');
  assert.equal(process.env.POSTGRES_PRISMA_URL, process.env.REHEARSAL_DATABASE_URL,
    'Both database settings must identify the same disposable database');
  return url.toString();
}

function configureSyntheticProduction() {
  // Prisma clients MUST already have an explicit, validated localhost datasource.
  // This URL is used only by the application's configuration guard, never Prisma.
  Object.assign(process.env, {
    VERCEL_ENV: 'production', NODE_ENV: 'test', STRIPE_PAYMENTS_ENABLED: 'true',
    STRIPE_CHECKOUT_ENABLED: 'false', STRIPE_CONNECT_ENABLED: 'false',
    STRIPE_REFUNDS_ENABLED: 'false', STRIPE_ALTERNATIVE_REFUNDS_ENABLED: 'false',
    STRIPE_PLATFORM_ACCOUNT_ID: 'acct_NativeOfflineFixture',
    STRIPE_SECRET_KEY: ['rk', 'live', 'NOT_A_KEY'].join('_'),
    STRIPE_CONNECT_SECRET_KEY: ['rk', 'live', 'NOT_A_KEY'].join('_'),
    STRIPE_WEBHOOK_SECRET: 'offline-fixture', STRIPE_CONNECT_WEBHOOK_SECRET: 'offline-fixture',
    STRIPE_CONNECT_EVENTS_SECRET: 'offline-fixture', CRON_SECRET: 'offline-fixture',
    NEXT_PUBLIC_APP_URL: 'https://production.example.invalid',
    STRIPE_CHECKOUT_ORIGIN: 'https://production.example.invalid',
    SUPABASE_URL: 'https://srqhjgrhgyyfdaxckjum.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'offline-fixture',
    POSTGRES_PRISMA_URL: 'postgresql://postgres:NOT_A_PASSWORD@db.srqhjgrhgyyfdaxckjum.supabase.co/postgres',
    TRANSACTIONAL_EMAILS_ENABLED: 'false',
  });
  global.fetch = async () => {throw Error('Network calls are forbidden in the native rehearsal');};
}

module.exports = {nativeDatabaseUrl, configureSyntheticProduction};
