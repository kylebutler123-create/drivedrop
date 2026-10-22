# Production payment rollout plan — 21 October 2026

**Later implementation and native-test checkpoint:** [Production-safe code and proposed schema](production-payment-implementation.md) are prepared on `feature/ui-polish`. The [native PostgreSQL 17.11 rehearsal](production-payment-native-checkpoint.md) passed at `b3a4c52`, including schema/audit checks, real connection/lease contention and pending booking recovery through the production dispatcher. Genuine Stripe insufficient-balance, browser/ownership, hosted scheduling, delivery and cutover gates remain open. No hosted migration or production activation has occurred. This document's original review remains historical evidence.

**Status: prepared for implementation review; no production change or launch is authorized by this document.** The approved read-only [comparison](production-readiness-comparison.md) is complete. The next work is to prepare and test the production-safe schema and application changes on `feature/ui-polish`, keeping hosted production unchanged and preview refunds off between separately bounded tests.

This plan uses the approved UK/GBP separate-charges-and-transfers design, Express connected accounts and application negative-balance liability. It retains manual administrator release after delivery/customer-confirmation/dispute-window checks. It does not propose changing liability, payout permissions or the charge pattern to force a sandbox failure.

## Release boundaries and evidence

| Boundary | Required result |
| --- | --- |
| Existing preview/shared project `yozbuuvebzxitoqrvyer` | All original data, credentials, files, retained £110 case and immutable simulated QA21 ALT evidence preserved |
| Prepared production project `srqhjgrhgyyfdaxckjum` | Start from its verified empty 19 October baseline; no synthetic accounts, sessions, financial history, Stripe IDs or files copied from preview |
| Branch / application baseline | Prepare against reviewed `feature/ui-polish` source; comparison baseline `e8c568280a2685259497edc9989fd470f693a465` |
| Existing public production | Keep deployment `dpl_B4bCCxXTQT3EECVXJT6CF2cC6YUz` and its three aliases unchanged until an exact cutover is approved |
| Stripe support dependency | Genuine insufficient-balance reversal failure/retry remains UNVERIFIED; obtain human/provider guidance or an explicitly reviewed disposition |
| Live operations | No live charge, transfer, refund, reversal or alternative payment is part of this planning pass |

If real content must be imported into the empty project, identify and approve the exact records separately. Do not copy the shared preview database wholesale or reuse sandbox accounts as live accounts. Bootstrap the real administrator securely only after the intended production identity and access method are established; no password or session belongs in Git or chat.

## 1. Prepare the additive database change

Build a reviewed, schema-only delta against the actual initialized production catalog. Use the [comparison evidence](evidence/production-readiness-comparison.json) and the four source migration hashes, not a blind replay of the incomplete historical Prisma migration chain.

1. Check the expected production baseline before writing: 27 application tables, no new payment tables, the approved 5,000p cancellation-fee default, no existing application rows, and the known migration history. Stop on unexplained drift instead of dropping or rebuilding objects.
2. Add the four payment/audit tables, two `PayoutStatus` values and their final constraints/indexes. Respect PostgreSQL's transaction rules for newly added enum values. Carry forward the final `StripeRefund` success constraint after both the late-failure and alternative-refund changes.
3. Preserve all four cross-table alternative-refund triggers, immutable evidence rules, reservations, uniqueness and reconciliation fields. Confirm no path can record both a successful Stripe refund and an incompatible alternative repayment.
4. Design production environment values together with the application mode contract below. All four source tables currently allow only `preview`/`development`; do not silently remove their checks. Preserve strict preview behavior and reject environment/account mismatches in the application.
5. Enable RLS and explicitly revoke PUBLIC/anon/authenticated table and function rights in the reviewed change. Verify effective permissions because existing default ACLs can grant rights to new objects. Keep fixed search paths and security-invoker functions. Do not import preview's legacy grants.
6. Preserve the production cancellation-fee default of 5,000p, existing 98 constraints/indexes, and all five matching bucket configurations. Alternative-refund evidence currently needs no new bucket.
7. Rehearse from the prepared baseline on an isolated PostgreSQL 17.11 database with synthetic fixtures. Verify expected schema, negative constraints, immutable audits, privileges and safe handling of a repeat/precondition mismatch. Creating paid hosted infrastructure requires a separate concrete decision; it is not part of this plan's execution.

The deliverable is an additive migration with preflight/postflight SELECTs, exact source hashes, rollback limitations and a rehearsal result. Do not run `npm run db:push`, blindly run `prisma migrate deploy`, or apply `scripts/sql/production-schema-baseline.sql` to either initialized hosted project. Record the eventual applied Supabase migration version/name explicitly.

## 2. Implement a strict environment mode contract

| Concern | Preview / development | Production |
| --- | --- | --- |
| API credentials | Retain the approved test-key behavior and sandbox account checks | Require separately provisioned restricted live keys and verified expected live platform identity |
| Canonical Stripe objects | Require `livemode=false`, ownership, GBP, amounts and environment metadata | Require `livemode=true` plus equivalent ownership, currency, amount, environment and account checks |
| Missing configuration | Preserve existing documented nonproduction behavior | Fail closed; never fall back to TEST finance or use a sandbox key/account |
| Webhooks | Keep existing sandbox endpoints/secrets/events | Separate production endpoint URLs and signing secrets for the reviewed platform, connected-account and V2 thin-event handlers |
| Money creation | Existing bounded preview controls, refunds normally off | Explicitly gated new authorisations, transfers and refunds; initially disabled |
| Reconciliation | Continue canonical safety handling for existing instructions | Keep canonical webhooks/recovery available when new money operations are paused |

Review the providers, policies, database constraints and routes together. The code touchpoints include `booking-authorisation-provider.ts`, `booking-authorisation.ts`, `stripe-connect-provider.ts`, `stripe-connect-accounts.ts`, `stripe-payout-policy.ts`, `stripe-connect-events.ts`, `stripe-refunds.ts`, the alternative-refund modules, administrator payout/refund routes and their webhook routes. Production administrator routes currently reject TEST finance at their top level; add a legitimate, authorized Stripe production path while retaining that TEST denial.

Retain hosted Express onboarding and canonical Accounts V2 readiness checks, including the recipient Stripe-transfer capability. Confirm live account country/currency/capabilities with Stripe before enabling transfers; sandbox readiness does not certify a live account. Preserve manual capture, stable idempotency keys, durable work/reservations, safe retry windows, duplicate/stale-event handling, late-failure accounting, dispute holds and private immutable repayment evidence.

Keep the installed Stripe SDK/API versions as the starting point. A dependency/API upgrade is a separate reviewed change, not a side effect of enabling production. Verify both preview and production mode matrices without issuing live money requests.

Design the operational pause controls explicitly. Disabling creation must not strand an existing authorisation, refund, reversal or payout by also disabling its canonical reconciliation. The current enable flags are not a complete production incident-control design. Do not claim new pause switches exist until they are implemented and tested.

## 3. Prepare scoped configuration without copying secrets

| Setting / dependency | Required production preparation |
| --- | --- |
| `POSTGRES_PRISMA_URL` | Production-only connection to the prepared project; retain the existing preview value and scope |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Production-only values for the same prepared project; retain preview/development values and private server-side use |
| `STRIPE_SECRET_KEY`, `STRIPE_CONNECT_SECRET_KEY` | Separate live restricted keys with the minimum reviewed endpoint permissions; verify account/mode without displaying keys |
| Expected Stripe platform identity | Explicit verified production account configuration in the implementation; retain sandbox pin for preview |
| `STRIPE_WEBHOOK_SECRET` | Separate production platform webhook signature secret and reviewed Checkout/refund/transfer/dispute subscriptions |
| `STRIPE_CONNECT_WEBHOOK_SECRET`, `STRIPE_CONNECT_EVENTS_SECRET` | Separate connected-account snapshot and V2 thin-event signature secrets/subscriptions |
| `STRIPE_CHECKOUT_ORIGIN`, `NEXT_PUBLIC_APP_URL` | Verified intended production origin and redirect/link behavior; no preview or ephemeral deployment URL in customer messages |
| `CRON_SECRET` | Separate production secret for authenticated dispatch; never copy the preview poll command or Vault secret |
| `STRIPE_CONNECT_ENABLED`, `STRIPE_REFUNDS_ENABLED` and new-operation controls | Off initially; evaluate alongside independent reconciliation requirements |
| `RESEND_API_KEY`, sender/domain | Production-scoped credential and verified `account@contact.drive-drop.com` sender, with explicit production email behavior |

Record names, scopes, change timestamps and verification outcomes only. Use secure provider input, never chat, a commit, screenshots of revealed keys or an environment export. The current 29 metadata entries are the preservation baseline. Do not change unrelated legacy variables or the existing `IDEAL_POSTCODES_API_KEY` configuration as part of this work.

Vercel applies environment changes to subsequent deployments. Prepare the scope changes and build sequence together; do not assume editing a variable modifies an existing deployment. Confirm the exact team/project and production domain before configuring external webhooks. [Vercel environment documentation](https://vercel.com/docs/environment-variables).

## 4. Build production recovery and operational visibility

Introduce separate production run/lease state without renaming, reusing or interrupting `drivedrop_preview_ops`. Preserve the current durable-claim, bounded-work and stale-lease protections. The production worker must cover authorisations, transfers, refunds and transfer recovery, not just the plain authorisation endpoint. Authenticate dispatch and keep secrets out of logs and the database's public/client interfaces.

Choose **one** production scheduler after confirming the available plan and timing requirement. Vercel team billing details were not exposed in this review, so eligibility for an every-minute Vercel schedule is unverified. An isolated database scheduler is an alternative only if deliberately selected and configured; do not clone preview extensions, cron commands, URLs or Vault values wholesale. Keep the existing daily jobs' behavior under review too, including the quote-expiry route's current read-only counting behavior.

An HTTP 202 or successful dispatch is not proof that work completed. Record durable completion and check backlog age, expired leases, failed/stale workers, REVIEW cases, refund/transfer reservations, canonical webhook failures and late-failure holds. Select an actual operator and alert destination before activation. Publishing alerts or contacting a recipient requires the authorized destination; no message is sent by this plan.

Scheduled requests can be duplicated or missed, and failed Vercel cron invocations are not automatically retried. Keep idempotency, locks and later reconciliation regardless of the selected scheduler. Test a real pending synthetic instruction reaching completion, not only idle scans. [Vercel cron behavior](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

## 5. Enable and verify transactional email deliberately

`src/lib/email.ts` currently returns false for production. Adding a Resend key alone is insufficient. Add an explicit reviewed production enable path with a verified sender and fixed production app origin; hold email sending off during schema/configuration rehearsal.

Verify booking confirmation once per intended recipient, quote/booking lifecycle links, cancellation/refund/dispute notices, transporter/administrator notifications and scheduled summaries where implemented. Check provider acceptance and actual delivery to named, authorized test recipients, including failure/retry handling. Do not equate an in-app notice, a claim timestamp or a best-effort API attempt with delivered email. Decide whether a durable delivery/outbox mechanism is required before promising guaranteed delivery. No test email is authorized to an unspecified recipient.

## 6. Acceptance matrix for the reviewed implementation

| Area | Required evidence before cutover |
| --- | --- |
| Schema / database | Rehearsed additive delta, unchanged approved defaults, final constraints/triggers, no client rights, expected production schema and no preview mutation |
| Environment separation | Production rejects test keys/accounts/events and missing configuration; preview rejects live objects; production TEST simulation remains denied |
| Customer journey | Actual quote selection, Checkout authorisation/3DS/decline handling, confirmation, cancellations and clear pending/failure states |
| Transporter journey | Hosted onboarding/readiness, job acceptance/capture, collection and delivery evidence, customer confirmation and timing/dispute gates |
| Administrator journey | Real role checks, held/releasable payout UI, manual release, duplicate/stale submit protection, reconciliation and immutable audit visibility |
| Refund / recovery | Relevant before/after-transfer partial/full refund cases, lost responses, late failures and dispute holds pass for changed code; genuine insufficient-balance gate remains separately labelled until supported evidence/disposition exists |
| Alternative repayment | Two-step authorized recording, independent settlement evidence, accounting once, private download/ownership checks and immutable history; simulated evidence remains labelled simulated |
| Scheduler | Authenticated dispatch, durable completion of pending work, lease/concurrency behavior, missed/duplicate dispatch recovery, monitored failure without duplicate money or notices |
| Files and ownership | Valid uploads/downloads through all five bucket flows; wrong-user and unauthenticated denials for private files/evidence, intentional public profile access only, MIME/size rules |
| Email | Authorized recipients receive expected messages once with correct production links; failure behavior is observable |
| Release / rollback | Exact reviewed commit and lockfile build, production-target environment proof, compatible fallback using the production database, paused-creation/reconciliation drill |

Use complete browser journeys for behavior being certified; database shortcuts do not certify the customer/transporter/administrator workflow. Reuse historical sandbox results only where the implementation is unchanged, and identify each result's actual limits. Run meaningful regression tests for changed financial and authorization behavior, then the build; do not expand testing merely to repeat settled evidence.

Use separate disposable fixtures and pre-agreed amounts for any new sandbox financial verification. Keep original preview data and the £110 failed fixture untouched; the prior approval did not authorize settling that original case. Do not delete or reuse the immutable QA21 ALT audit. After each bounded test, verify refunds are off and record preservation evidence. A real support response may change the supported insufficiency-test method; do not repeat the successful zero-balance experiment or change liability to force an error.

## 7. Prepare an exact cutover for approval

Only after implementation and acceptance evidence are reviewable, present the exact commit, migration, production settings/scopes, domains, scheduler and unresolved limitations for approval. Include any specifically bounded live transaction separately. This document does not authorize a main merge, production deployment, live key creation or live funds movement.

The eventual sequence should be:

1. Capture fresh schema/data/file/configuration recovery evidence and the current deployment/alias mapping. The dated 18 October database and 19 October storage restores were verified historically; they are not a current consistent pre-cutover snapshot. Preserve source preview and production recovery access.
2. Apply only the reviewed additive change to `srqhjgrhgyyfdaxckjum`, verify it, and securely bootstrap the real administrator. Keep new money operations and outbound email disabled. No bulk preview-data import.
3. Scope production credentials without altering preview values, then create a production-target candidate without automatically moving production domains. Verify the actual candidate's environment, database, storage, webhook signatures and recovery configuration. A Preview build is not proof of Production behavior. [Vercel staged production promotion](https://vercel.com/docs/deployments/promoting-a-deployment).
4. Complete approved non-money checks and resolve release gates. Promote only the approved candidate to the exact approved production aliases, with the compatible fallback and incident controls ready. Recheck preview aliases and data separately.
5. Enable reviewed customer/admin money operations and email in the agreed order after canonical webhooks and recovery are working. Verify any approved bounded live operation with canonical provider evidence and its audit trail. No live transaction should be improvised to make a deployment appear tested.
6. Observe completion, backlog, delivery and errors during the agreed launch window; record actual deployment, migration, flag states and operator handover. Keep the unresolved provider limitation explicit if a reviewed disposition permits launch.

## 8. Rollback without losing financial history

The current August production build is **not a safe automatic fallback after live activity**: it predates these flows and its configuration predates the prepared production database. A compatible fallback must use the intended production database and safely process or reconcile already-created financial instructions. Do not reconnect traffic to the old shared preview database after taking live bookings.

For an incident, pause new operations using the reviewed controls while retaining canonical webhooks and recovery for existing work. Preserve all tables, evidence, files, reservations and Stripe identifiers. Use a reviewed compatible deployment or a forward fix. Do not drop the additive tables, restore an old database over new financial history, delete unresolved instructions, or automatically reverse/refund live money as a deployment rollback.

Verify the fallback's environment and scheduler definitions. Vercel rollback restores deployment cron definitions but does not reverse database or Stripe effects; environment edits are not a substitute for verifying the fallback artifact. Account for in-flight workers and duplicate dispatch before a scheduler change. Record unresolved cases for reconciliation rather than treating rollback as settlement.

## Completion of this planning step

The database comparison, preservation checks and this implementation/cutover plan are saved. No hosted schema, environment, permission, account setting, application source or production deployment changed. Preview refunds remain off. The next deliverable is the **tested production-safe schema and code change**, with the exact remaining provider and operational gates attached; production activation remains a later concrete approval.
