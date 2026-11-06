# DriveDrop Stage 1 activation record and booking plan — 6 November 2026

## Genuine account-status event delivery verified — 6 November, 22:49 UTC

The live account-status destination at `https://drive-drop.com/api/stripe/connect/events` displayed nine deliveries and zero failures: eight genuine account updates from 22:39:48 through 22:44:41 UTC, plus the historical 01:41:52 ping. Every listed delivery returned HTTP 200. The genuine updates include recipient capability-status and requirements changes.

The final requirements-update delivery was inspected in detail: automatic source, live mode, related-object account matching the canonical Production transporter mapping, Delivered at 22:44:41 UTC, HTTP 200 with `received: true`. Event ID: `evt_65ViJpZMfRcaOPefLwt16VbS9E66E9SNtcKATxYl19kDBg`. Its creation timestamp was 22:44:40.568 UTC.

The current Production source verifies the signature before awaiting the account-notification handler. For a matching canonical account, that handler retrieves current Stripe account state and validates ownership, environment, live mode, UK/GBP and the required account configuration before persisting readiness. Production still points to `dpl_9jSs8g6U4h3PTb6GTZL4drzSyahT`. At 22:49:57 UTC, the canonical account remained READY with both capabilities true, no requirements due and lastCheckedAt 22:44:44.374 UTC, consistent with those final deliveries. The scoped production error/fatal log query from 22:38:00 to 22:46:30 returned no matching logs.

This completes the observed genuine account-status delivery and matching readiness check. It does not establish that a particular webhook was the sole writer of lastCheckedAt, since the normal account-status page also refreshes state. No event was resent and no new ping, financial transaction, deployment or feature-flag change was performed.

The next step is preparation and validation of the exact protected Stage 2 Checkout candidate, followed by a separate opening decision that acknowledges access for all eligible users and operator coverage. The platform financial-event and bank-payout snapshot paths still require ordinary genuine-business evidence; this account-status check does not mark those paths passed.

## Genuine transporter payout readiness confirmed — 6 November, 22:46 UTC

Kye asked whether onboarding was complete and clarified that the transporter has no website. A fresh Production database check at 22:46:21 UTC showed the same canonical live account as READY, transfersEnabled=true, payoutsEnabled=true and requirementsDue=false, last checked at 22:44:44 UTC. The transporter remains ACTIVE and APPROVED.

A fresh read of the live Stripe dashboard confirmed Enabled, Payouts active, and active Payouts/Transfers capabilities. Stripe displays terms accepted at 22:44 UTC, no outstanding actions, and Website: None. The earlier website task is therefore no longer blocking this specific account; no website or workaround was supplied by the assistant. This observation does not establish a universal exemption for other connected accounts.

The earlier pending-state entry below is historical and superseded by this readiness result. Live onboarding and matching persisted payout-readiness state are now confirmed. The exact signed-event delivery responsible for the state transition has not been independently traced, so webhook-path acceptance is not claimed from the matching state alone. No transfer, payout, charge, refund, account edit, message, or Checkout activation was performed. Stage 2 remains a separate decision.

## First genuine transporter onboarding — 6 November, 22:43–22:44 UTC

Kye reported that a genuine transporter had registered and been verified. Production confirms that the new account is ACTIVE, work is permitted and transporter verification is APPROVED. A canonical production Stripe connected-account mapping now exists. The live platform dashboard was inspected because the Stripe connector currently exposes only the separate sandbox.

The live Stripe account is a United Kingdom recipient account with GBP as its default currency and a bank payout destination present. Its displayed status is Restricted, with transfers and payouts paused. Stripe lists two outstanding actions: **Provide a business website** and **Accept terms of service**. These are the requirements shown at this observation; the transporter must complete any further requirements Stripe presents.

At 22:44:18 UTC, DriveDrop's stored account status was PENDING, with transfersEnabled=false, payoutsEnabled=false and requirementsDue=true; its last check was 22:43:37 UTC. That state agrees with the live Stripe screen. Account creation and persisted account linkage are now observed in production, but completed onboarding, payout readiness and signed-event-driven status transition are not yet accepted. No account-status event was resent or independently replayed.

The next step belongs to the transporter: sign in to DriveDrop, open Account → Stripe payout account → Continue Stripe setup, provide their own accurate business information and review/accept Stripe's terms themselves, then return and select Refresh status. Recheck actual requirements, transfer/payout readiness and account-status synchronization after completion. Do not create a replacement connected account.

This check did not change feature flags, approve documents, submit identity or bank information, accept terms, send messages, or move money. Checkout remains outside this onboarding step; opening genuine bookings still requires the separate Stage 2 decision. The synthetic test transporter remains pending and is not the onboarding candidate. No personal identifiers, contact details, bank details or onboarding URLs are included in this record.


## Live recovery monitoring check — 6 November, 05:58–05:59 UTC

Kye approved a read-only review of the existing monitoring after the dispute-fix release and merge. The public Production alias still points to `dpl_9jSs8g6U4h3PTb6GTZL4drzSyahT`. The exact deployed `vercel.json` retains the minute booking-authorisation recovery schedule and the existing three daily schedules; no schedule was changed.

At 05:58:06 UTC, the Production operational log showed **30 runs in the previous 30 minutes, all succeeded**, zero failed/interrupted runs, zero failed items and no stale unfinished run. The latest five completed at approximately 05:54:04, 05:55:03, 05:56:03, 05:57:03 and 05:58:03 UTC. The largest interval between run starts was 60.64 seconds. All three recovery queues (authorisations, transfers and refunds) had zero pending/review/reserved items and zero expired leases. These are healthy empty-queue observations, not financial-flow acceptance.

The existing Healthchecks project, “DriveDrop production operations,” was inspected through its normal signed-in UI. “DriveDrop production payment recovery” displayed **Up**, a recent successful ping, a one-minute period and four-minute grace. Its event history showed consecutive OK heartbeats matching the minute worker runs through 05:58 UTC. Notification Methods showed the existing “DriveDrop operations email” integration ON; Integrations showed the owner's existing email destination and **Ready to deliver**, with its earlier delivery result retained. No test heartbeat, test email, alert change or financial operation was triggered. The deployment-scoped error/fatal log scan for 05:29:10–05:59:10 UTC returned no matching records.

The external monitor status review is now complete. This is an observed status check, not an assistant-run future watch or a new 30-minute live-booking observation. Checkout remains off and genuine onboarding/payment acceptance remains outstanding. The monitor's descriptive paragraph still contains the older statement that payouts/refunds are disabled; that prose is stale relative to Stage 1 and is not evidence of the effective application switches. It was left unchanged during this read-only review; the current activation controls above/below are authoritative. No private ping URL, check token or authentication data is included here.


## Admin dispute refresh fix — 6 November, 05:21 UTC

The approved stale-warning fix is implemented in [PR #7](https://github.com/kylebutler123-create/drivedrop/pull/7), commit `2a7e408462a33bc0f57b0e0661bbe29998caa7a5`, branch `fix/admin-dispute-refresh-warning`. It adds success-only error clearing in `AdminDisputeManagement.load()`. One source line changed; authorization, financial operations, database and feature flags are unchanged. This fixes the stale UI warning; the cause of the initial authorization failure remains unproven.

A temporary React/JSDOM component check reproduced the original failure and verified successful refresh recovery, warning retention during pending/repeated failed requests, network failure, fallback error and a second successful recovery. Vercel Preview deployment `dpl_7mhBBrecc1JBwR4tbXHDmHzRQbuv` is READY.

Production publication completed at approximately **05:27 UTC on 6 November** after Kye completed Vercel's email verification. The exact Production candidate `dpl_9jSs8g6U4h3PTb6GTZL4drzSyahT` (`drivedrop-3oteee8xg-future-9f39.vercel.app`), built from `2a7e408462a33bc0f57b0e0661bbe29998caa7a5`, passed Next.js compilation and TypeScript checks and was promoted without rebuilding. Both `drive-drop.com` and `drivedrop-pink.vercel.app` resolve to this deployment. The canonical Preview remains `dpl_47cB9DM89ubLxoeAGdEAVexZm2p7`; the compatible pause/support deployment remains available. Kye subsequently approved merging the tested fix into the main working branch. PR #7 is now **merged** into `feature/ui-polish` at `384ef663e5a523331e24f5e8566d5909ce299231`. Comparison against the deployed fix commit found no changed files: the working branch and tested release have the same source tree. Its automatic Preview build `dpl_J983TzsG6NgJTGFKwu69kFCTjU3d` (`drivedrop-bt59h0k91-future-9f39.vercel.app`) is READY. Both Production aliases remain on `dpl_9jSs8g6U4h3PTb6GTZL4drzSyahT`, and the canonical Preview alias remains on `dpl_47cB9DM89ubLxoeAGdEAVexZm2p7`; no alias reassignment, promotion or configuration change was made for this merge.

The staged health endpoint returned HTTP 200, `ok:true`, expected version `2a7e408462a3`; the production configuration guard returned `provider:STRIPE`, `testMode:false`; unauthenticated admin-dispute access returned HTTP 403. Post-promotion public health returned HTTP 200 with the same version at 05:27:20 UTC. The public homepage rendered, and the deployment-scoped error/fatal log scan through 05:27:33 UTC returned no matching logs. This is a short post-release observation, not a claim of continuous monitoring.

Current Production project flags still have Checkout and alternative refunds disabled; payments/recovery, Connect, refunds, disputes and normal verified-sender transactional email remain enabled. No environment variable, database record, payment instruction or schedule was changed. Kye subsequently completed normal administrator sign-in on `drive-drop.com`. The authenticated live read/refresh acceptance check completed at approximately **05:34 UTC on 6 November**: the dispute page loaded without an error warning; Open, Under Review and Resolved each showed count 0 and the correct empty state; Refresh was exercised in all three filters without an error warning; a full page reload returned to Open and loaded successfully. The browser's captured warning/error logs were empty. No dispute exists, so populated-dispute and financial actions were not exercised. No failure was deliberately injected into Production; the actual-component failure/recovery checks above remain the evidence for clearing an earlier warning after recovery. No credentials or sessions were copied. No financial QA was reopened.


**Public-page decision:** Kye explicitly confirmed that the public pages are fine as they are. Retain their current design and wording; the previously suggested public-content cleanup is not an approved task. The dispute-fix merge changes no public-page content. Checkout remains off.


Status: Kye approved Stage 1 and it was promoted at approximately 03:26 UTC on 6 November 2026. Onboarding, disputes, normal transactional/contact email and eligible admin payout/refund instructions are enabled. Checkout and alternative refunds remain off. Public Production aliases now point to the approved Stage 1 build; canonical Preview is unchanged. Post-release checks through 03:32 UTC passed within the recorded scope. Genuine onboarding, financial processing and the two signed snapshot-event paths remain unverified; no financial account or transaction was created by this activation.

## Approved activation — completed 6 November 2026

Kye explicitly approved the concrete Stage 1 scope after the staged checks. Only the four existing Production defaults `STRIPE_CONNECT_ENABLED`, `STRIPE_REFUNDS_ENABLED`, `DISPUTES_ENABLED` and `TRANSACTIONAL_EMAILS_ENABLED` changed from `false` to `true`. The already-built deployment was promoted without rebuilding or changing application code/schema. Every other environment value, target and branch association was compared with the pre-activation snapshot and preserved; secrets were not decrypted or printed. Checkout and alternative refunds remain `false`, and the payment master, recovery monitor and sender-verification flag remain `true`. The contact-email test remains disabled.

| Release item | Verified result |
| --- | --- |
| Live deployment | `dpl_92CyExarmSj7ompfZAihWKWMLSRR`, READY, source `232a0d14a72ed02a2806947bf5aab75f14c6a924` |
| Public routing | `drive-drop.com` and `drivedrop-pink.vercel.app` both resolve to the Stage 1 deployment; confirmed by alias lookups and Vercel's Production dashboard |
| Canonical Preview | `drivedrop-git-feature-ui-polish-future-9f39.vercel.app` remains on `dpl_47cB9DM89ubLxoeAGdEAVexZm2p7`; Preview values and separate worker unchanged |
| Pause/support fallback | `dpl_9Xcgq9KcPi5pyA4S3gYwUVYdRZHJ` retained READY and protected, unpromoted, on the same source |
| Protection and routing settings | Existing deployment protection, credentials, webhook signing secrets and canonical origins preserved |
| Recovery package | Verified 02:27:28 UTC private recovery package preserved; no database or file restoration performed during activation |

Immediately before promotion, the 03:25:52 UTC read showed zero authorisations, booking payments, payouts, refunds, connected accounts, jobs, bookings and disputes. Digest eligibility, pending digest batches and active digest leases were zero. The five latest recovery runs succeeded with checked=0/failed=0; no stale or unsuccessful run was found. Both candidate IDs, source/configuration and all relevant aliases matched the approved release.

### Post-release evidence — 03:27–03:32 UTC

- Public `GET /api/health` returned HTTP 200, `ok:true`, version `232a0d14a72e` at 03:27:25 UTC. `GET /api/availability/authorise` returned HTTP 200, `provider:STRIPE`, `testMode:false`; this is a configuration guard, not a Checkout or restricted-key operation test.
- Public `GET /api/disputes` returned HTTP 403 requiring customer/transporter login. `GET /contact` returned HTTP 200 with the contact form and `support@drive-drop.com`. The public homepage opened with title DriveDrop. No form was submitted or email sent as a test.
- All four existing schedules remain active: booking-authorisations every minute, daily-job-summary at 08:00, expire-quote-requests at 03:00 and insurance-expiry-notifications at 04:00. No schedule was added or manually run.
- Vercel request logs show the final old Production-host request at 03:27, followed by HTTP 202 minute requests to `drivedrop-m84z0drj7-future-9f39.vercel.app` from 03:28 through 03:31. The separate canonical Preview requests also returned HTTP 202. No pause-host dispatch appeared in the observed window.
- At 03:32:34 UTC, the five latest durable Production recovery runs, 03:28–03:32, had all succeeded with checked=0/failed=0. There were zero unsuccessful runs since promotion and zero stale active runs. Authorisations, payments, payouts, refunds, connected accounts and disputes remained zero.
- The Stage 1 error/fatal runtime scan covering 03:26:40–03:32:32 UTC returned no matching logs. This is a bounded observation, not a guarantee of all future requests.
- The Vercel Drains page confirmed zero configured drains. Existing monitoring configuration was preserved. The external Healthchecks status page was not rechecked; no test heartbeat or test email was sent.

This observation covered approximately six minutes after promotion. No 30-minute release observation or genuine booking lifecycle is claimed. No Stripe account creation, financial execution, verification approval, PR merge or new monitoring service was included. The documentation PR remains draft and unmerged. The historical preparation evidence below describes the state at its stated times; this activation record and the final status table supersede its earlier pending/unpromoted statements.

## Verified pre-activation baseline

- Canonical origin: https://drive-drop.com.
- Vercel project: `prj_8BO4s7P2sffGKR4czg6nHOZqg4Ze`; team: `team_HR29ivw10fPMfg8JK98snQj5`.
- Production before Stage 1: `dpl_6PkTy3XLvpbofCZczZAoBNV15G7A`, READY, source `ec86e86cef9d8cc606f70fc91ba6f46c538b6e41`.
- Source used for both builds: `232a0d14a72ed02a2806947bf5aab75f14c6a924` on `feature/ui-polish`. GitHub comparison with the deployed commit shows one merge commit and zero changed files.
- Production database: `srqhjgrhgyyfdaxckjum`. At 01:50:06 UTC, production authorisation, transfer, refund and connected-account counts were each zero.
- Five latest worker runs, 01:45–01:49 UTC, were `succeeded`, each with checked=0 and failed=0. This confirms scheduled empty-queue execution, not live financial processing.
- Canonical Preview remains on `dpl_47cB9DM89ubLxoeAGdEAVexZm2p7`. Keep its variables, database, aliases and access protection unchanged.
- Existing Production credentials, webhook signing secrets, origins and private monitor endpoint stay in their current secure provider storage.

The [earlier recovery activation evidence in PR5](https://github.com/kylebutler123-create/drivedrop/pull/5) remains historical evidence. The completed Stage 1 activation recorded above is the latest Production state.

## Exact Production configuration

All boolean entries below are literal strings `true` or `false`. The pause/support and Stage 1 columns are the captured deployment configurations. Stage 1 is now live and the Production project defaults match it. The pre-staging column is historical; Stage 2 remains a future proposal.

| Setting | Pre-staging baseline | Pause/support build | Stage 1: live | Stage 2: future bookings |
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

## Stage 0 — completed preparation procedure

1. Recheck the exact source, Production aliases, current flags and queue counts immediately before staging. Stop on unexplained changes.
2. Capture a fresh consistent Production recovery package and verify its manifest and availability. Preserve the existing 5 November backup; its filename alone is not proof of current recoverability. Do not restore older data over later financial history.
3. Stage a Production-target build from the pinned source using the pause/support column, with automatic public-domain assignment disabled. Keep its deployment URL protected.
4. Verify its production database/storage identity, administrator access, dispute filing/read paths, contact availability, blocked new money operations, webhook signature enforcement and recovery configuration. Use existing accepted role/upload evidence where the code and configuration match; do not repeat completed financial QA or send unapproved emails.
5. Record its immutable deployment ID and URL as the compatible pause candidate. Its source and data schema must match the activation candidates. Confirm retaining it will not add a second active scheduler.
6. Prepare the Stage 1 candidate with the exact same source and the Stage 1 column, still without assigning public domains. Record its immutable deployment ID and validation results.

A staged production build may contain active capabilities even before promotion. Keep it protected, do not perform onboarding/payment/email actions during preparation, and verify the single current scheduler remains on the current Production deployment. Do not call a candidate tested merely because its build is READY.

The candidates were created, the fresh recovery package verified and the scoped read-only role checks completed before Kye's separate Stage 1 approval. The staging work itself did not authorise promotion.

## Historical staging evidence — 6 November 2026, before promotion

Both builds use source `232a0d14a72ed02a2806947bf5aab75f14c6a924`, target Production, and the exact respective configuration columns above. At staging, Vercel showed both with custom-domain assignment skipped. Stage 1 was subsequently promoted as recorded above; the pause build remains staged. Authentication protection remains enabled for deployment URLs.

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
- Scoped role reads are complete: administrator and existing-transporter paths on both candidates, and customer dashboard/payment/dispute/access-boundary checks on Stage 1. Effective Connect creation flags and setup buttons show fallback off and Stage 1 on. Customer login was not separately repeated on the fallback; its matching source and dispute flag, together with its exercised administrator/transporter routes, are the available equivalence evidence. Empty queues do not establish financial-action or dispute-filing behaviour.
- New-operation gates are recorded from the pre-build configuration snapshots and reviewed source. No payment, payout, refund, account-creation or email-send action was performed to test them.
- No staged signed Stripe event was delivered. The existing live thin ping evidence remains limited to signature parsing/delivery. Platform and bank-payout signed snapshot paths remain unverified.
- Ordinary email delivery was not retested. The earlier authenticated delivery evidence and unresolved Hotmail Junk case remain unchanged.
- The scoped read-only results support reviewing the exact Stage 1 activation below. They do not authorise promotion or opening Checkout, and the unexercised financial/onboarding/event paths remain explicit limitations.

### Signed-in Stage 1 admin checks — 6 November, completed by 02:48 UTC

Kye signed in through the normal protected Stage 1 page using the existing active administrator account. Browser observations on `dpl_92CyExarmSj7ompfZAihWKWMLSRR`:

| Page/check | Observed result | Limit |
| --- | --- | --- |
| Control Centre | Administrator navigation; four registered users; zero jobs, quotes, completed deliveries and payments | Read-only dashboard, not operational processing |
| Dispute management | Authenticated direct `GET /api/admin/disputes` displayed `[]`; after reopening, Open, Under Review and Resolved filters each displayed zero; Refresh and later navigation back rendered without the initial error | No dispute exists; no filing, resolution or refund tested |
| Transporter payouts | All eight categories showed zero; Ready and Held views displayed their expected empty states; export disabled when empty | No release, refund or provider call was triggered by an operator action |
| Outstanding fines | £0.00 owed, zero transporters/open fines and “No outstanding fines” | No fine created or adjusted |
| Transporter verification | Synthetic account remained pending review, with two new uploads and two previous rejected versions; combined approval disabled while document review is outstanding | No document approved/rejected, account changed or upload repeated |

Initial anomaly: the dispute panel first displayed “Admin access required” while the admin shell was visible, and its initial Refresh left that message visible. Direct authenticated navigation to the API then returned `[]`. A full navigation back cleared the error; Refresh, all status filters and a later return from verification loaded correctly. The cause of the initial denial is not established. Source review found that `AdminDisputeManagement.load()` does not clear a previously stored error after a successful GET, which can retain a stale warning. This is a recorded UI follow-up, not a claimed authentication fix or proof that the first request succeeded. No application code or candidate was changed.

The post-reopen browser console inspection returned no captured warnings/errors. A Stage 1 error/fatal runtime scan for 02:27:01–02:47:01 UTC returned no matching logs. A text-filtered runtime-log query returned no dispute records; runtime output is not a complete HTTP request trace, so this does not identify the initial request's cause.

No payment, transfer, refund, connected account, dispute, fine or email was created. No verification decision or public deployment change was made. Full release acceptance remains incomplete.

### Signed-in pause/support admin checks — 6 November, completed by 02:57 UTC

Kye completed the normal administrator login on `dpl_9Xcgq9KcPi5pyA4S3gYwUVYdRZHJ`. The Control Centre displayed the existing four-user, zero-booking/payment baseline. Dispute management loaded without the initial access warning seen on Stage 1. Refresh and all three status filters displayed their expected empty states; direct authenticated `GET /api/admin/disputes` displayed `[]`.

The payout page showed all eight categories at zero. Ready and Held views displayed their expected empty states, with CSV export disabled when empty. The signed-in contact page displayed its form, normal support destination and contact details; no message was submitted.

Deployment metadata still identifies the pinned source `232a0d14a72ed02a2806947bf5aab75f14c6a924`, Production target, READY state and no assigned aliases. Fresh alias lookups confirmed both public Production aliases still point to `dpl_6PkTy3XLvpbofCZczZAoBNV15G7A` and canonical Preview to `dpl_47cB9DM89ubLxoeAGdEAVexZm2p7`. The browser console had no captured warnings/errors, and the fallback error/fatal runtime scan for 02:45:52–02:55:52 UTC returned no matching logs.

These are administrator read/render checks. The recorded pause configuration keeps Checkout, Connect creation/new payout instructions, refunds and alternative refunds off, while disputes, normal support email and recovery remain enabled. That configuration evidence comes from the captured build settings and reviewed source; no financial creation request was used to re-prove those gates, and empty payout lists expose no financial-action buttons to test.

The subsequent signed-in check used the existing synthetic transporter's payout-setup status on the fallback host, as recorded below. Source review confirms that when no connected-account row exists, its status GET returns `creationEnabled` and `NOT_STARTED` without creating or retrieving a Stripe account. No onboarding button, financial-account creation or verification approval is authorised by this read-only check.

### Fallback transporter pause-status check — 6 November, completed by 03:01 UTC

Kye signed in normally as the existing synthetic transporter on the pause/support candidate. The account page showed “New payout setup is temporarily paused” and the `Set up payouts` button was disabled. Direct authenticated `GET /api/account/stripe-connect` returned:

```json
{"enabled":true,"creationEnabled":false,"status":"NOT_STARTED","ready":false}
```

Here `enabled:true` denotes the reconciliation/status feature; `creationEnabled:false` is the separate new-account gate. This verifies the candidate's effective creation flag and disabled UI for this not-started transporter. No setup/dashboard POST, onboarding link, Stripe account, payment, payout or refund was created. It does not establish behaviour for an already-connected account or prove the payout/refund creation gates through a financial request.

The transporter dispute-list GET returned `[]`. The admin dispute-list GET using that same transporter session returned “Admin access required,” confirming the administrator read path remained unavailable to that role. No dispute was filed. Verification remained pending, new-job email preferences remained Off, and no preference or verification decision was changed.

The fallback error/fatal runtime scan for 02:51:08–03:01:08 UTC returned no matching logs. The corresponding Stage 1 comparison was then completed through a normal login, as recorded below.

### Stage 1 transporter comparison — 6 November, completed by 03:10 UTC

Kye completed the existing synthetic transporter's normal Stage 1 login. The account page displayed “Connect your payout account”; `Set up payouts` was enabled and the pause notice was absent. Direct authenticated `GET /api/account/stripe-connect` returned:

```json
{"enabled":true,"creationEnabled":true,"status":"NOT_STARTED","ready":false}
```

| Existing transporter status | Pause/support | Stage 1 |
| --- | --- | --- |
| Status/reconciliation feature | Enabled | Enabled |
| Effective account-creation flag | false | true |
| Set up payouts button | Disabled | Enabled |
| Account state | NOT_STARTED; not ready | NOT_STARTED; not ready |

The setup button was not pressed. These observations verify configuration and the not-started account UI, not Stripe account creation, restricted-key scopes, capability readiness or a bank payout. Verification remains pending and new-job email preferences remain Off.

The Stage 1 transporter dispute-list GET displayed `[]`; the admin dispute-list GET denied that same transporter session with “Admin access required.” No dispute was filed. Browser console inspection returned no captured warnings/errors; the Stage 1 error/fatal runtime scan for 02:59:49–03:09:49 UTC returned no matching logs.

A read-only Production query at 03:10:08 UTC found zero authorisation records, booking payments, payouts, refunds, connected accounts, jobs, bookings and disputes; active opted-in transporter digest recipients were also zero. The latest five recovery runs (03:06–03:10 UTC) succeeded with checked=0 and failed=0, with no recent unsuccessful or stale active run. This remains empty-queue recovery evidence. Fresh alias lookups still resolve public Production to `dpl_6PkTy3XLvpbofCZczZAoBNV15G7A` and canonical Preview to `dpl_47cB9DM89ubLxoeAGdEAVexZm2p7`.

Administrator and transporter read checks are now complete on both candidates. Customer-specific staged access is the outstanding role check; the existing active test customer's normal Stage 1 login is prepared. No customer account is being created or restored. Full financial processing, real onboarding, dispute filing and signed snapshot processing remain outside these read-only results. Both candidates remain unpromoted and Checkout remains false.

### Stage 1 customer checks — 6 November, completed by 03:18 UTC

Kye signed in normally using the existing active synthetic customer. The dashboard displayed the customer role and zero quote requests, deliveries, completed and cancelled bookings. The Payments page rendered the current-year statement controls, zero payment records and £0.00 paid/refunded/net totals. No statement download or payment submission was performed.

Authenticated read checks returned:
- `GET /api/disputes`: `[]`.
- `GET /api/admin/disputes`: “Admin access required.”
- `GET /api/account/stripe-connect`: “Transporter access required.”

These observations establish the exercised customer read paths and role separation on Stage 1. No eligible booking exists, so customer dispute filing, checkout, receipt contents and refund processing were not exercised. The customer login was not separately repeated on the fallback candidate; do not label it a second-host customer workflow pass.

Browser console inspection returned no captured warnings/errors. The Stage 1 error/fatal runtime scan for 03:07:14–03:17:14 UTC returned no matching logs. Both deployment metadata records still show READY, source `232a0d14a72ed02a2806947bf5aab75f14c6a924`, Production target and no assigned aliases.

### Concrete Stage 1 scope — approved and executed

Kye approved the exact Stage 1 deployment and the four Production-default changes recorded at the top of this document. Stage 1 was promoted at approximately 03:26 UTC; the pause/support candidate remains unpromoted. Checkout and alternative refunds stay off. Preview, credentials, origins, protection and the existing schedules were preserved.

The activation enables genuine transporter onboarding, customer/admin dispute features and ordinary transactional/contact email, as well as eligible admin payout/refund instructions. It does not itself execute those financial actions. No account-creation, onboarding submission, payout, refund, verification approval or email test was performed.

Hotmail Junk placement, two unverified signed snapshot-event paths, no genuine ready transporter and the recorded dispute-panel stale-error behaviour remain open. Scoped role reads and empty-queue recovery do not establish financial processing. Keep Checkout closed while the remaining genuine onboarding/payment-readiness work is completed.

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

Kye completed the normal administrator logins on both candidates, and their read-only results are recorded above. Both transporter status checks and the Stage 1 customer-role checks are complete. No further login is pending for this scoped read-only review. The two candidate hosts have separate browser cookies. The current application login implementation replaces the account's previous sessions globally, so finish each candidate's checks sequentially; do not assume an earlier host stays signed in after the next login. No session was copied from the backup or fabricated. Both candidates were unpromoted during these role checks; Stage 1 was later promoted as recorded above. Checkout remains false.

## Stage 1 — active; remaining onboarding and readiness work

Technical activation is complete. The following distinguishes completed release work from the remaining business acceptance:

1. Completed: preconditions rechecked, four Production defaults aligned, exact Stage 1 build promoted and both public aliases verified; canonical Preview and unrelated configuration preserved.
2. Completed: deployment configuration, scheduler ownership and durable worker completion verified. Existing Stripe destinations and monitoring configuration were preserved. No new signed-event acceptance or external Healthchecks UI status check was performed.
3. Allow a genuine transporter to complete Stripe-hosted onboarding. The transporter supplies their real identity/bank information and completes required financial-account steps. Do not approve synthetic verification documents or convert the existing upload-test account into a real provider.
4. Verify canonical account ownership, UK/GBP configuration, transfer and payout capability readiness and requirements. Production currently has no connected accounts, so there is no live transporter ready yet.
5. Inspect actual account-status events and account-state synchronisation. The successful thin ping only proves delivery/signature parsing, not account reconciliation.
6. Resend's existing deliverability case was reviewed on 6 November; the substantive reply is recorded below. Normal mail remains enabled. Check actual receipt during authorised ordinary use when genuine users join; do not repeat the exhausted Healthchecks test-email cycle.
7. Completed at configuration level: both live restricted-key permission summaries, relevant resource descriptions, webhook subscriptions/scopes and deployment metadata were reviewed on 6 November. No confirmed missing permission was identified. Actual use of those keys and genuine onboarding/payment processing remain unverified; empty request logs and a thin ping do not establish operational acceptance.

The email tests authenticated and delivered, but Hotmail placed the branded messages in Junk. Resend has now provided a substantive reply: it reports correct sending configuration and attributes the filtering to Microsoft domain-reputation/content signals. Natural inbox placement remains unverified. Record whether that known limitation is accepted for the intended opening or requires remediation first.

Stage 1 now enables eligible admin payout/refund actions as well as onboarding. Financial queues were rechecked immediately before and after activation and remained zero. No financial transaction was included in the preparation, activation or technical validation.

## Pre-recruitment email-support review — 6 November 2026

Kye clarified that the site is being prepared before recruiting transporters. Genuine transporter onboarding is therefore deferred until a real provider joins; Checkout remains off. Technical readiness work can continue without creating a synthetic live financial account.

Read-only review of the existing [Resend support case](https://resend.com/help/th_01M6Q3Z8KWXV29TETCQF2NSGVT) found a substantive support reply in addition to the acknowledgement. Resend says Microsoft accepted the example messages and subsequently filtered them to Junk. It reports that `contact.drive-drop.com` is verified, sending records are in place and SPF, DKIM and DMARC pass. Its assessment is that no sending-configuration fault explains the placement; it attributes the outcome to Microsoft's domain-reputation and content signals.

This supports reputation as a plausible factor, including limited sending history, but does not identify the domain's age as the sole cause or prove that every template is unaffected. Resend's statement that it monitors sending IPs is not a case-specific infrastructure audit. The reply provides no remediation completion, guaranteed inbox placement or resolution date.

The linked [Resend Outlook guide](https://resend.com/guides/email/deliverability/avoid-outlook-spam-folder) recommends simple content, aligned links and genuine recipient engagement. It cautions that repeatedly mailing one owned test inbox adds little evidence and that low-volume reputation can take weeks to develop. Waiting alone does not establish delivery, and no artificial daily mail schedule is proposed.

Preparation decision: retain the existing authenticated sending configuration and corrected branded-link setup; do not change DNS, switch domains or repeat test messages solely because of this reply. Continue observing real, requested transactional mail when users join. Any recipient moving mail out of Junk or adding a safe sender must be distinguished from natural inbox placement.

No reply was sent, no additional test email was sent and no provider, mailbox or production setting was changed during this review. Inbox placement remains an open acceptance limitation. The subsequent Stripe permissions/webhook review is recorded below; actual onboarding and financial event processing remain separate evidence requirements.

## Live Stripe permissions and webhook review — 6 November 2026

Scope: read-only preparation before recruiting transporters. The Stripe connector exposes only the separate sandbox, so the existing signed-in live dashboard for `acct_1US4BsLo6y2NJoQw` was used. No sandbox financial tests were repeated. The live public alias still resolves to `dpl_92CyExarmSj7ompfZAihWKWMLSRR`, READY, source `232a0d14a72ed02a2806947bf5aab75f14c6a924`. Eleven payment/provider/handler/package files were checked against that exact GitHub source; their local blob hashes matched.

### Restricted-key configuration

Both named live keys are active and restricted. Permission summaries were opened without changing or saving them; no key value was revealed or copied.

| Key | Resource | In your account | In connected accounts |
| --- | --- | --- | --- |
| DriveDrop Checkout | Accounts | Read | None |
| DriveDrop Checkout | Charges and Refunds | Write | None |
| DriveDrop Checkout | Checkout Sessions | Write | None |
| DriveDrop Checkout | Payment Intents | Write | None |
| DriveDrop Connect | Account Links | Write | None |
| DriveDrop Connect | Accounts | Read | None |
| DriveDrop Connect | Accounts v2 | Read | Read |
| DriveDrop Connect | Charges and Refunds | Write | None |
| DriveDrop Connect | Login Links | Write | None |
| DriveDrop Connect | Payment Intents | Read | None |
| DriveDrop Connect | Payouts | None | Read |
| DriveDrop Connect | Recipient Configuration | Write | Write |
| DriveDrop Connect | Transfers | Write | None |

The deployed Checkout provider reads the current platform account and uses Checkout Sessions, PaymentIntents/capture/cancel and refund creation. The Connect provider reads the platform account, creates/reads recipient-configured v2 accounts, creates onboarding/login links, reads PaymentIntents/charges, creates/reconciles transfers/refunds/reversals and retrieves bank payouts in connected-account context. The displayed configuration covers these operation families; no confirmed missing resource permission was found.

The current dashboard's Accounts v2 resource offers None/Read, with recipient changes controlled separately by Recipient Configuration. Its connected-account selections are linked/disabled in the editor. Do not infer a missing generic Accounts v2 Write setting from the summary or widen unrelated customer/merchant permissions. Account Links has Write; its resource description lists the v1 path, so this read-only inspection alone is not proof of v2 account-link execution.

Both keys' individual View logs pages returned “No results found” in the displayed view, and Last used was blank in the key list. This does not establish successful live API operations or prove there have never been requests outside the available view. Production secrets are stored as sensitive environment entries and were not decrypted; their exact bytes were not matched against dashboard keys in this review. No access policy is assigned to either key. No key was replaced, rotated or broadened.

### Webhook configuration and observed delivery

| Destination | URL path | Scope / format | Events | Observed delivery |
| --- | --- | --- | --- | --- |
| Platform, `we_1UYbCoLo6y2NJoQw24WRFfXP` | `/api/stripe/webhook` | Your account / Snapshot, API `2026-09-30.endive` | 17 subscribed; all 16 event types explicitly handled by the current route are present | This-week overview: 0 deliveries, 0 failures |
| Bank payouts, `we_1UYbHkLo6y2NJoQwxxTllbZ5` | `/api/stripe/connect/webhook` | Connected accounts / Snapshot, API `2026-09-30.endive` | payout.created, payout.updated, payout.paid, payout.failed, payout.canceled | This-week overview: 0 deliveries, 0 failures |
| Account status, `ed_61VhzH1HHYM4VGpy516VbS9E66E9SNtcKATxYl19k3IO` | `/api/stripe/connect/events` | Your account / Thin | account.closed; recipient capability_status_updated; requirements.updated; future_requirements.updated (all v2.core.account events) | One earlier live ping, 01:41:52 UTC, Delivered / HTTP 200 |

All three destinations are Active and use `https://drive-drop.com`. The platform subscription includes one additional `transfer.canceled` event that the current route acknowledges without a dedicated branch; it does not omit any currently handled event. The account-status scope is consistent with platform-owned Accounts v2 resources. Older descriptive text on destinations still mentions staging/disabled payments; the Active status and deployed flags are the authoritative configuration observations.

The thin delivery re-read at 05:06 UTC is the same historical `v2.core.event_destination.ping`, not a new account update. The handler deliberately ignores that ping after signature validation. No resend, new ping, fake financial event or replay was performed. Snapshot signature acceptance and representative live business reconciliation remain unverified.

Checkout API requests still explicitly use `2024-06-20`; the Connect package remains Stripe Node `23.0.0`. No SDK, API version, webhook subscription or route changed. The already-recorded snapshot-version/business-event compatibility limit remains open.

### Configuration controls and outcome

Production metadata still shows Checkout=false, alternative refunds=false, master payments=true, Connect=true, refunds=true and recovery monitoring=true, with the expected live platform ID and canonical origin. Both API keys and all three webhook-secret entries are sensitive Production variables. Values were not decrypted or logged. No environment edit, deployment, source change, database mutation, financial-account creation or money operation was performed.

Result: the requested configuration review is complete, with no confirmed missing event subscription or restricted-key permission found. This is not a live financial-flow pass. Preserve Checkout off, the current authentication/reconciliation controls and completed QA. Genuine onboarding, actual key use, canonical account synchronisation and signed financial-event processing remain evidence to collect when a real transporter/customer is available. The next independently actionable preparation item is the recorded stale admin dispute-panel warning.

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

The previous recovery-only deployment `dpl_6PkTy3XLvpbofCZczZAoBNV15G7A` is not the full post-launch fallback because its dispute and normal email switches are off. The old August application and Preview deployment are also unsuitable fallbacks.

An environment edit alone does not pause an immutable deployment. Promote the exact pause candidate, explicitly reconcile Production aliases, and verify its effective controls and current worker. Align Production project defaults with the pause/support column as part of the approved incident action so a later deployment cannot silently reopen creation. Pause settings do not revoke already-issued Stripe Checkout sessions or cancel already-claimed instructions. Inventory in-flight authorisations and use their existing canonical release/cancellation workflow where required; never create a replacement instruction merely because a response was lost.

Pause and investigate on incorrect account/amount/currency, duplicate or unexplained financial instructions, unreconciled signed-event errors, unresolved REVIEW records, failed/stale recovery, or inability to file an eligible dispute. Existing worker thresholds are a recent success within five minutes, no stale active lease beyond four minutes, no REVIEW/old expired leases, and no pending work older than fifteen minutes. Treat those as monitor thresholds, not permission to ignore an immediate correctness problem.

A full processing stop, disabling webhook delivery, restoring a database snapshot or reversing money is a separate incident decision. Default to preserving reconciliation and financial history. Any later refund decision follows the current pre-payout policy.

## Status and remaining acceptance

| Item | Status after Stage 1 activation, 03:32 UTC |
| --- | --- |
| Production recovery and monitoring | New Production host receiving scheduled requests; durable empty-queue runs 03:28–03:32 succeeded; monitoring configuration preserved, external status UI not rechecked |
| Production source versus feature branch | Same file tree; merge commit only |
| Account-status signed ping | Passed at 01:41:52 UTC, HTTP 200 |
| Platform and bank-payout signed events | No deliveries; unverified |
| Canonical live transporter readiness | No Production connected accounts yet |
| Live key permissions and webhook subscriptions | Read-only review completed 6 November; no confirmed configuration gap found; actual key execution and two snapshot paths remain unverified |
| New-operation and dispute controls | Checkout and alternative refunds OFF; Connect, eligible admin payout/refund instructions and disputes ON |
| Normal transactional email | ON; support reply reviewed 6 November: configuration/authentication reported correct, Microsoft reputation/content filtering identified at a general level; natural Hotmail inbox placement still unresolved; no new email test |
| Role registration and private document replacement checks | Previously completed 5 November; retain that evidence and keep synthetic documents unapproved |
| Compatible pause/support deployment | READY and protected; administrator and transporter read checks completed; Connect creation disabled in effective status/UI; financial/dispute-filing acceptance not exercised |
| Stage 1 deployment | LIVE on both public Production aliases; admin/transporter/customer staged read checks completed within the recorded scope; setup creation enabled; initial admin error recorded; live financial/onboarding acceptance unverified; Checkout false |
| Fresh activation backup and observation window | Fresh package verified at 02:27:28 UTC; Stage 1 observed through 03:32 UTC, approximately six minutes after promotion; first-booking operator coverage remains to be arranged |
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
