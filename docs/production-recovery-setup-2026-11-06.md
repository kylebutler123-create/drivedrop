# Production recovery preparation — 6 November 2026

This change prepares the existing payment recovery worker for a one-minute Vercel schedule. It does not activate live payment processing or monitoring. The source base is `381fe3ae41413ef1a7993162ddcd58febe51c432` on `feature/ui-polish`; the preparation uses a separate branch.

## Schedule

| Route | UTC schedule | Change |
| --- | --- | --- |
| `/api/cron/daily-job-summary` | `0 8 * * *` | Preserved |
| `/api/cron/expire-quote-requests` | `0 3 * * *` | Preserved |
| `/api/cron/insurance-expiry-notifications` | `0 4 * * *` | Preserved |
| `/api/cron/booking-authorisations` | `* * * * *` | Added to the candidate |

The current Vercel documentation still supports `vercel.json` cron jobs, although it now labels them legacy and directs the dashboard to Schedules. No migration to the new Schedules SDK is part of this change. Vercel invokes jobs on its current Production deployment; a manually assigned apex alias alone does not prove scheduler activation. Verify the actual deployment and run source at activation.

## Prepared configuration

Production-only additions:

- `CRON_SECRET`: a newly generated 48-byte random value, saved as a sensitive variable. It is not shared with Preview.
- `STRIPE_CHECKOUT_ORIGIN=https://drive-drop.com`, matching the existing canonical app origin.
- `DRIVEDROP_PAYMENT_HEALTHCHECK_URL`: the existing production monitor's private endpoint, transferred directly to a sensitive variable. No endpoint value is recorded here.
- `DRIVEDROP_PAYMENT_HEALTHCHECK_ENABLED=false`.

The payment master, Checkout, Connect creation, refunds, alternative refunds, disputes and general transactional email remain disabled. Environment edits affect new builds; they do not change immutable older deployments.

## Read-only preflight

The isolated Production database already contains `drivedrop_production_ops.booking_authorisation_runs`. There is no `cron.job` table in that database. Production authorisation, payout and refund queues each contain zero total and zero pending records. The recovery log has zero rows and no active run. No migration, data mutation, financial fixture or manual dispatch was performed.

The existing free Healthchecks project and its production monitor were inspected. The production check is paused, ignores incoming pings while paused, has never received a ping, and retains a 60-second period and 240-second grace. Its existing operations-email integration remains assigned. The separate validation check remains paused. The previously authorised four test emails were all received; no new test email or manual success/failure ping is authorised by this preparation.

## Validation and limits

The candidate contains exactly four unique cron paths, preserves the three daily jobs byte-for-byte as parsed entries, and adds only the reviewed minute tick. `git diff --check` passes. Worker and heartbeat implementation hashes exactly match the recorded 29 October native PostgreSQL monitoring rehearsal:

| File | SHA-256 |
| --- | --- |
| `src/lib/booking-authorisation-recovery.ts` | `9fcec2a26146889633714504c7033bf8d813d415a695de0300e4f0d0d056b2ab` |
| `src/lib/payment-recovery-heartbeat.ts` | `f222c194367e7f5b6aa3c2970333e4c706d014b38035d51a8d48332e13432ab4` |
| `scripts/test-payment-recovery-heartbeat-native.cjs` | `52e26e28204b2cc322097a89bd2a18725cbd47628737e0e718e2afa0b75a0ea9` |

No financial test was repeated. Keep QA23 COMPLETE, QA25 COMPLETE/PASS and QA24 CLOSED/INCONCLUSIVE. The genuine insufficient-balance reversal/retry launch gate remains unresolved.

## Activation and acceptance still required

The current worker calls `assertProductionPaymentConfiguration()` before it can claim a run. Consequently, the payment master being off prevents both dispatch and its authenticated health check. Do not remove that guard, report an HTTP 202 as completion, or fabricate a green heartbeat.

Activation must coordinate the reviewed Production deployment/scheduler mapping, the reconciliation master and required live webhook destinations, and the existing production Healthchecks monitor. Keep all new-operation flags and general email off. This permits reconciliation of existing instructions; it is a different permission from opening customer payments. Recheck the queues immediately before activation.

The first healthy signal must follow an actual scheduled worker run, a committed `succeeded` record with `failed=0`, and a fresh healthy aggregate. Observe more than one scheduled tick and verify the provider received the worker's ping. Keep the validation check paused. New alerts must be ordinary operational alerts, not another test cycle.

The branded apex currently points to `dpl_BAvLvXZNzEhRBgm9tAJNf4KFBgB5` and has its own public-access exception. Canonical Preview is `dpl_47cB9DM89ubLxoeAGdEAVexZm2p7`; older project production aliases still point to `dpl_B4bCCxXTQT3EECVXJT6CF2cC6YUz`. A later promotion must explicitly reconcile these aliases and verify Preview stays protected. The August build is not a compatible recovery fallback once live instructions exist.

Provider references: [Vercel cron management](https://vercel.com/docs/schedules/cron-jobs/manage-cron-jobs), [Vercel cron configuration](https://vercel.com/docs/schedules/cron-jobs). Deployment/build and activation evidence belongs in the accompanying pull request.
