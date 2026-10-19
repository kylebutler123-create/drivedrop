# Stripe sandbox setup — 19 October 2026

## Current status

**Stripe sandbox checkout and automatic recovery are active on `feature/ui-polish`.** Real Stripe sandbox checks passed. The two synthetic accounts and seven synthetic jobs/quotes/requests were removed after their payments were settled. No original user, booking or stored-file record was changed.

- Preview: https://drivedrop-git-feature-ui-polish-future-9f39.vercel.app
- Stripe account: `acct_1US4BzLAzgkvCvrI` (drivedrop sandbox, `livemode: false`).
- Vercel project: `prj_8BO4s7P2sffGKR4czg6nHOZqg4Ze`; team `team_HR29ivw10fPMfg8JK98snQj5`.
- Shared preview database: `yozbuuvebzxitoqrvyer`. Prepared production database `srqhjgrhgyyfdaxckjum` was not touched.
- Recovery code: `85c61837b89da321c6a7925ccb3dd9fbc2f0c5d1`, deployed READY as `dpl_GeBs5LGvYoZpFyEz9cZSumeKpJaV` with the stable preview alias.
- The approved admin desktop UI is preserved. No production branch merge or production deployment was performed. Live payments remain disabled by code.

## Approved scope and credentials

The user approved the shared-database timer, project-wide Vercel automation credential, its use in Stripe and Vault, signed-in dashboard fallback, and subsequently its automatic availability to **all future project deployments, builds and runtimes, including production**. These approvals remain valid. They do not authorize live payments or a production deployment.

Deployment Protection remains enabled. The automation credential passes the Vercel gate for this project's deployments; it does not bypass DriveDrop user authentication. It is used by the fixed preview webhook URL and the private scheduler header. Treat the full webhook URL as secret because it contains the bypass query parameter. Never put that URL or any credential value in logs, screenshots, source control or chat.

Vercel variables are scoped to **Preview / `feature/ui-polish`**:

| Variable | State |
| --- | --- |
| `STRIPE_SECRET_KEY` | Active sensitive restricted sandbox key |
| `STRIPE_WEBHOOK_SECRET` | Sensitive webhook signing secret |
| `CRON_SECRET` | Sensitive scheduler Bearer secret |
| `STRIPE_CHECKOUT_ORIGIN` | Stable preview origin above |
| `STRIPE_SANDBOX_PENDING_KEY` | Unused sensitive copy of the same restricted key; ignored by application code |

Vercel rejected renaming a sensitive environment variable, so the same approved key was securely saved under the active name. Its permissions remain Write for Charges/Refunds, Checkout Sessions and Payment Intents; no Connect permissions. No additional Stripe key was created for activation.

Vault contains `drivedrop_preview_booking_cron_secret` and `drivedrop_preview_vercel_bypass`. Anonymous and authenticated client roles have no access to the private scheduler schema, its run table or its execution function. The Stripe API key and webhook signing secret are not needed by the database scheduler.

## Webhook

`we_1USMj9LAzgkvCvrIzq4UAION` is enabled in the sandbox, API version `2024-06-20`, connected-account events disabled. It targets the preview `/api/stripe/webhook` with the secret Vercel bypass parameter and subscribes to:

- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.amount_capturable_updated`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`

Unsigned requests returned 400. Correctly signed requests and repeat deliveries returned 200. Real hosted Checkout completion advanced the database to AUTHORISED while the timer was paused and without an account-refresh reconciliation, confirming genuine Stripe webhook delivery. Return URLs alone never prove payment.

## Recovery timer and timeout correction

Cron job 1, `drivedrop-preview-booking-authorisations`, is **active**, owned by `postgres`, scheduled every minute. It calls `drivedrop_preview_ops.poll_booking_authorisations()`.

The private function uses the `http` extension directly, with Bearer and Vercel headers kept in request memory. The initial pg_net approach was removed with RESTRICT while its queues were empty: Supabase's managed queue grants would otherwise expose request headers. No secret-bearing request was queued. Managed HTTP timeout overrides were denied and were not bypassed.

A real held-card expiry exposed the HTTP client's short timeout: Stripe released the hold, but the synchronous scheduler request timed out. The deployed correction calls `?dispatch=1`, commits a private run record and returns **202 Accepted** before using Next.js `after()` to process payments. An accepted dispatch is not evidence that payments completed.

The worker processes at most ten requests per run and stops starting further work after 45 seconds. The route has a 180-second execution limit. A transaction lock and unique active-run index prevent duplicate workers. A four-minute lease lets subsequent ticks retry after a terminated invocation. Existing canonical Stripe checks, payment idempotency keys and job locks remain authoritative. Failed requests rotate behind other waiting work. Run records retain status, checked/failed counts and start/finish times; completed records older than seven days are pruned. No credentials are stored in run records.

Applied SQL is versioned in:

- `scripts/sql/preview-payment-recovery-runs.sql`
- `scripts/sql/preview-payment-recovery-dispatch.sql`

These scripts are preview-operations setup, not production Prisma migrations. Do not blindly rerun them or create this private schema in production.

Manual dispatch acknowledgements took 2,653 ms and 1,670 ms. A nonempty background run completed two requests with zero failures in about 16 seconds. The first actual cron tick started at `2026-10-19 21:00:00 UTC`; its HTTP dispatch succeeded, and worker `b0a08d5e-103d-40be-86a0-8f01a0ed403d` finished at `21:00:09 UTC` with checked=1, failed=0. Subsequent empty ticks also completed successfully.

Inspect both layers:

```sql
select runid,status,start_time,end_time,return_message
from cron.job_run_details where jobid=1 order by start_time desc limit 10;
select id,status,checked,failed,started_at,finished_at
from drivedrop_preview_ops.booking_authorisation_runs
order by started_at desc limit 10;
```

A successful pg_cron row proves dispatch only. Confirm `finished_at` and worker status; investigate failed/interrupted runs and persistent pending requests. pg_cron history retention is separate from the seven-day private run log.

## Sandbox acceptance evidence

All amounts below are simulated £55 authorisations. No real money moved. Synthetic notification addresses used Resend's documented delivered+label test domain; no human recipients were used.

| Check | Observed outcome |
| --- | --- |
| Hosted Checkout manual authorisation | `requires_capture`, received £0; request AUTHORISED, no booking |
| Transporter confirmation | £55 captured; one CONFIRMED/PAID booking and one capture event; transporter proceeds £50 |
| Repeated confirmation / signed duplicate event | Same booking; still one capture event |
| 3D Secure challenge | Test card 3220 authenticated; authorised with received £0 |
| Transporter decline | Stripe intent canceled, request DECLINED/RELEASED; no booking or cancellation fine |
| Customer withdrawal after 3DS | Stripe intent canceled, request WITHDRAWN/RELEASED |
| Held authorisation expiry | Request EXPIRED/RELEASED, Stripe canceled with received £0 |
| Abandoned checkout expiry | Checkout session expired, no payment intent or booking |
| Declined card | Checkout displayed decline; `requires_payment_method`, generic_decline, received £0, no booking |
| Interrupted confirmation before capture | Background recovery captured and created one paid booking |
| Capture succeeded but booking commit absent | Only the synthetic fixture was staged to represent this state; scheduled recovery created one booking, preserving the same Stripe charge ID and £55 amount |
| Active/stale worker lease | Active lease reused without processing; expired synthetic lease marked interrupted and work recovered |
| Scheduler authentication | Missing/wrong Bearer returned 403, including the background dispatch path |

Main intent: `pi_3USNMyLAzgkvCvrI0NBHxq64`.
Recovery intent: `pi_3USNWVLAzgkvCvrI0cGzCmDO`; charge `ch_3USNWVLAzgkvCvrI0htHLgdr` remained unchanged across recovery.
Both simulated captures were fully refunded during cleanup: `re_3USNMyLAzgkvCvrI00yL7LEj` and `re_3USNWVLAzgkvCvrI0YKBZKiy`, status succeeded. All other test intents were canceled or never authorised. Stripe audit objects remain in the sandbox; temporary application fixtures were removed.

Focused recovery tests, TypeScript validation and the Next.js production build passed. The local build used a dummy localhost database URL; it did not connect to the shared database. The preview deployment build also passed. These checks validate the exercised small batches, not high-volume load or production readiness.

## Data preservation and remaining scope

Final counts and whole-row fingerprints exactly match the pre-change baseline:

| Records | Count | Fingerprint |
| --- | ---: | --- |
| Users | 16 | `cee2156e48900d3181a655803ab0d167` |
| Bookings | 52 | `c71531a7810c2a5076f83f1dd45ae471` |
| Stored files | 136 | `ebbe346597d33536e580807e5b9ccf1a` |

Pending preview authorisations/captures/releases after cleanup: zero. The sandbox checkout, enabled webhook and active recovery timer remain available for preview testing.

Stripe Connect onboarding/transporter payouts, real post-booking refunds, production payment configuration and production rollout are separate work. Existing simulated admin refund/payout endpoints reject STRIPE records. Do not describe those as completed by this checkpoint.

## Rollback

First stop new checkout creation and settle outstanding sandbox holds/captures while working credentials remain available. Then pause only the named cron job, disable only this sandbox webhook, remove the active preview Stripe-key configuration and redeploy preview. Do not delete the database, existing records, unrelated jobs, Vault extension or file storage. Retain recovery credentials until pending payments are resolved. Revoke the project automation credential only after its consumers have stopped, accounting for its approved automatic distribution to future deployments.

## References

- https://docs.stripe.com/testing
- https://docs.stripe.com/keys/restricted-api-keys
- https://resend.com/docs/dashboard/emails/send-test-emails
- https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation
- https://supabase.com/docs/guides/troubleshooting/database-roles-can-read-request-headers-queued-by-pg_net-ad6357
- https://supabase.com/docs/guides/database/extensions/http
- https://github.com/pramsey/pgsql-http
