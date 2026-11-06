# DriveDrop live-booking activation plan — 6 November 2026

Status: two protected Production candidates built and checked on 6 November 2026; neither promoted. Public Production and canonical Preview remain unchanged. Release acceptance is incomplete. No live financial account, payment, transfer or refund was created.

## Verified baseline

- Canonical origin: https://drive-drop.com.
- Vercel project: `prj_8BO4s7P2sffGKR4czg6nHOZqg4Ze`; team: `team_HR29ivw10fPMfg8JK98snQj5`.
- Current Production: `dpl_6PkTy3XLvpbofCZczZAoBNV15G7A`, READY, source `ec86e86cef9d8cc606f70fc91ba6f46c538b6e41`.
- Source for proposed builds: `232a0d14a72ed02a2806947bf5aab75f14c6a924` on `feature/ui-polish`. GitHub comparison with the deployed commit shows one merge commit and zero changed files.
- Production database: `srqhjgrhgyyfdaxckjum`. At 01:50:06 UTC, production authorisation, transfer, refund and connected-account counts were each zero.
- Five latest worker runs, 01:45–01:49 UTC, were `succeeded`, each with checked=0 and failed=0. This confirms scheduled empty-queue execution, not live financial processing.
- Canonical Preview remains on `dpl_47cB9DM89ubLxoeAGdEAVexZm2p7`. Keep its variables, database, aliases and access protection unchanged.
- Existing Production credentials, webhook signing secrets, origins and private monitor endpoint stay in their current secure provider storage.

The [activation evidence in PR5](https://github.com/kylebutler123-create/drivedrop/pull/5) supersedes the historical pre-activation status in earlier planning documents.

## Exact Production configuration

All boolean entries below are literal strings `true` or `false`. The pause/support and Stage 1 columns were captured in the new staged builds. The Current column describes the unchanged live recovery-only deployment, not the latest project defaults.

| Setting | Current | Pause/support build | Stage 1: onboarding/support | Stage 2: bookings |
| --- | --- | --- | --- | --- |
| STRIPE_PAYMENTS_ENABLED | true | true | true | true |
| DRIVEDROP_PAYMENT_HEALTHCHECK_ENABLED | true | true | true | true |
| STRIPE_CHECKOUT_ENABLED | false | false | false | true |
| STRIPE_CONNECT_ENABLED | false | false | true | true |
| STRIPE_REFUNDS_ENABLED | false | false | true | true |
| STRIPE_ALTERNATIVE_REFUNDS_ENABLED | false | false | false | false |
| DISPUTES_ENABLED | false | true | true | true |
| TRANSACTIONAL_EMAILS_ENABLED | absent; effectively false | true | true | true |
| TRANSACTIONAL_EMAILS_SENDER_VERIFIED | true | true | true | true |
| DRIVEDROP_CONTACT_EMAIL_TEST | configured, time bounded | empty; disabled | empty; disabled | empty; disabled |

Retain `NEXT_PUBLIC_APP_URL` and `STRIPE_CHECKOUT_ORIGIN` as `https://drive-drop.com`, the live platform ID `acct_1US4BsLo6y2NJoQw`, all existing Production secrets and the four current schedules. No schema migration, dependency change or application-code change is proposed.

The sender-verification flag is an operator attestation. It does not itself verify DNS or delivery. The completed controlled email checks remain the evidence for authentication and receipt.

### Meaning of the switches

- Connect enables both new transporter Stripe setup and new admin payout instructions. It is not an onboarding-only switch.
- New Stripe refunds require both Connect and refunds enabled. Eligible refunds should be available when bookings open.
- Payouts still require an explicit admin action and server eligibility checks. Enabling Connect does not automatically release booking proceeds.
- The normal 24-hour review period starts at customer confirmation of receipt. An open qualifying dispute keeps the payout held. New booking refunds stop once transporter payout starts; already-issued instructions continue to reconcile.
- The Checkout switch is global for eligible Production users. A first-booking observation plan is not an allowlist or a one-booking limit. A restricted pilot would require a separately reviewed access control.
- Normal email activation also enables the ordinary contact form and existing triggered/digest messages to their configured recipients. It is not a single-recipient test. Inspect current digest eligibility and user preferences before promotion; synthetic test users must not receive operational mail.
- Email delivery is best effort in the current implementation. The contact form uses a fixed support recipient. General notifications do not have a durable retry outbox.

## Stage 0 — stage the fallback and record the release package

1. Recheck the exact source, Production aliases, current flags and queue counts immediately before staging. Stop on unexplained changes.
2. Capture a fresh consistent Production recovery package and verify its manifest and availability. Preserve the existing 5 November backup; its filename alone is not proof of current recoverability. Do not restore older data over later financial history.
3. Stage a Production-target build from the pinned source using the pause/support column, with automatic public-domain assignment disabled. Keep its deployment URL protected.
4. Verify its production database/storage identity, administrator access, dispute filing/read paths, contact availability, blocked new money operations, webhook signature enforcement and recovery configuration. Use existing accepted role/upload evidence where the code and configuration match; do not repeat completed financial QA or send unapproved emails.
5. Record its immutable deployment ID and URL as the compatible pause candidate. Its source and data schema must match the activation candidates. Confirm retaining it will not add a second active scheduler.
6. Prepare the Stage 1 candidate with the exact same source and the Stage 1 column, still without assigning public domains. Record its immutable deployment ID and validation results.

A staged production build may contain active capabilities even before promotion. Keep it protected, do not perform onboarding/payment/email actions during preparation, and verify the single current scheduler remains on the current Production deployment. Do not call a candidate tested merely because its build is READY.

The candidates below have now been created. A fresh recovery package and the remaining acceptance items must be completed before requesting activation. No promotion is authorised by this staging work.

## Staging evidence — 6 November 2026

Both builds use source `232a0d14a72ed02a2806947bf5aab75f14c6a924`, target Production, and the exact respective configuration columns above. Vercel shows them as staged with custom-domain assignment skipped; authentication protection remains enabled for deployment URLs.

| Candidate | Immutable deployment | Status |
| --- | --- | --- |
| Pause/support | [dpl_9Xcgq9KcPi5pyA4S3gYwUVYdRZHJ](https://vercel.com/future-9f39/drivedrop/9Xcgq9KcPi5pyA4S3gYwUVYdRZHJ) — https://drivedrop-lmgzpy0fq-future-9f39.vercel.app | READY |
| Stage 1 onboarding/support | [dpl_92CyExarmSj7ompfZAihWKWMLSRR](https://vercel.com/future-9f39/drivedrop/92CyExarmSj7ompfZAihWKWMLSRR) — https://drivedrop-m84z0drj7-future-9f39.vercel.app | READY; 61-second build |

Project Production defaults were restored after build capture: Connect, refunds, disputes and normal transactional emails are all explicitly false; Checkout and alternative refunds remain false; master payments, sender verification and the recovery monitor remain true. `DRIVEDROP_CONTACT_EMAIL_TEST` was cleared to an empty encrypted configuration, disabling the completed test. It was not deleted. Existing deployment snapshots are immutable, so this restoration does not alter either candidate or the public deployment. Other environment values/targets and all Preview values were compared with the pre-staging baseline and remained unchanged. Secrets were neither decrypted nor printed.

### Checks actually completed

At 02:12 UTC, both candidate hosts returned:

| Read-only check | Result | Evidence limit |
| --- | --- | --- |
| `GET /api/health` | HTTP 200, `ok:true`, version `232a0d14a72e` | Database connectivity and expected source |
| `GET /api/availability/authorise` | HTTP 200, `provider:STRIPE`, `testMode:false` | Production configuration guard passed; does not exercise Checkout creation or Stripe key permissions |
| `GET /api/disputes` | HTTP 403, customer/transporter login required | Dispute feature is on and authentication is enforced; filing was not performed |
| `GET /api/admin/disputes` | HTTP 403, admin access required | Unauthenticated access denied; signed-in admin workflow not repeated |
| `GET /api/account/stripe-connect` | HTTP 403, transporter access required | Unauthenticated access denied; no account or onboarding link created |
| `GET /api/cron/booking-authorisations?health=1`, without cron credentials | HTTP 403, forbidden | Worker endpoint remains protected; no manual dispatch or heartbeat sent |
| `GET /contact` | HTTP 200; contact heading and form present | Page rendering only; no email submitted |

The candidate-scoped error/fatal runtime scans for 01:58:38–02:13:38 UTC returned no matching logs. Stage 1 build warnings concern npm's unknown `cache-dir` config and Prisma install-script allow-list notices; Prisma Client generation and the build both completed. No dependency policy or package version was changed.

Alias lookups after staging confirmed `drive-drop.com` and `drivedrop-pink.vercel.app` still resolve to `dpl_6PkTy3XLvpbofCZczZAoBNV15G7A`; canonical Preview still resolves to `dpl_47cB9DM89ubLxoeAGdEAVexZm2p7`. The branch domain displayed on a candidate dashboard is not evidence that the alias moved.

The existing four cron entries remain active with their original schedules. Request logs at 02:13–02:15 UTC show Production minute dispatches (HTTP 202) reaching `drivedrop-hbyytingb-future-9f39.vercel.app`; the existing separate Preview requests also remain. Neither staged candidate is receiving scheduled dispatches in the inspected period; their only worker requests were the deliberate unauthenticated HTTP 403 checks.

Production database evidence at 02:13:12 UTC: authorisations=0, payouts=0, refunds=0, connected accounts=0; application users=3 and storage objects=9. The five latest durable Production runs (02:09–02:13 UTC) all succeeded with checked=0 and failed=0, and the last ten minutes contained no non-success runs. This proves empty-queue worker completion, not financial processing.

Read-only digest inspection found zero eligible recipients even before insurance filtering, zero transport jobs and zero pending digest batches. The synthetic transporter has daily job emails disabled. Recheck eligibility at the actual release window.

### Acceptance limits and next work

- Fresh portable recovery package captured and verified on 6 November at 02:27:28 UTC; details below. The older 5 November pre-migration archive remains preserved. Recheck for material changes before actual activation; this is a dated recovery point, not continuous backup.
- Signed-in dispute/admin/Connect and blocked-new-operation behaviour on these immutable hosts has not been exercised. Prior accepted role/private-upload evidence and unchanged source remain useful but do not turn the unauthenticated checks above into a full workflow pass.
- New-operation gates are recorded from the pre-build configuration snapshots and reviewed source. No payment, payout, refund, account-creation or email-send action was performed to test them.
- No staged signed Stripe event was delivered. The existing live thin ping evidence remains limited to signature parsing/delivery. Platform and bank-payout signed snapshot paths remain unverified.
- Ordinary email delivery was not retested. The earlier authenticated delivery evidence and unresolved Hotmail Junk case remain unchanged.
- These candidates are available for the remaining acceptance work. READY status and the checks above do not authorise promotion or opening Checkout.

## Fresh recovery package — 6 November 2026

Private artifact: `DriveDrop-Production-backup-2026-11-06.zip`, 1,071,304 bytes, SHA-256 `9693e8abaf5482d0ed081bc21c53c0b1abeff0d1c0e24ab6fb79c83bbeae75b2`. Saved privately outside Git; the archive contains user information, password/session hashes and uploaded files and must not be committed here.

The single-statement database snapshot at 02:27:28 UTC includes 31 application tables plus the private recovery table, 383 columns, 145 constraints, 123 indexes, four functions and four triggers. It contains four application users (one new customer registered at 02:22 UTC), two sessions, four notifications, one transporter-verification record, four verification documents and 73 recovery-run records. Supabase Auth users/identities and all four financial/account queues remain empty. No account was created by this backup task.

All six bucket configurations and nine objects (including the zero-byte placeholder) are included, totalling 1,043,887 file bytes. Three public profile images were freshly downloaded. The private avatar and four synthetic PDFs use retained original upload bytes whose size and MD5 match current Production Storage metadata; no fresh private-file download is claimed. Every archived file has an independent SHA-256. Remote bucket/object metadata and all application table rows were unchanged at the 02:36:11 UTC recheck; only routine recovery-run history advanced.

Verification passed:
- An isolated in-memory PostgreSQL 17.5 restore from the PostgreSQL 17.11 source matched the captured application schema/data, bucket records, migration history and expanded/default grants.
- All 32 application/ops tables retained RLS and denied direct anonymous/authenticated access.
- The database script refused both an unspecified restore target and an occupied target; occupied-target refusal preserved the data.
- An isolated filesystem restoration recovered all nine files with matching SHA-256 readback and refused an existing destination.
- The final ZIP passed CRC and all member-checksum verification.

This is a portable application/data/file recovery check. No hosted project or Storage restore was performed, no credential was retrieved, and no live data was changed. Managed platform services, extension binaries, role passwords, Vercel configuration and external payment/email credentials require their existing secure recovery arrangements. Storage object metadata is archived as evidence; the SQL deliberately restores bucket configuration without inserting file metadata in place of uploading bytes through the supported API.

The Stage 1 admin page was opened for signed-in acceptance. It currently presents the normal DriveDrop login form; Kye must enter the existing admin password in that protected staged page. No session was copied from the backup and no account/session was fabricated. Stage 1 remains unpromoted, and Checkout remains false.

## Stage 1 — activate onboarding and support; Checkout remains off

After approval of the concrete Stage 1 candidate and its side effects:

1. Promote that exact tested Production build and map `drive-drop.com` and the existing Production alias to it. Verify the canonical Preview alias remains unchanged.
2. Confirm the deployed flags, all three active Stripe destinations, scheduler ownership, durable worker completion and monitor health.
3. Allow a genuine transporter to complete Stripe-hosted onboarding. The transporter supplies their real identity/bank information and completes required financial-account steps. Do not approve synthetic verification documents or convert the existing upload-test account into a real provider.
4. Verify canonical account ownership, UK/GBP configuration, transfer and payout capability readiness and requirements. Production currently has no connected accounts, so there is no live transporter ready yet.
5. Inspect actual account-status events and account-state synchronisation. The successful thin ping only proves delivery/signature parsing, not account reconciliation.
6. Review Resend's existing deliverability case. Record normal-mail activation explicitly and check actual receipt during authorised ordinary use. Do not repeat the exhausted Healthchecks test-email cycle.
7. Inspect actual restricted-key scope and platform readiness without printing or widening credentials. Resolve errors before opening Checkout; empty recovery scans and a thin ping do not prove all payment/Connect API permissions.

The email tests authenticated and delivered, but Hotmail placed the branded messages in Junk. The support ticket was acknowledged; no resolution is established in this plan. Record whether that known limitation is accepted for the intended opening or requires remediation first.

Stage 1 enables eligible admin payout/refund actions as well as onboarding. The recorded zero financial queues limit immediate exposure but must be rechecked at activation. No financial transaction is included in Stage 1's preparation or technical validation.

## Stage 2 — open genuine bookings

Stage 2 changes only `STRIPE_CHECKOUT_ENABLED` from false to true relative to the accepted Stage 1 configuration.

Before requesting activation:

- A genuine transporter is verified and canonically ready to receive transfers and payouts.
- Customer/admin access to the current dispute/refund policy is available.
- Normal email scope, actual delivery limitations and support handling are understood.
- The exact Stage 2 Production candidate is staged, protected and validated; the compatible pause build remains available.
- Kye, the existing operations owner, is available for the agreed observation period. Record an actual start time and operator coverage; this document does not schedule future monitoring or authorise third-party messages.
- The two unverified signed snapshot paths are explicitly recorded as launch uncertainty. Do not label them passed or silently waive them.
- Approval explicitly acknowledges that the Checkout switch opens payments to all eligible users. If Kye requires an enforced limited pilot, implement and review that restriction first.

Promote only the approved immutable candidate, reconcile Production aliases, verify deployed controls and preserve Preview. The intended validation is observation of genuine customer business, not a fabricated live charge or repeated sandbox QA. Payment and payout actions remain with the authorised customer/transporter/admin.

## Evidence to collect during ordinary first-booking operation

| Point in the real journey | Required evidence | Limit |
| --- | --- | --- |
| Customer authorises; transporter confirms | Correct booking/PaymentIntent linkage and canonical state; relevant signed platform event delivered successfully and matching state in DriveDrop | A 200 response with no matching booking is not business-processing evidence |
| Genuine account requirements/capabilities change | Signed account event delivered and canonical readiness recorded | The thin ping is not a substitute |
| Customer confirms receipt | Correct 24-hour deadline and hold; no unintended automatic release | Do not accelerate deadlines or create a fake dispute |
| Admin releases an eligible payment | One durable payout instruction, matching transfer and correct net proceeds/fines; platform delivery and reconciliation evidence | A transfer credits the Stripe connected balance, not proof of bank arrival |
| Stripe performs the bank payout | Signed connected-account payout event, matching account and canonical payout status in DriveDrop | Bank timing follows actual Stripe processing; not guaranteed within one session |

Check event account/mode, signature acceptance, production routing, object ownership, amount/currency and the resulting application record. Existing duplicate/stale-event safeguards remain; do not resend a financial event as an improvised test.

Observe the initial release for at least 30 minutes, then review the actual booking milestones through bank payout. Kye is the existing operations owner; arrange coverage rather than implying the assistant will watch after a turn ends. Keep the existing minute recovery and Healthchecks monitoring active. Stripe delivery failures and application/email failures also need review because a healthy empty worker does not cover them.

## Incident pause and recovery

Use the staged pause/support build, or a reviewed fix with the same controls, to block new Checkout, connected-account creation, payout and refund instructions while keeping:

- the payment master and canonical reconciliation;
- current database records, reservations and idempotency keys;
- all three webhook destinations and signing secrets;
- the single minute recovery schedule and its monitor;
- customer dispute filing, evidence access and support communications.

Today's recovery-only deployment is not the full post-launch fallback because its dispute and normal email switches are off. The old August application and Preview deployment are also unsuitable fallbacks.

An environment edit alone does not pause an immutable deployment. Promote the exact pause candidate, explicitly reconcile Production aliases, and verify its effective controls and current worker. Pause settings do not revoke already-issued Stripe Checkout sessions or cancel already-claimed instructions. Inventory in-flight authorisations and use their existing canonical release/cancellation workflow where required; never create a replacement instruction merely because a response was lost.

Pause and investigate on incorrect account/amount/currency, duplicate or unexplained financial instructions, unreconciled signed-event errors, unresolved REVIEW records, failed/stale recovery, or inability to file an eligible dispute. Existing worker thresholds are a recent success within five minutes, no stale active lease beyond four minutes, no REVIEW/old expired leases, and no pending work older than fifteen minutes. Treat those as monitor thresholds, not permission to ignore an immediate correctness problem.

A full processing stop, disabling webhook delivery, restoring a database snapshot or reversing money is a separate incident decision. Default to preserving reconciliation and financial history. Any later refund decision follows the current pre-payout policy.

## Status and remaining acceptance

| Item | Status at preparation |
| --- | --- |
| Production recovery and monitoring | Active; durable empty-queue runs verified |
| Production source versus feature branch | Same file tree; merge commit only |
| Account-status signed ping | Passed at 01:41:52 UTC, HTTP 200 |
| Platform and bank-payout signed events | No deliveries; unverified |
| Canonical live transporter readiness | No Production connected accounts yet |
| New booking, payout, refund and dispute controls | Off; no activation in this task |
| Normal transactional email | Off; authenticated delivery tested, Hotmail Junk issue unresolved |
| Role registration and private document replacement checks | Previously completed 5 November; retain that evidence and keep synthetic documents unapproved |
| Compatible pause/support deployment | READY and protected; read-only checks passed; full acceptance incomplete |
| Stage 1 candidate | READY and protected; not promoted; Checkout false |
| Fresh activation backup and observation window | Fresh package verified at 02:27:28 UTC on 6 November; observation window still to be agreed |
| Historical QA | QA23 COMPLETE; QA25 COMPLETE/PASS; QA24 CLOSED/INCONCLUSIVE |

The old insufficient-balance reversal test is not the next launch task for the supported booking-refund flow. It remains historically unverified, not passed. The approved policy prevents new booking refunds after transporter payout starts. Existing issued refunds and card-issuer disputes remain separate reconciliation concerns.

## Evidence and source references

- [Current activation and webhook record](https://github.com/kylebutler123-create/drivedrop/pull/5)
- [Current refund/dispute policy](refund-dispute-window.md)
- [Runtime configuration guards](../src/lib/payment-runtime.ts)
- [Connect controls](../src/lib/stripe-connect-provider.ts)
- [Payout creation and recovery](../src/lib/stripe-payouts.ts)
- [Refund controls](../src/lib/stripe-refunds.ts)
- [Dispute feature control](../src/lib/features.ts)
- [Email controls](../src/lib/email.ts)
- [Contact delivery control](../src/lib/contact-enquiry.ts)
- [Worker health predicates](../src/lib/booking-authorisation-recovery.ts)
- [Preserved schedules](../vercel.json)

No secrets, private monitor URLs, customer documents or credentials are included.
