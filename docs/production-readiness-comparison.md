# Preview and prepared production comparison — 21 October 2026

**Later implementation and native-test checkpoint:** [Production-safe code and proposed schema](production-payment-implementation.md) are prepared on `feature/ui-polish`. The [native PostgreSQL 17.11 rehearsal](production-payment-native-checkpoint.md) passed at `b3a4c52`, including schema/audit checks, real connection/lease contention and pending booking recovery through the production dispatcher. Genuine Stripe insufficient-balance, browser/ownership, hosted scheduling, delivery and cutover gates remain open. No hosted migration or production activation has occurred. This document's original review remains historical evidence.

**The read-only comparison is complete. Prepared production needs the later Connect, refund and alternative-repayment schema, plus production-specific application work before cutover. Nothing was migrated or activated.** The next implementation is described in the [production payment rollout plan](production-payment-rollout-plan.md).

Source: `feature/ui-polish` at `e8c568280a2685259497edc9989fd470f693a465`. Catalog reads began at **19:57 BST / 18:57 UTC**. Preservation checks finished at **20:09 BST / 19:09 UTC**. [Machine-readable evidence](evidence/production-readiness-comparison.json) contains catalog snapshots, migration histories, exact differences, metadata and aggregate fingerprints; it contains no credentials, application rows, session tokens or file contents.

## Compared environments

| Item | Preview / existing shared project | Prepared production |
| --- | --- | --- |
| Supabase project | `yozbuuvebzxitoqrvyer` | `srqhjgrhgyyfdaxckjum` |
| State / region | ACTIVE_HEALTHY / eu-central-1 | ACTIVE_HEALTHY / eu-central-1 |
| Hosted database version | 17.6.1.165 (SQL reports PostgreSQL 17.6) | 17.11.0.003 (SQL reports PostgreSQL 17.11) |
| Public application tables | 31 | 27 |
| Columns | 377 | 276 |
| Enum types | 15 | 15 |
| Catalog constraints | 140 | 98 |
| Indexes | 121 | 98 |
| Application trigger functions / triggers | 4 / 4 | 0 / 0 |
| Storage buckets | 5 | 5 |
| Application users / bookings | 19 / 54 | 0 / 0 |
| Supabase Auth users / stored-file rows | 0 / 136 | 0 / 0 |

The empty prepared production project remains separate from the existing production website. Environment-variable metadata still shows shared production/preview scopes for the Prisma connection and shared production/preview/development scopes for the storage URL/service key. No secret value was decrypted to re-read its destination. The 19 October record that the website had not been switched is consistent with this metadata; no cutover was performed here.

The databases run different PostgreSQL patch versions. Rehearse the eventual delta on 17.11 and review [Supabase's 17.11 compatibility notes](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes). Neither inspected project has the `ltree` or `btree_gist` extension; that observation is not a complete compatibility audit. No database upgrade was requested or performed.

## Exact application-schema gap

| Missing production table | Columns | Purpose |
| --- | ---: | --- |
| `StripeConnectAccount` | 17 | Connected-account ownership and canonical readiness |
| `StripePayout` | 24 | Durable transporter transfer instructions and reconciliation |
| `StripeRefund` | 41 | Customer refunds, late failures and separate transfer recovery |
| `AlternativeRefund` | 19 | Immutable, independently evidenced alternative-repayment audit |

All 101 missing columns belong to these four tables. There are no missing columns on the 27 existing production tables. `PayoutStatus` needs `PROCESSING` and `FAILED`; the other 14 enum types match. The delta also includes **42 catalog constraint entries, 23 indexes, four trigger functions and four triggers**. The constraint count includes the alternative-refund completion constraint trigger's catalog entry, so it is not a count of 42 ordinary `ADD CONSTRAINT` statements.

All 98 existing constraints and 98 existing indexes match. No unvalidated constraints or invalid indexes were observed. RLS properties match for every existing table.

**Do not make production identical to preview indiscriminately.** Of the 276 shared columns, 275 match exactly. The intentional exception is `TransporterCancellationFee.amountPence`: preview's historical default is 2,500p; prepared production correctly defaults to **5,000p (£50)**. The application explicitly inserts 5,000p. Preserve both environments' current data and the approved production default.

| Repository migration directory | Applied preview Supabase version / name |
| --- | --- |
| `20261019213129_stripe_connect_sandbox` | `20261019213232 stripe_connect_sandbox` |
| `20261020193911_stripe_refund_sandbox` | `20261020193911 stripe_refund_sandbox` |
| `20261020220726_stripe_refund_late_failure` | `20261020220749 stripe_refund_late_failure` |
| `20261021125850_alternative_refund` | `20261021131534 alternative_refund` |

Prepared production has only `20261019020729 drivedrop_production_schema_and_storage_baseline`. Preview has 42 migration-history entries, including private recovery infrastructure. Neither database has `public._prisma_migrations`. Repository migration timestamps differ from some applied Supabase versions; compare definitions and the recorded file hashes instead of treating names as proof of identical execution.

The four new tables currently constrain `environment` to `preview` or `development`. They are not ready for production records as written. A reviewed additive delta must preserve their final refund-success constraint and all four alternative-refund audit triggers while introducing a deliberate production mode contract. Do not run `db:push`, blindly replay the historical Prisma chain, or rerun the empty-database bootstrap against either initialized project.

## Access and storage

All 31 preview and 27 production application tables have RLS enabled. There are no public/storage RLS policies. Production has **zero effective table privileges for `anon` and `authenticated`**. Preview has 272 effective privilege entries across 17 legacy tables; do not copy those grants into production. These grants alone are not an application access test or evidence that rows are publicly readable.

Both projects retain role default privileges that can grant client access to newly created public objects. The delta must explicitly enable RLS and revoke `PUBLIC`, `anon` and `authenticated` rights on its tables and functions, with checks before it is considered complete. The four preview audit functions are security-invoker functions with fixed `pg_catalog, public` search paths and no PUBLIC/anon/authenticated EXECUTE privilege.

The Supabase security advisor returned only informational `rls_enabled_no_policy` findings: 32 preview tables including the private operations table, and 27 production tables. No warning/error findings were returned. These server-only tables intentionally rely on server authorization; do not add client policies merely to suppress the informational notices. This advisor result does not replace application-role testing.

| Bucket | Public | Maximum bytes | Allowed MIME types |
| --- | --- | ---: | --- |
| `delivery-evidence` | No | 8,388,608 | image/jpeg, image/png, image/webp |
| `message-attachments` | No | 8,388,608 | image/jpeg, image/png, image/webp |
| `transporter-profiles` | Yes | 2,097,152 | image/jpeg, image/png, image/webp |
| `transporter-verification` | No | 20,971,520 | application/pdf, image/jpeg, image/png |
| `vehicle-photos` | No | 900,000 | image/jpeg, image/png, image/webp |

All five bucket configurations match exactly. Alternative-repayment evidence is stored privately in `AlternativeRefund.evidenceBytes`, limited to 3 MiB; the current implementation does not need another bucket. Matching configurations do not prove production application uploads, signed downloads or ownership checks. The prepared production project still has no stored files.

## Recovery scheduling

Preview alone has `drivedrop_preview_ops`, `http` and `pg_cron`. Its active `drivedrop-preview-booking-authorisations` job runs every minute. At **20:00 BST / 19:00 UTC**, the last five dispatches and durable workers had succeeded with zero checked/failed items. These were **idle scans**, not fresh financial recovery tests. The operations table has RLS and no anon/authenticated SELECT access; its poll function has no anon/authenticated EXECUTE access. Only metadata and function/command hashes were read, not secret-bearing command bodies or Vault values.

Production has none of this private infrastructure. `claimPreviewRecoveryRun` explicitly rejects production, and both recovery functions use the preview operations table. The dispatched worker reconciles authorisations, transfers and refunds; calling the plain booking-authorisation cron route without dispatch only reconciles authorisations. Adding that plain route to a schedule would therefore be incomplete.

`vercel.json` currently defines daily job-summary, quote-expiry and insurance-notification schedules, but no payment-recovery schedule. The Vercel team response did not expose a billing plan, so minute-level Vercel Cron eligibility is **unverified**. The plan must choose one authenticated production scheduler and verify its actual durable work, preserving the existing preview scheduler and secrets.

## Application and configuration gaps

| Area | Current source / configuration | Required before live use |
| --- | --- | --- |
| Checkout authorisation | Production rejected; test keys and `livemode=false` required; nonproduction TEST fallback exists | Explicit production provider mode, fail-closed live keys/account/origin validation; retain production TEST denial |
| Connect and transfers | Nonproduction-only flag, restricted test key, sandbox account `acct_1US4BzLAzgkvCvrI` pinned | Separate verified live platform identity, restricted live key and canonical live-object/readiness checks |
| Refunds and alternative repayments | Sandbox-only checks in policies, webhook processing, table constraints and administrator routes | Reviewed production branch across all layers; immutable evidence and idempotency retained |
| Recovery | Preview-specific lease, operations table, dispatch and scheduler | Isolated production run state, full reconciliation, monitoring and an authenticated scheduler |
| Transactional email | `src/lib/email.ts` disables production; `RESEND_API_KEY` metadata is preview-only | Explicit production email behavior, verified sender/origin, scoped credential and actual delivery checks |
| Database / files | Runtime uses `POSTGRES_PRISMA_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`; metadata still has shared scopes | Production-only credentials for the prepared project, retaining existing preview/development values |

Vercel returned 29 environment metadata entries. All ten Stripe/payment-recovery entries, including `CRON_SECRET`, are scoped to Preview / `feature/ui-polish`. No production Stripe, `CRON_SECRET` or Resend entry was returned; no `NEXT_PUBLIC_APP_URL` entry was returned. `STRIPE_SANDBOX_PENDING_KEY` is an unused stored copy, not an application dependency. No credential was displayed, copied, rotated or edited.

The only value read was the known **plain**, nonsecret flag `STRIPE_REFUNDS_ENABLED=false`; its scope and update timestamp `1792547509076` are unchanged. A stale descriptive comment on that environment entry is not the current QA result. See the dated application evidence instead.

The current email sender is `DriveDrop <account@contact.drive-drop.com>`. Its provider verification and production delivery were not inspected. The booking notification claim prevents duplicate attempts, but a best-effort email attempt is not proof of delivery. No email was sent during this review.

At the inspected commit, the preview was READY on `dpl_3ygEpxqXfPW7WrGPt3BjbQD4DLCJ`, with only the feature-branch alias. Production remains READY on **`dpl_B4bCCxXTQT3EECVXJT6CF2cC6YUz`**, commit **`8b87d8c66bd9fcca3f7f4716366cd6ea9b86485c`**, with its three original aliases. This documentation commit may create an ordinary feature preview; it does not promote, merge or deploy production.

## Preservation and limits

Before/after server-side aggregate fingerprints match for **all 31 preview application tables plus `storage.objects` (32 tables, 1,324 rows)** and **all 27 production application tables plus `storage.objects` (28 tables, zero rows)**. No application rows or file bytes were exported. The active preview session is included in this review's unchanged fingerprints; the earlier review's session change remains documented separately. This is a comparison within this review, not a new claim that every historical checkpoint had identical sessions.

The ongoing scheduler's private run log is intentionally excluded from application-data fingerprints because it continues recording scheduled work. No rows were inserted, changed or removed by this review. All 29 environment metadata entries match before/after, the refund flag remains false, and the production deployment, commit and aliases match before/after. Original preview records, the retained £110 failed-refund case and the immutable simulated QA21 ALT audit are preserved.

The remaining genuine insufficient-balance reversal failure/retry test is still **UNVERIFIED**. The last recorded [Stripe Support contact](stripe-support-recovery-question.md) requested a human specialist; support was not rechecked in this database review. Do not treat the AI reply, local mock or previous zero-balance success as provider confirmation.

This pass did not perform new browser/payment/email tests, execute migrations, bootstrap users, change settings, inspect live Stripe credentials or move production traffic. Historical recovery snapshots from 18–19 October are not a fresh pre-cutover backup. The [rollout plan](production-payment-rollout-plan.md) records the outstanding implementation and acceptance work.
