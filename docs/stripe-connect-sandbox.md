# Stripe Connect sandbox implementation

## Status

Implementation and credentials are configured on `feature/ui-polish`. The user explicitly approved the platform liability acknowledgement on 19 October 2026, and Stripe now shows it completed. `STRIPE_CONNECT_ENABLED=true` is active on preview deployment `dpl_6AtJ4yuv8RFvUXHAzTaQPvvbAiqa` (commit `fa25b3bb7d10ba7067db6cf2e24aad7237b20d47`, preview target only). Account creation and the hosted test identity/bank steps work. Final onboarding submission is awaiting separate approval for Stripe's Connected Account Agreement. Transfers and bank-payout tests remain incomplete; local simulated tests are not a substitute for these checks.

Existing sandbox customer Checkout remains active. The additive migration `20261019213129_stripe_connect_sandbox` is applied to shared preview database `yozbuuvebzxitoqrvyer`. Client-role access is denied and RLS is enabled. All 16 original users, 52 bookings and 136 stored-file rows retain their exact pre-change fingerprints. One synthetic transporter and its pending Connect row are retained to resume onboarding; all other new fixtures and sessions were removed. There are no Stripe payout instructions and no test funds were moved.

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

### Current hosted-onboarding approval blocker

The synthetic transporter `dd_connect_20261019b_transporter` maps to account `acct_1USOoTLAzgOujhnB` and DB row `89cb4cef-ba6a-4f63-a525-f55ebc48c37b`. Hosted onboarding reached **Review and submit** using Stripe's built-in test phone/code and test bank shortcuts, a synthetic identity with the documented successful-verification DOB/address values, and a sandbox-only service description. No real identity or bank information was used.

Automatic approval review rejected the final **Agree and submit** click because it accepts the separate **Connected Account Agreement**, certifies the supplied details and includes autodialed-text-message consent; approval for the earlier platform acknowledgement does not cover it. The click was not completed. Obtain approval for this exact final submission for the synthetic sandbox transporter before continuing; do not submit attestations through an API or use another route around the rejection. The live browser review page is retained for resumption.

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

- Read current platform account, PaymentIntents and Charges.
- Create/read Accounts v2 recipient accounts; create Accounts v2 account links and Express login links.
- Create/read Transfers (including retrieval of reversals through their transfer).
- Read connected-account Payouts; no bank-payout creation permission is needed by the application.

The key was created through the approved Stripe Dashboard flow. The existing Checkout key was not widened. The new key is stored as sensitive `STRIPE_CONNECT_SECRET_KEY`, Preview / `feature/ui-polish` in project `prj_8BO4s7P2sffGKR4czg6nHOZqg4Ze`.

The snapshot and thin signing secrets are stored as sensitive `STRIPE_CONNECT_WEBHOOK_SECRET` and `STRIPE_CONNECT_EVENTS_SECRET` in the same branch scope. The code requires both webhook secrets and the existing recovery secret before making Connect API calls. These credentials are server-only. The feature flag was enabled last and the preview redeployed after platform acknowledgement. Continue isolated QA after approval of the pending connected-account submission.

## Verification

Passed locally with mocked Stripe/DB boundaries: release rules, concurrent clicks, single fine reservation, correct net transfer/source charge, network failure, Stripe success with a lost response, Stripe success with a lost database commit, repeat reconciliation, zero-net fines, a newly opened dispute, old ambiguous attempts, account ownership/capabilities, live/environment/amount mismatches, reversal reconciliation, admin authorization, 202 semantics, unsigned-webhook rejection and stale bank-event handling.

Existing payout-policy, fine-preview, adjustable-dispute-fine and payment-recovery checks passed. TypeScript and the Next production build passed with a dummy localhost DB URL. This build did not access the shared database.

Deployed preview `dpl_JBcRaE5mGYkz6gne3xUVHMGRLUc9` reached READY with the feature enabled. Anonymous account-status access returned 403; the isolated transporter saw `NOT_STARTED`. All nine security probes passed: unsigned snapshot/thin rejection; signed snapshot/thin acceptance and duplicate acceptance; live-mode snapshot rejection; wrong-origin onboarding rejection; and rejection of a transporter trying the admin release endpoint. These were synthetic signed requests and do not establish actual Stripe event delivery or financial-flow correctness.

Stripe then rejected real onboarding at account creation with the liability error above. Three temporary QA users, their sessions and the single incomplete account-creation row were removed. There are no remaining Connect accounts or payout instructions in the preview DB and no test funds to unwind from this attempt. Baseline fingerprints after cleanup: users `cee2156e48900d3181a655803ab0d167`, bookings `c71531a7810c2a5076f83f1dd45ae471`, stored files `ebbe346597d33536e580807e5b9ccf1a`.

After the platform acknowledgement, the second attempt created the sandbox account successfully and returned a hosted onboarding link. The deployed status endpoint reports `PENDING`, `ready=false`, `connected=true`. An authenticated admin release against a disposable synthetic booking was rejected with HTTP 400, **The transporter must complete Stripe verification before release.** No payout instruction was created. This verified the readiness gate only; that fixture had no real Stripe charge. The fixture booking/payment/job/quote, verification fixtures, temporary customer/admin and all three app sessions were removed. Only the pending transporter and its Connect row remain. Fingerprints of all original users/bookings/files still match the baseline above.

After activation, use isolated synthetic users/bookings to verify real Stripe-hosted onboarding, transfer amounts, repeated release, restricted accounts, webhook delivery, automatic recovery and bank-payout failures. Reconcile/refund/reverse test money before removing fixtures. Preserve all existing users, bookings and files. Capture baseline/final fingerprints as in `stripe-sandbox-setup.md`.

## Rollback

Before any activation, the feature flag can remain absent/false. After activity begins, first stop new releases and reconcile pending operations with working credentials; only then disable the new destinations and key. Do not delete payout/account records with outstanding instructions, revoke the customer Checkout key, pause the customer-payment timer, or remove existing application data.
