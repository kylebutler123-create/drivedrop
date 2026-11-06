# DriveDrop live-booking activation plan — 6 November 2026

Status: prepared for review. This document does not activate any setting, deploy a release, create a Stripe account or move money.

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

All boolean entries below are literal strings `true` or `false`. The pause build is a proposed new compatible fallback, not today's recovery-only deployment.

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
| DRIVEDROP_CONTACT_EMAIL_TEST | configured, time bounded | remove | remove | remove |

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

The pause and Stage 1 candidates have not been created by this planning task. Their IDs, fresh backup reference and acceptance evidence must be filled into the release record before a request to activate Stage 1.

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
| Compatible pause/support deployment | Exact configuration prepared; build/acceptance outstanding |
| Fresh activation backup and observation window | Must be recorded for the actual release window |
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
