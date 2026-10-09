# Authorise first, capture on transporter confirmation

Prepared against feature/ui-polish cf67553d52b0e41ffc5170991a2c87d2c0e5acd4. Preview only; do not merge to production.

## Customer and transporter flow

1. Customer reviews the agreed collection window and full customer price, and authorises payment. The simulated preview explicitly labels this as a test; Stripe mode redirects to hosted Checkout with manual capture and cards only.
2. Only verified authorisation exposes the request to the transporter. No booking/payment ledger record is created yet.
3. Transporter confirms they can meet the window. The travel/preparation selector and the subsequent customer payment step have been removed.
4. The database records CAPTURING before the external capture call. After verified successful capture, one transaction creates the paid booking, accepts the chosen quote, closes the other quotes and retains existing cancelled booking history.
5. Decline, withdrawal or expiry releases the authorisation. No cancellation fine applies before the paid booking. Provider failures keep a retryable RELEASE_PENDING state rather than pretending funds were released.
6. Capture failure creates no active delivery. Ambiguous capture responses are reconciled against Stripe's current state. Unexpected capture without a transporter confirmation is refunded using an idempotent compensating operation.

The response period remains 12 UK business hours (08:00–20:00) or 1 hour for same-day collection. There is no post-confirmation payment timer. The response deadline is capped by quote expiry, card authorisation expiry and collection cutoff minus a fixed 30-minute minimum. This is not a route estimate: the transporter must check they can actually reach collection before confirming.

## Database rollout requires approval

The currently configured POSTGRES_PRISMA_URL targets BOTH production and preview. There is no branch override. The existing project rule requires explicit approval before changing that shared database. This task has prepared and tested, but has NOT applied, migration `20261009211524_payment_authorisation`.

It adds seven nullable fields to AvailabilityRequest, two unique indexes, an amount check and expands three existing status/active/confirmation checks. No existing records are changed or deleted. RLS and revoked public/anon/authenticated grants remain intact. Earlier unbacked requests remain readable, but cannot be converted to paid bookings: the customer must withdraw and select the quote again.

After approval, apply the exact reviewed SQL transaction, verify columns/checks/RLS, and move feature/ui-polish to the prepared commit with an expected-head guard. Do not publish new code before the migration. Do not change the production branch.

## Stripe setup (not currently configured)

No STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET or CRON_SECRET exists in current Vercel metadata. The code works in the existing clearly labelled TEST simulation until Stripe test keys are configured.

For Stripe test integration configure, on feature/ui-polish preview ONLY:
- STRIPE_SECRET_KEY: Stripe test secret/restricted key. Never expose it in NEXT_PUBLIC variables or paste it in chat.
- STRIPE_WEBHOOK_SECRET: signing secret for this deployment's /api/stripe/webhook endpoint.
- STRIPE_CHECKOUT_ORIGIN: stable preview origin. Defaults to VERCEL_BRANCH_URL; explicitly set for protected/stable aliases.
- CRON_SECRET: high-entropy secret for GET /api/cron/booking-authorisations.

Webhook subscriptions: checkout.session.completed, checkout.session.expired, payment_intent.amount_capturable_updated, payment_intent.succeeded, payment_intent.payment_failed, payment_intent.canceled. Raw body HMAC and timestamp are verified; live events are rejected. Handler retrieves canonical current provider state, verifies amount/currency/mode/metadata/identity, and processes state transitions under the job lock. Return URL alone never proves payment.

Arrange a scheduler to call the protected reconciliation endpoint every minute, targeting the preview environment. Vercel Cron does not run on preview deployments; do not pretend a vercel.json schedule enables it there. Account refreshes and signed webhooks also recover pending operations, but background expiry must be configured before using actual Stripe holds. Deployment protection must permit the webhook and scheduler through the supported Vercel mechanism.

Run the card flow in Stripe test mode after configuration, including 3DS, decline, authorisation expiry, duplicate webhooks, interrupted capture and released holds. Local tests mock the Stripe API contract; they are not evidence of a real Stripe end-to-end transaction.

Live Stripe keys and production payments are intentionally disabled. Production payment rollout, Stripe Connect transporter onboarding/payouts, real post-booking refunds and cancellation refunds remain separate work. Existing simulated admin refund/payout endpoints reject STRIPE records rather than misreporting fake money movements. Existing TEST finance workflows are unchanged.

## Verification

- `node scripts/test-availability-time.cjs`: UK/DST/deadline tests.
- `node scripts/test-stripe-authorisation-provider.cjs`: environment guards and webhook signature/timestamp/tamper/live checks.
- `POSTGRES_PRISMA_URL=<disposable localhost Postgres URL> VERCEL_ENV=preview node scripts/test-booking-authorisation.cjs`: actual Prisma transactions with TEST flow plus a mocked Stripe contract (not real cards).
- TypeScript check and Next production build.
- Desktop browser flow through separately authenticated customer and transporter accounts in the disposable local database.

The earlier active-delivery compact-button/commission-row design remains preview-only and is not included in these code changes.

## Completed checks for this prepared change

46 database-backed flow assertions passed, including a simulated database failure AFTER successful Stripe capture, followed by recovery without a second capture. The 22 deadline/DST checks, provider/webhook tests, payout policy regression checks and TypeScript validation passed. The standard Turbopack production build passed. The desktop browser test passed through customer selection/authorisation, transporter confirmation, captured booking and customer active-booking display; no browser page errors were recorded.

The shared Supabase database was inspected read-only. No migration, preview deployment, production deployment or live payment was performed.
