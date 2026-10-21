# Failed £110 sandbox refund — recovery review

**Update, 21 October 2026:** the user subsequently approved the displayed form and implementation. The preview-only implementation and additive schema are described in [alternative-refund recording](stripe-alternative-refund-recording.md). This supersedes the design-only status below, not the preservation requirement: no repayment has been recorded on this fixture, and its original reservation/hold/history remain unchanged. A committed isolated simulation is still a separate bounded test.

Reviewed 21 October 2026, 02:10 UTC, on `feature/ui-polish` at `138446b610329dd793cbceccef6e6b6c593eaf6c`. This was a read-only review of sandbox `acct_1US4BzLAzgkvCvrI`, `livemode=false`, and preview database `yozbuuvebzxitoqrvyer`. [Exact projected evidence](evidence/stripe-failed-refund-review.json).

## Finding

The retained payment used Stripe's documented asynchronous refund-failure test card, ending **5126**. Its refund is expected to appear successful and later fail. The existing late-failure correction is working: Stripe and DriveDrop both now show **£0 successfully refunded**, and the transporter payout is **HELD**.

There is no supported successful retry or different-card refund method established for this captured failure-test charge. Stripe documents that a refund goes back to the original payment method; a terminal failed refund requires an alternative way to repay the customer. Repeatedly submitting this fixture is not a valid proposed recovery. This is simulated sandbox money; no real repayment is called for.

## Fresh reconciliation

| Item | Verified state |
| --- | --- |
| PaymentIntent | `pi_3USjwcLAzgkvCvrI15yEcbMR`, succeeded, GBP 11000p received, livemode false |
| Charge | `ch_3USjwcLAzgkvCvrI1oqvK6Qk`, captured 11000p, amount_refunded 0, refunded false, disputed false, card ending 5126 |
| Canonical refund history | Exactly one refund; `re_3USjwcLAzgkvCvrI1EI8LdZI`, failed, 11000p, `expired_or_canceled_card` |
| Stripe balance entries | Original refund debit -11000p and failure credit +11000p, net zero; both pending with available_on 27 October. This does not establish currently available funds. |
| DriveDrop payment | `cmvh5nyop0002l507vqfjq5fl`, PAID, refunded 0p, fee 1000p, proceeds 10000p, deduction 0p, payout HELD |
| DriveDrop instruction | `983a6c2d-474b-47bf-b564-8f10559cd308`, FAILED / STRIPE_REFUND_FAILED_AFTER_SUCCESS, active payment reservation retained, attempt count 1, no retry or lease |
| Original ledger | ledgerAppliedAt remains 20 October 20:51:33.321 UTC; original +11000p refund event retained |
| Correction | One -11000p failure correction event at 22:08:06.781 UTC; one corrective notice per synthetic party |
| Transporter transfer | No app payout row; all seven sandbox transfers read, no source-charge or payment/booking-metadata match, no further page |
| Refund switch | STRIPE_REFUNDS_ENABLED=false, Preview / feature/ui-polish |
| Data preservation | All 31 full table/storage counts and fingerprints match the prior completed checkpoint, without exclusions |

The current preview at review was READY deployment `dpl_DXQ6mTvrtVH7FA4aZvGa9eXWQQyi`, with only the feature-branch alias. No Stripe write, environment update, application/database mutation, secret read, payout release, notification send or fixture deletion was performed. Documentation publication may create an ordinary disabled preview build.

## Prepared recovery decision

**For this fixture now:** retain the original failed instruction, payment reservation, payout hold, success/correction audit and notices. Its late-failure accounting check is verified; its simulated customer repayment is still unsettled. Do not relabel the Stripe refund as successful, delete the fixture, clear the hold, or make a new charge to disguise settlement. The existing preservation/settlement requirement remains in force.

**For a real terminally failed customer refund:** arrange and independently confirm an alternative repayment, then record it in DriveDrop with an audit trail. The current application does not implement that completion path:

- `prepareStripeRefund` returns the existing instruction for the same payment/refunded balance.
- `reconcileStripeRefund` returns terminal FAILED/late-failure instructions without a new Stripe refund.
- The administrator's existing status-check control is hidden for FAILED instructions.
- Dispute outcome notes do not record financial settlement and are restricted to already-paid transporter payouts.
- The simulated TEST-provider refund path expressly rejects Stripe payments.

A replacement Stripe refund request is therefore **not prepared for approval**. The concrete next product step is to review an administrator **Record alternative refund** flow before implementation.

## Proposed administrator flow — design only

1. Show the original payment, failed refund, current amount owed and held transporter proceeds. Re-read canonical Stripe history immediately before recording, and stop on a pending/successful new refund, changed balance, active dispute, unresolved recovery or inconsistent ledger.
2. Require the amount, repayment method, payment reference, settlement date, evidence and administrator confirmation that repayment has completed. For this full-refund scenario the amount is **£110.00**. No real banking details or real repayment are needed for a future sandbox simulation.
3. Create a separate immutable alternative-settlement record, linked to the failed refund and administrator, with duplicate/reference controls and the existing booking transaction lock. Preserve the original Stripe refund's FAILED state and ledger timestamp.
4. Keep Stripe-refunded and externally repaid amounts separately identifiable. Update combined customer settlement and remaining entitlement once. Do **not** simply set the current Stripe-refunded total to £110 while the canonical charge remains £0: `sourceState` currently compares those figures, so the accounting/reconciliation model must explicitly support external settlement.
5. After a separately verified full £110 alternative repayment, the target business outcome is fully repaid customer, £0 remaining fee/proceeds for this booking, cancelled transporter entitlement and no transfer/reversal required. Release only the resolved refund reservation, preserving any unrelated hold. Display **Repaid by alternative method**, retain **Stripe refund failed** in history, and issue once-only outcome notices. This state has **not** been applied.
6. Before deployment, verify authorization/origin checks, duplicate submissions, stale canonical reads, later Stripe events, partial settlements, outstanding transfer recovery and exactly-once accounting. Keep the existing fixture unchanged; use a separately approved disposable scenario for any simulation.

This proposal does not authorize implementation, a bank transfer, a simulated settlement, a new refund, notification delivery or cleanup. Any desktop UI change should be shown for review first.

## Separate remaining check

Genuine insufficient-balance transfer-reversal failure/retry remains unverified. The current connected account assigns payment losses to the application, and a prior zero-balance reversal succeeded. Seek a Stripe-supported reproduction under the approved configuration; do not change liability/reserves, add permissions or repeat the successful zero-balance test and count it as failure evidence.

## Sources checked

- [Stripe asynchronous refund test cards](https://docs.stripe.com/testing#refunds).
- [Refund destinations](https://docs.stripe.com/refunds#refund-destinations).
- [Handling failed refunds](https://docs.stripe.com/refunds#failed-refunds).
- Local `src/lib/stripe-refunds.ts`, `src/app/api/admin/payments/refund/route.ts`, `src/app/api/admin/disputes/route.ts`, `src/components/StripeRefundNotice.tsx` and Prisma schema.

