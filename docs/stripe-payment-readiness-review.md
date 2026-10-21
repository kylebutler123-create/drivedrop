# Stripe payment readiness review — 21 October 2026

**Decision: continue controlled preview testing; do not activate live payments.** The exercised sandbox flows have substantial provider and browser evidence, but genuine insufficient-balance reversal failure/retry remains unverified. The current implementation deliberately rejects production payment use. This review does not change that boundary or authorize a production merge.

This pass made no Stripe money request, database mutation, configuration/permission change or production deployment. It changed only the refund test and documentation. The current feature preview was READY at `5450385275d5c1880899213864c2b22361e9f5cc`, deployment `dpl_3D5EXTikEHZ1WQZfCgkJE2MA1Cso`, feature alias only. The application code is equivalent to the previously verified `2a670bf58ccb5eddc10a4a3a369612ebe6f1bcea` build.

## Insufficient-balance investigation

A fresh sandbox account read confirms platform `acct_1US4BzLAzgkvCvrI` and connected account `acct_1USi72LAzgvhqEGk`, Express dashboard, `controller.losses.payments=application`. Its daily payout schedule, seven-day delay and `debit_negative_balances=true` remain as read. No account setting was changed.

[Stripe's dispute guidance](https://docs.stripe.com/connect/disputes) identifies insufficient-balance reversal failures when Stripe bears connected-account negative-balance responsibility. Its [balance guidance](https://docs.stripe.com/connect/account-balances) describes platform reserves when the platform bears that responsibility. This is consistent with our earlier zero-available-balance reversal succeeding and taking the synthetic account to -£1; it does not prove this account can never experience a reversal failure.

The current [Connect testing guide](https://docs.stripe.com/connect/testing), [reversal-create reference](https://docs.stripe.com/api/transfer_reversals/create), documentation search and API operation search did not establish a supported switch/helper to force this exact failure under the unchanged configuration. Payout/top-up failure tokens exercise different operations. No further payment was created merely to repeat the already successful zero-balance experiment. This is an unresolved provider-testing dependency, not a pass and not proof that reproduction is impossible.

### Verified local handling

`scripts/test-stripe-refunds.cjs` now injects the installed Stripe SDK's `StripeInvalidRequestError` carrying `balance_insufficient`, rather than an already-normalized application error. It verifies the error mapping together with these outcomes:

- The customer refund stays SUCCEEDED and its confirmed amount/ledger timestamp remain unchanged; payout stays HELD and recovery is REVIEW.
- Scheduled reconciliation does not repeatedly issue money requests for a REVIEW case. The administrator's existing **Check refund / recovery status** action can reconcile that same instruction while sandbox refunds are enabled.
- Repeated unsuccessful reconciliation preserves the original accounting and notices. A simulated successful provider response creates one reversal and one recovery event, clears the reservation and cancels the fully refunded payout, without a second customer refund or notices.
- Reversal attempts keep the same idempotency key. After the existing 23-hour safe-create window, the app stops for review instead of creating a new reversal, even when the simulated provider would accept it.

The refund suite passes with these stronger assertions. The Connect and refund-policy suites also passed during this review. No application behavior changed, so a new application build was not required for these test/documentation edits. This local simulation does **not** prove actual Stripe insufficient-balance responses, cached error behavior or recovery after real funds arrive. Those remain part of the provider gate.

## Evidence matrix

| Area | Evidence status | Boundary |
| --- | --- | --- |
| Authorisation, 3DS, decline, withdrawal, expiry and capture | Real sandbox checks passed in [checkout setup](stripe-sandbox-setup.md) | Some recovery states were reconstructed; do not call every case a complete browser journey |
| Connect onboarding, release gates and transporter transfers | Sandbox evidence recorded in [Connect progress](stripe-connect-sandbox.md) | Sandbox capability behavior does not certify live account readiness |
| Partial/full refunds, before/after-transfer recovery and fine restoration | Real sandbox checks passed in [refund progress](stripe-refund-preparation.md) | Includes bounded synthetic fixtures, not live settlement |
| Bank payout success and failure | Actual sandbox webhook outcomes verified | Does not establish an insufficient-balance transfer-reversal error |
| Late refund failure and real card-dispute events | Canonical reconciliation and preserved accounting verified | The original failed £110 case remains unsettled and held |
| Lost refund and reversal responses | Actual interrupted responses, idempotent retries and recovery verified | [Reversal evidence](evidence/stripe-reversal-network-verification.json) records the exact scope |
| Alternative repayment recording | Actual administrator flow and private-evidence download passed | QA21 ALT's £1.10 alternative settlement is explicitly simulated; [evidence](evidence/stripe-alternative-refund-e2e-verification.json) |
| Insufficient-balance reversal failure/retry | Local handling passes; genuine provider outcome UNVERIFIED | Needs a Stripe-supported reproduction method or explicit confirmation of the limitation |
| Production payment configuration | NOT implemented/verified for activation | Preview-only guards, restricted test keys and sandbox account checks intentionally remain |

## Current operational checks

At **18:14 BST** (17:14 UTC), the five most recent preview dispatches and workers had succeeded with zero failures; these were idle scans (`checked=0`), not new transaction tests. `STRIPE_REFUNDS_ENABLED=false` is still scoped to Preview / `feature/ui-polish`, with unchanged update timestamp `1792547509076`.

Production still resolves to `dpl_B4bCCxXTQT3EECVXJT6CF2cC6YUz`, SHA `8b87d8c66bd9fcca3f7f4716366cd6ea9b86485c`, and its three original aliases. No production deployment or live payment was made.

Thirty original business/storage table fingerprints match the prior QA21 ALT checkpoint, excluding only that test's already-recorded new rows. `Session` still has one row but differs from the earlier fingerprint: the current active administrator session was created at **17:40 BST** (16:40 UTC), between checkpoints. This review neither created nor changed a session and did not read its token/hash value. Do not report all 31 hashes as unchanged. The original £110 payment is still PAID / 0p refunded / HELD with its failed instruction reserved. QA21 ALT is still REFUNDED / 110p reimbursed / CANCELLED, with exactly one immutable alternative audit. Both fixtures remain retained.

[Exact fresh projections and fingerprints](evidence/stripe-payment-readiness-review.json).

## Before live activation

1. Close or explicitly disposition the genuine insufficient-balance provider gate. Obtain the supported reproduction/retry behavior below; keep its status unverified until evidence supports changing it.
2. Prepare and review a production payment implementation/configuration plan. Current code pins the sandbox account, requires restricted test keys and denies production. A single environment-flag toggle cannot enable a valid live integration. Specify separate live account/keys, live webhooks and recovery scheduling, connected-account readiness checks, failure monitoring and rollback before implementation. No secrets belong in this document.
3. Diff the prepared production database against the latest preview schema and migrations before any cutover. The [19 October production preparation](production-database-preparation.md) predates subsequent Connect/refund/alternative-audit work. Preserve preview data and credentials; do not copy synthetic financial history into production. Complete secure administrator bootstrap and application-level storage/role checks in the intended production configuration.
4. Run the final browser journey through customer, transporter and administrator controls with collection/delivery/dispute/payout rules, without database shortcuts for the behavior being certified. Check email delivery separately; existing in-app notifications and best-effort email attempts are not an email delivery guarantee.
5. Obtain explicit approval for the exact production release and any bounded live payment verification. Preserve the retained £110 failed fixture and immutable QA21 ALT audit; neither is production seed data or authorized for deletion/settlement.

## Question prepared for Stripe Support — not sent

Our UK GBP marketplace uses separate charges and transfers in a Stripe sandbox. Its connected account has an Express dashboard and `controller.losses.payments=application`. A £1 reversal succeeded with £0 available balance and temporarily made the connected balance -£1. We want to verify the customer-refund-success / transfer-recovery-failure path without changing liability, reserves or payout permissions.

Is a `balance_insufficient` reversal failure reachable for this configuration? If so, what supported sandbox scenario or helper reliably produces it, and how should we fund and retry it? Please also confirm whether an insufficient-balance HTTP error is cached under the reversal idempotency key, and the supported retry procedure after funds become available. If there is no faithful sandbox reproduction for this setup, please confirm the expected behavior and test limitation. We have not treated a successful zero-balance reversal or a local SDK-error simulation as proof of the failure path.
