# Stripe Connect sandbox implementation

## Status

Implementation is prepared on `feature/ui-polish`. It is **not activated**: the dedicated restricted Connect credential and two new event destinations have not been configured. Real Stripe onboarding, transfers and bank-payout tests must pass after activation; local simulated tests are not a substitute for these checks. Existing sandbox customer Checkout remains active. The additive migration `20261019213129_stripe_connect_sandbox` is applied to shared preview database `yozbuuvebzxitoqrvyer`; both new tables are empty. Client-role access is denied and RLS is enabled. All 16 users, 52 bookings and 136 stored-file rows retain their exact pre-change fingerprints.

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

Activation requires:

1. Existing platform webhook `/api/stripe/webhook`: keep the current six Checkout/PaymentIntent events and add `transfer.created`, `transfer.updated`, `transfer.reversed`.
2. Connected-account snapshot destination `/api/stripe/connect/webhook`: `payout.created`, `payout.updated`, `payout.paid`, `payout.failed`, `payout.canceled`, connected-account events enabled.
3. Accounts v2 thin-event destination `/api/stripe/connect/events`: account requirements and recipient-capability changes, with connected-account event context as required by the Accounts v2 event configuration.

Keep Vercel protection enabled. The approved automation bypass may be used on these preview webhook URLs; the entire URL is secret. Do not put the bypass value, API keys, signing secrets or account/login links in source or chat.

## Activation and credential scope

Only `acct_1US4BzLAzgkvCvrI` (drivedrop sandbox) is allowed. `STRIPE_CONNECT_ENABLED=true` is required; production remains blocked regardless of configuration. The SDK is pinned to Stripe Node 23.0.0 / API `2026-09-30.endive`; the existing customer-payment integration stays on its verified API version.

Create one **separate restricted sandbox key**, named `DriveDrop preview Connect payouts`. Grant only the operations used by this implementation:

- Read current platform account, PaymentIntents and Charges.
- Create/read Accounts v2 recipient accounts; create Accounts v2 account links and Express login links.
- Create/read Transfers (including retrieval of reversals through their transfer).
- Read connected-account Payouts; no bank-payout creation permission is needed by the application.

The Stripe connector does not expose restricted-key creation; dashboard access is needed for that step. Do not widen the existing Checkout key or reuse a live key. Store the new key only as sensitive `STRIPE_CONNECT_SECRET_KEY`, Preview / `feature/ui-polish` in project `prj_8BO4s7P2sffGKR4czg6nHOZqg4Ze`.

Save the snapshot and thin signing secrets as sensitive `STRIPE_CONNECT_WEBHOOK_SECRET` and `STRIPE_CONNECT_EVENTS_SECRET` in the same branch scope. The code requires both webhook secrets and the existing recovery secret before making Connect API calls. These credentials are server-only. Set the feature flag last and redeploy the preview.

## Verification

Passed locally with mocked Stripe/DB boundaries: release rules, concurrent clicks, single fine reservation, correct net transfer/source charge, network failure, Stripe success with a lost response, Stripe success with a lost database commit, repeat reconciliation, zero-net fines, a newly opened dispute, old ambiguous attempts, account ownership/capabilities, live/environment/amount mismatches, reversal reconciliation, admin authorization, 202 semantics, unsigned-webhook rejection and stale bank-event handling.

Existing payout-policy, fine-preview, adjustable-dispute-fine and payment-recovery checks passed. TypeScript and the Next production build passed with a dummy localhost DB URL. This build did not access the shared database.

After activation, use isolated synthetic users/bookings to verify real Stripe-hosted onboarding, transfer amounts, repeated release, restricted accounts, webhook delivery, automatic recovery and bank-payout failures. Reconcile/refund/reverse test money before removing fixtures. Preserve all existing users, bookings and files. Capture baseline/final fingerprints as in `stripe-sandbox-setup.md`.

## Rollback

Before any activation, the feature flag can remain absent/false. After activity begins, first stop new releases and reconcile pending operations with working credentials; only then disable the new destinations and key. Do not delete payout/account records with outstanding instructions, revoke the customer Checkout key, pause the customer-payment timer, or remove existing application data.
