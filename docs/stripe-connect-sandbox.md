# Stripe Connect sandbox implementation

## Status

**Late refund failure verified on preview:** Runtime `717e8e49e3325d9412dd63846babdafbda50ef06`, READY ordinary preview `dpl_HF1MkfVbPQb4tdSGoBLTS17ASpap`, is active on the feature alias. Runtime verification exposed the old `StripeRefund_success_check`, which rejected a FAILED row retaining its original ledger timestamp. The narrowly scoped preview migration `20261020220726_stripe_refund_late_failure` allows the two explicit held late-failure states, with 19 read-only database lifecycle checks passing. At 22:08:06 UTC the existing worker automatically corrected the retained case: FAILED, refunded 0p, fee 1000p, proceeds 10000p, payout HELD, one -11000p audit correction and two corrective notifications. The original success audit/timestamp remain. Later runs leave those results unchanged. Authenticated admin GET confirms refunds remain false. Both rotated restricted credentials have been exercised successfully: canonical Connect reads/reconciliation and creation/retrieval/expiration of an unpaid booking Checkout. Further sandbox checks remain pending; earlier checkpoints below are historical.

**20 October deployment continuation:** Both rotated restricted keys are now saved in their existing sensitive Vercel entries, scoped only to Preview / `feature/ui-polish`. Metadata confirms both saves; secret values were not retrieved or displayed. The 29-entry inventory is unchanged and `STRIPE_REFUNDS_ENABLED=false`. The tested late-failure fix is being published to the feature branch for an ordinary preview deployment; runtime verification is pending. The credential handoff paragraphs below are historical.

**Credential continuation:** The user rotated all three sandbox keys. The replacement Connect key `mk_1USkboLAzgkvCvrI7soNoQCy` retains the exact nine permissions below; the booking key retains its three own-account Write scopes and no connected-account permissions. Vercel still needs the two active preview secret values entered directly. Automatic approval review rejected an intermediate shared-file credential transfer; no file or configuration change occurred. The scoped Vercel editor is prepared for user entry. Deployment and further Stripe QA remain pending; refunds stay off. See the first section of [stripe-refund-preparation.md](stripe-refund-preparation.md).

**Approved follow-up prepared locally:** The late-success-to-failure refund fix now has passing regression tests, TypeScript and a complete normal Next build. It has not been deployed. Canonical Stripe and the retained fixture were read again: Stripe refunded total is 0p; the application still records 11000p. Refunds remain OFF. Credential replacement is the next gate before deployment or further Stripe QA; no new permission is needed. See the first section of [stripe-refund-preparation.md](stripe-refund-preparation.md) for the correction rules, tests and exact continuation steps. The active preview is documentation-only deployment `dpl_6N4Zq2hEvdBdn5BxWmPP6hmGqA7E`, commit `e1230bc`.

### Prior sandbox QA checkpoint


**Latest verification — 20 October 2026:** The approved restricted-key permission is saved: **Charges and Refunds → Your account → Write**. The other eight configured permission rows and every connected-account scope remain unchanged. Actual before/after-transfer partial/full refunds, £75 transfer recovery, £25 applied-fine restoration, duplicate/stale-request protection and pending-to-success webhook reconciliation passed. **A later `refund.failed` leaves the app's successful refund ledger unchanged while holding the payout. This blocks activation.**

Refunds are now **OFF** (`STRIPE_REFUNDS_ENABLED=false`, Preview / `feature/ui-polish`) on READY deployment `dpl_FFkzDEdd16pHLVg8VUJXTxG1ia1y`, `drivedrop-jrcchbx0b-future-9f39.vercel.app`, runtime commit `471e22a190822d1f819099f1be50ca64dcb99d73`. Authenticated read-only `/api/admin/disputes` returns 200 and false for the refund flag. No application source changed. See [stripe-refund-preparation.md](stripe-refund-preparation.md) for actual Stripe IDs, the retained failing case, cleanup and remaining checks.

All settled QA fixtures were removed after their charges were fully refunded and the transfer fully reversed. One failed-refund fixture is retained; no temporary QA sessions remain. All 29 original-data table counts/fingerprints match, plus the original 16 users, 52 bookings and 136 stored-file fingerprints below. The retained disposable Connect account's check metadata is the only pre-existing synthetic row that changed.

Bank payout testing remains blocked by **No valid option available** in Stripe's payout destination field. No bank payout was submitted. The disposable account still has test bank ending1116, and its original daily/7-day schedule is restored and canonically verified. A fresh balance UI read was blocked by session expiry; the full £75 transfer reversal is canonically verified.

Two disclosed operational incidents are recorded in the refund document: Stripe unexpectedly included sandbox key values in one accessibility response, and the initial Vercel staging deployment temporarily moved a production convenience alias. No keys were copied into source/configuration or rotated; later reads were redacted. The alias was restored before QA charges. All production aliases now resolve to the original deployment, all existing environment entries match the baseline, and no live payment or production deployment was created.

### Verified restricted-key permissions

Key name: `DriveDrop preview Connect payouts`; object ID: `mk_1USOOgLAzgkvCvrIOAF4iATu`; sandbox: `acct_1US4BzLAzgkvCvrI`. The saved permission summary was reopened after saving. This table records permission labels only, never the secret key.

| Resource | Your account | Connected accounts |
| --- | --- | --- |
| Account Links | Write | None |
| Accounts | Read | None |
| Accounts v2 | Read | Read |
| Charges and Refunds | **Write (only change)** | None |
| Login Links | Write | None |
| Payment Intents | Read | None |
| Payouts | None | Read |
| Recipient Configuration | Write | Write |
| Transfers | Write | None |

### Earlier checkpoints (historical; superseded by the current status above)

**Verified preview deployment:** `dpl_GHFtnNbMEYLS13F4pNgqdypNYXCG` is READY at `drivedrop-g9j6uh2ej-future-9f39.vercel.app`, target preview/null, branch `feature/ui-polish`, runtime commit `9698c5f82fd83bf239b41e14013187174d5ade27`. The stable preview `/api/health` returns 200/ok and unauthenticated `/api/admin/disputes` returns 403. No error/fatal runtime logs were found for this deployment in the checked window. The project environment-variable inventory confirms no `STRIPE_REFUNDS_ENABLED` entry. The original data fingerprints match; the new refund table and all payout instructions remain empty. These are deployment/gate checks, not authenticated UI or real-money-flow verification.

**Latest continuation — durable refunds implemented, activation off:** `src/lib/stripe-refunds.ts` now connects the tested refund policy to durable instructions, admin routes, dispute confirmation, fine restoration, separate transfer recovery, webhooks and the background scheduler. Preview migration `20261020193911_stripe_refund_sandbox` is applied with RLS and no client access. The table contains zero records. Local concurrency/failure/accounting/API/UI tests and a complete Next build pass; actual Stripe refund/bank-payout QA remains unverified. `STRIPE_REFUNDS_ENABLED` is absent/off, and Stripe key permissions have not changed. The platform webhook now includes seven refund/charge-dispute events in addition to the existing nine; its URL, bypass and API version are unchanged. See `docs/stripe-refund-preparation.md` for exact remaining gates.

The fresh browser recovery attempt also timed out after five minutes, before documentation/UI state was returned. No additional browser retry, sign-in, temporary app session or money operation was attempted. The retained zero-funded fixture below is unchanged, as are the saved original-user/booking/file fingerprints. The earlier "preparation only" paragraph below is historical and superseded by this entry.

**20 October continuation:** A new disposable transporter (`dd_bank_20261020a_transporter`) and connected account (`acct_1USi72LAzgvhqEGk`, DB row `2793ede9-0abe-4c29-bc2a-4befbf27ace9`) completed hosted onboarding. Stripe's documented GBP failure bank (sort code `108800`, account `11111116`, `no_account`) was accepted. The real thin webhook set the preview row to `READY` at 18:53:21 UTC before any status refresh. No booking, customer charge, transfer or bank payout was created in this continuation. Express showed a zero balance, but its **Update payout settings** panel returned **Sorry, something went wrong**. The platform dashboard returned to sign-in; after secure password/authenticator submission, two browser-service calls timed out after approximately five minutes each. The post-authentication state is unknown. Stop browser retries in this session; do not describe this as a Stripe outage or bot-detection block.

The new zero-funded test transporter and its Connect mapping are retained for resuming bank-payout QA without repeating onboarding. Its temporary app session was revoked and local private links/credentials removed. All 16 original users, 52 bookings and 136 stored-file rows still have the fingerprints recorded below. There are zero payout instructions and zero fixture bookings/sessions. Production, runtime deployment and Stripe key permissions are unchanged. Refund calculation/validation groundwork is prepared and tested in `src/lib/stripe-refund-policy.ts`; it is **not connected to routes or deployed as a financial feature**. See `docs/stripe-refund-preparation.md` for remaining implementation and verification.

### Verified runtime from 19 October

Implementation and credentials are configured on `feature/ui-polish`. Both platform liability acknowledgement and the synthetic transporter's Connected Account Agreement were explicitly approved and completed on 19 October 2026. `STRIPE_CONNECT_ENABLED=true` is active on preview deployment `dpl_5NCsJiReEkcd2jFYwmdUdD9cogFA` (runtime commit `ce0b614cc39452a0d96c92f43865c75a7e71f91d`, preview target only). Real sandbox onboarding, Express access, captured-payment release, fine deduction, duplicate protection, automatic recovery and transfer reversal passed. Bank-payout success/failure testing remains incomplete: Stripe Express failed twice to load the existing GBP test-bank edit form.

Existing sandbox customer Checkout remains active. The additive migration `20261019213129_stripe_connect_sandbox` is applied to shared preview database `yozbuuvebzxitoqrvyer`. Client-role access is denied and RLS is enabled. All 16 original users, 52 bookings and 136 stored-file rows retain their exact pre-change fingerprints. The £75 test transfer was fully reversed, the £110 customer test charge fully refunded, and the zero-balance synthetic Stripe account closed. All temporary app fixtures, Connect records and sessions were removed; Stripe audit history remains in the sandbox.

The user selected Stripe-hosted onboarding with the Express dashboard on 19 October 2026. Production and live money remain disabled. Do not merge or deploy production as part of this work.

## Confirmed configuration

- Accounts v2 (`/v2/core/accounts`), no legacy account type.
- Transporters: UK recipient accounts requesting Stripe balance transfers; payout capability is checked separately. Merchant/card-payment capability is not requested.
- Dashboard: Express, accessed through authenticated, short-lived login links.
- Onboarding: Stripe-hosted, collecting eventual and future requirements. Return is not proof of verification; canonical v2 capability checks decide readiness.
- Fee collection and negative balance liability: DriveDrop (`application`).
- Charge pattern: separate charges and transfers. The existing platform Checkout capture stays in place; a source-charge-linked transfer follows delivery, confirmation, the 24-hour window (or explicit dispute-resolution override), and admin release.

## Fees and funds flow

The existing pricing is unchanged: by default a 10% markup on the transporter's quote. A £100 quote produces a £110 customer charge, a £10 recorded DriveDrop fee, and £100 transporter proceeds before any valid fine deduction. Stripe processing/Connect charges reduce DriveDrop's margin; £10 is not guaranteed profit. Check the current UK rates at https://stripe.com/gb/pricing and https://stripe.com/gb/connect/pricing before live launch, especially for small bookings.

A £25 eligible fine reduces that example's transfer to £75. Fine accounting retains its existing completion-order policy. Adjustable admin dispute fines remain distinct from the fixed £50 active-delivery cancellation fine.

`application_fee_amount` is not used with separate charges and transfers. The platform retains the recorded fee by transferring the remaining transporter proceeds.

## Negative balance liability

DriveDrop is responsible for connected-account negative balances in this configuration. Stripe debits platform charges/refunds/disputes to DriveDrop; recovering transferred funds requires an explicit transfer reversal. An Express dashboard does not let a transporter manage platform-charge refunds or disputes. Stripe-backed post-booking refunds, dispute recovery and reversal failure handling remain the next phase and are a live-launch blocker.

### Platform liability acknowledgement completed

The first real account-creation request failed with HTTP 400, `account_creation_losses_collector_unavailable` (Stripe request `req_v2xuP4yoyjLDa6AXw`). This was resolved by the explicitly approved **Refunds and chargebacks liability acknowledgement** in the sandbox Platform profile. Stripe shows **Completed 19 October 2026**.

The review form describes responsibility for refunds, chargebacks and fines; checking sellers against restricted-business/product rules; seller payment/risk support; and losses from seller fraud and connected-account negative balances. It also says Radar Pro is enabled and displays **£0.08 per screened transaction and £3.75 per connected account**, with plan changes available in Settings. The form does not specify a billing interval for the connected-account price; do not infer one.

The user approved this acknowledgement and its disclosed pricing before it was submitted. Do not silently change loss liability, charge pattern or dashboard experience. Live launch needs a separate review of liability, pricing and refund/reversal recovery.

### Hosted-onboarding agreement completed

The temporary transporter `dd_connect_20261019b_transporter` mapped to account `acct_1USOoTLAzgOujhnB` and DB row `89cb4cef-ba6a-4f63-a525-f55ebc48c37b`. Hosted onboarding used Stripe's built-in test phone/code and test bank shortcuts, a synthetic identity with the documented successful-verification DOB/address values, and a sandbox-only service description. No real identity or bank information was used.

Automatic approval review initially rejected **Agree and submit** because the earlier platform approval did not cover this separate agreement. The user then explicitly approved the Connected Account Agreement, certification of the supplied test details and autodialed-text-message consent. The approved submission succeeded at approximately 22:26 UTC. Stripe reported both capabilities active; a real thin webhook updated the preview row to `READY` at 22:27:22 UTC before any app status refresh. The authenticated status endpoint subsequently returned `ready=true`, `requirementsDue=false`.

## Risk management

DriveDrop keeps control of release timing and dispute handling. The payout engine checks the canonical captured charge, amount, refunds, currency, sandbox mode, environment, booking ownership and account capabilities. It rejects a disputed or externally changed charge before a new transfer. Existing manual transfer reversals are reconciled into a held record; they never trigger a replacement transfer.

## Transporter experience

Account shows a Stripe payout setup card when the feature is enabled. Onboarding and bank details stay at Stripe; DriveDrop stores account identifiers, capability/status flags and an immutable creation request name/email snapshot. Links are returned only to the authenticated active transporter and are not emailed, logged or persisted.

The account card prompts for outstanding requirements and shows the latest account-level bank-payout status. A bank payout can combine several bookings, so it never serves as proof that a particular booking reached the bank. The admin screen distinguishes processing, release to Stripe and a payout needing attention. The existing `PAID` ledger value means platform release; Stripe rows explicitly label that as release to the Stripe balance.

For a later in-app account experience, Stripe recommends `notification_banner`, `account_onboarding` and `account_management`, with `payouts` for balance/payout views. The confirmed hosted flow currently uses a DriveDrop status/remediation prompt and Express for these activities. Platform-charge payment/dispute detail remains limited in connected-account components.

## Durable processing

- One `StripeConnectAccount` per user/environment, with stable account-creation idempotency and immutable creation inputs.
- One `StripePayout` per booking payment, with an immutable recipient, source charge, gross amount, reserved fine, net transfer and idempotency key.
- Commit the release instruction before calling Stripe. Reserve fines once under a transporter-level lock; failed attempts retain the same reservation until reconciled.
- Re-check booking/dispute eligibility under the shared booking lock at transfer creation. This serializes the release with application dispute/refund writes.
- Retrieve existing transfers by stored ID or unique transfer group before creation. Recover API timeouts and database-commit loss without another transfer.
- No new attempt after 23 hours unless an existing matching transfer is found; ambiguous old operations need review rather than relying on an expired Stripe idempotency key.
- Zero-net proceeds produce a settled fine-offset record without a zero-value Stripe transfer.
- A two-minute lease prevents overlapping workers. The existing preview scheduler handles one queued payout per run after customer-authorisation recovery. Requests are acknowledged with 202 before background work; accepted does not mean transferred.
- `PENDING` and `RETRY` releases are recovered automatically. Blocked/ambiguous operations require admin review/retry. Bank payout failure never recreates a booking transfer.
- Both new tables have RLS and no public/anon/authenticated privileges. Their amount/environment constraints and foreign keys retain financial records.

## Webhook integration

Signed events trigger canonical account, transfer and bank-payout retrieval; duplicate and out-of-order events cannot establish readiness or send a second transfer.

Configured in the approved sandbox:

1. Existing platform webhook `we_1USMj9LAzgkvCvrIzq4UAION`, `/api/stripe/webhook`, API `2024-06-20`: retained all six Checkout/PaymentIntent events and added `transfer.created`, `transfer.updated`, `transfer.reversed`.
2. Connected-account snapshot destination `we_1USOU7LAzgkvCvrIGrZUbMzB`, `/api/stripe/connect/webhook`, API `2026-09-30.endive`: `payout.created`, `payout.updated`, `payout.paid`, `payout.failed`, `payout.canceled`, with connected-account events enabled.
3. Accounts v2 thin-event destination `ed_test_61VbmRecTPCFvX0Rl16VbS9L66E94D44RaGMWQTQuVse`, `/api/stripe/connect/events`: `v2.core.account[requirements].updated`, `v2.core.account[future_requirements].updated`, `v2.core.account[configuration.recipient].capability_status_updated`, `v2.core.account.closed`; `events_from=["@self","@accounts"]`.

All three destinations are enabled. The two Connect handlers return 503 if the feature flag is false. Existing customer-payment events remain enabled and their handler is independent of the Connect feature flag.

Keep Vercel protection enabled. The approved automation bypass may be used on these preview webhook URLs; the entire URL is secret. Do not put the bypass value, API keys, signing secrets or account/login links in source or chat.

## Activation and credential scope

Only `acct_1US4BzLAzgkvCvrI` (drivedrop sandbox) is allowed. `STRIPE_CONNECT_ENABLED=true` is required; production remains blocked regardless of configuration. The SDK is pinned to Stripe Node 23.0.0 / API `2026-09-30.endive`; the existing customer-payment integration stays on its verified API version.

The **separate restricted sandbox key** `DriveDrop preview Connect payouts` (`mk_1USOOgLAzgkvCvrIOAF4iATu`) is created and its sandbox identity was verified. Its permissions cover only the operations used by this implementation:

- Read current platform account and PaymentIntents; write own-account Charges and Refunds (approved and verified 20 October).
- Create/read Accounts v2 recipient accounts; create Accounts v2 account links and Express login links.
- Create/read Transfers (including retrieval of reversals through their transfer).
- Read connected-account Payouts; no bank-payout creation permission is needed by the application.

The key was created through the approved Stripe Dashboard flow. The existing Checkout key was not widened. The new key is stored as sensitive `STRIPE_CONNECT_SECRET_KEY`, Preview / `feature/ui-polish` in project `prj_8BO4s7P2sffGKR4czg6nHOZqg4Ze`.

The snapshot and thin signing secrets are stored as sensitive `STRIPE_CONNECT_WEBHOOK_SECRET` and `STRIPE_CONNECT_EVENTS_SECRET` in the same branch scope. The code requires both webhook secrets and the existing recovery secret before making Connect API calls. These credentials are server-only. The feature flag was enabled last and remains enabled on the verified preview deployment. The existing customer-payment key, production configuration and UI design were not changed during this QA pass.

## Verification

Local tests with mocked Stripe/DB boundaries cover release rules, concurrent requests, one fine reservation, source-charge matching, network/response/commit loss, zero-net fines, new disputes, stale ambiguous attempts, account ownership/capabilities, live/environment/amount mismatches, reversal handling, admin authorization, 202 semantics and stale bank-event handling. Existing payout-policy, adjustable-dispute-fine and payment-recovery checks also passed. The final lock fix passed `test-stripe-connect.cjs`, `test-dispute-fines.cjs`, TypeScript and the Vercel production build. Mocks did not reveal the PostgreSQL result-type issue described below.

Nine deployed security probes passed: unsigned snapshot/thin rejection; signed snapshot/thin acceptance and duplicate acceptance; live-mode snapshot rejection; wrong-origin onboarding rejection; and rejection of a transporter calling the admin release endpoint. These synthetic signed probes alone do not prove Stripe event delivery.

### Actual sandbox flow, 19 October 2026

| Check | Evidence |
| --- | --- |
| Restricted-account release gate | Before onboarding submission, authenticated admin release returned 400: transporter must complete Stripe verification; no release instruction was created. |
| Hosted onboarding and real account event | Approved submission completed; canonical Stripe capabilities became active and the thin webhook independently set preview status to READY. |
| Customer payment | App quote selection created request `cmvfttcht0001l808vuq6oldb`. Hosted Checkout authorised £110 using Stripe's documented international test card that bypasses the pending balance. The actual transporter-confirm endpoint captured intent `pi_3USP4JLAzgkvCvrI0yXGZdWM`. |
| Release prerequisites | Only the synthetic booking was advanced to delivered/customer-confirmed beyond 24 hours. A £25 eligible dispute-fine ledger fixture was seeded. This pass tests reservation/deduction, not the already-tested dispute-fine input UI. |
| Correct release | Instruction `e0e4e44e-96db-4b79-909d-5d9a09496c89`: gross 10000p, fine 2500p, transfer 7500p. Stripe transfer `tr_3USP4JLAzgkvCvrI0KqInlQw` targets the synthetic account and source charge `ch_3USP4JLAzgkvCvrI08hgIgjL`; GBP and livemode=false verified. |
| Repeated/concurrent release | Two concurrent admin requests returned the same instruction with PAID status. Stripe returned exactly one transfer; the database held one fine application and one payout-completed event. |
| Lost database completion | Only this fixture's completion fields/event were reset while its external transfer and immutable fine reservation remained. The automatic cron run at 22:42:01 UTC recovered the same transfer, checked=1/failed=0. One transfer, fine application and completion event remained. |
| Express dashboard | App-created login link worked with Stripe's built-in test-code shortcut. Express visibly showed £75 earnings and £75 available balance. |
| Transfer reversal and real platform webhook | Full reversal `trr_1USPNDLAzgkvCvrIs385tUZ5` returned 7500p. The actual Stripe webhook changed the instruction to REVERSED and payment release to HELD. Another admin release stayed HELD on the same instruction. |
| Refund and cleanup | Refund `re_3USP4JLAzgkvCvrI0McOI7ga` succeeded for 11000p; canonical charge showed fully refunded. The connected-account dashboard showed £0 balance and £0 in transit before deletion; Accounts v2 then returned closed=true. All temporary application records and sessions were removed. |

The first real release attempts completed every Stripe read with HTTP 200 but failed before writing the payout instruction. PostgreSQL's advisory-lock function returns `void`, which Prisma cannot deserialize through `$queryRaw`. Casting that result to `text` preserved the transaction lock and fixed release on the deployed preview. Safe error-code logging was added to preparation failures; raw queries, parameters, payment details and Stripe error bodies are not logged.

### Earlier bank-payout verification checkpoint

Stripe Express returned **We couldn't load your account information** on both attempts to edit the existing GBP test bank. No bank details were changed and no bank payout was created. Real `payout.paid`/`payout.failed` delivery, canonical connected-account payout reads using the restricted key, and account-level remediation after a bank failure remain unverified. Keep this explicit limitation separate from the verified platform-to-transporter transfer. Do not treat the synthetic signed snapshot probe or Express's estimated payout date as a successful bank payout.

Once Stripe's test-bank management works, use a new disposable fixture to finish successful and failed bank-payout tests. Stripe-backed application refunds/disputes and reversal-failure recovery also remain a separate live-launch blocker; the manual QA reversal and refund above do not implement those product flows.

### Preservation and final state of the 19 October pass

- Original users: 16, fingerprint `cee2156e48900d3181a655803ab0d167`.
- Original bookings: 52, fingerprint `c71531a7810c2a5076f83f1dd45ae471`.
- Stored-file rows: 136, fingerprint `ebbe346597d33536e580807e5b9ccf1a`.
- Preview Connect-account rows, payout instructions and fixture sessions: zero after cleanup.
- All temporary users, verification/insurance metadata, job/quote/request/booking/payment, finance events and six synthetic notifications were removed. No storage files were created.
- Private QA credentials, cookies and onboarding/checkout/Express URLs were removed from temporary files. No live funds or production changes occurred.

## Rollback

Before any activation, the feature flag can remain absent/false. After activity begins, first stop new releases and reconcile pending operations with working credentials; only then disable the new destinations and key. Do not delete payout/account records with outstanding instructions, revoke the customer Checkout key, pause the customer-payment timer, or remove existing application data.
