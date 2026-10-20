# Stripe refund preparation — 20 October 2026

## Scope and current state

Durable refund execution is implemented on `feature/ui-polish`, including admin refunds/dispute resolutions, status notices, fine restoration, separate transfer recovery, webhook handling and the recovery scheduler. It is **disabled** unless `STRIPE_REFUNDS_ENABLED=true` and the existing sandbox Connect gates pass. No live or production activation is permitted by the code.

Migration `20261020193911_stripe_refund_sandbox` is applied to preview project `yozbuuvebzxitoqrvyer`. `StripeRefund` is empty, RLS is enabled and anon/authenticated access is revoked. The Supabase CLI install could not complete because its network approval was cancelled. The connected migration tool applied the reviewed SQL; its actual provider-generated migration version was then saved in the Prisma migration directory. No migration timestamp was invented.

The restricted Connect key still has Charges and Refunds **read** permission. The seven refund/charge-dispute webhook events are configured on the existing platform destination; all nine previous events remain enabled, and the URL, bypass and API version 2024-06-20 are unchanged. The activation flag remains absent/off. These gates and real Stripe verification must be completed before activation. Browser control timed out again while restoring documentation on this continuation; no further browser retry was made. There is no new customer charge, transfer, refund, bank payout or app session from this continuation.

## Implemented behavior and local verification

- Immutable source/accounting snapshots, a unique payment/refunded-balance version and one active instruction per payment prevent duplicate submissions. Conflicting requests return a refresh/review error.
- Booking locks, worker leases with ownership tokens, separately persisted first-attempt timestamps, stable Stripe idempotency keys and paginated refund/reversal recovery handle response or database-commit loss. Ambiguous creation beyond 23 hours requires review.
- Only a canonical successful refund updates payment amounts, restores applicable fines, resolves its dispute and creates durable in-app notifications. Pending, requires-action and failed refunds never count as completion. The async route returns HTTP 202 and the UI says confirmation is pending.
- Transfer recovery has an independent status and retry path. Insufficient balance leaves the confirmed customer refund intact, holds the payment and shows the recovery amount for review. Manual over-reversals never trigger a replacement transfer.
- Failed refund instructions retain their reservation for review. The app deliberately has no automatic replacement-refund or manual-ledger-repair control; operators must reconcile canonical Stripe state before a separate corrective change.
- Late transfer events cannot undo confirmed refund accounting. An unexpected later reversal holds the payment for review. Existing manual holds are preserved after partial refunds unless an approved dispute resolution authorises remaining proceeds.
- The original fixed cancellation fine remains £50. Adjustable dispute fines and their original values remain unchanged; refund restoration affects only amounts previously applied to the refunded payment.

Passed: `test-stripe-refund-policy.cjs`, `test-stripe-refunds.cjs`, `test-stripe-connect.cjs`, `test-payout-policy.cjs`, `test-dispute-fines.cjs`, `test-payout-fine-preview.cjs`, `test-admin-payout-polish.cjs`, TypeScript and a complete Next build. The build needed a clean scratch cache and a nonconnecting placeholder local database URL; no preview/production credentials were copied locally. New tests cover concurrency, lost refund/reversal responses and commits, partial/full sequential recovery, both fine ledgers, zero-net releases, pending/failed refunds, insufficient balance, stale attempts, unknown external refunds, canonical source checks, dispute confirmation, over-reversal, auth/origin/version gates and rendered status messages. They use mocks: **they are not real Stripe or browser end-to-end evidence**.

## Prepared accounting rules

- A Stripe refund instruction must have a captured GBP sandbox payment, a balanced ledger and the expected current refunded amount. Stale admin requests cannot become a second partial refund.
- Preserve the booking's recorded platform-fee proportion, including legacy rates. Use integer arithmetic to avoid penny errors at large values.
- A refund reduces transporter earnings. Existing fine deductions remain up to those remaining earnings. Any excess deduction must be restored to the outstanding fine ledger, with an audit record, only when Stripe confirms the refund. This changes the amount applied to this payment, never the original fixed cancellation fine or adjustable dispute-fine amount.
- For separate charges and transfers, the customer refund and recovery of transporter funds are distinct operations. Recover only the excess transfer beyond the new net entitlement, subtracting amounts already reversed.
- A manual over-reversal requires review. Never create a replacement transfer automatically.
- An unsettled payout instruction must be reconciled before a refund is prepared. Failed bank payouts must never create a replacement booking transfer.

Example: £110 paid = £10 recorded platform fee + £100 transporter gross. A £25 fine results in a £75 transfer. A £55 customer refund leaves a £5 fee, £50 transporter gross, £25 applied fine and £25 net entitlement. Recover £50 of the £75 transfer. A full £110 refund instead requires a £75 reversal and restoration of the £25 fine to outstanding deductions.

## Remaining activation and verification

1. Recover a responding Stripe browser session without repeated five-minute retries. Keep the existing zero-funded bank-test account; its secure post-login state is unknown.
2. Review and apply only the restricted Connect key's own-account Charges and Refunds write permission. Keep the existing Transfers write, connected Payouts read and all other scopes unchanged. Never substitute the legacy Checkout key or add Payouts write just for testing.
3. Verify delivery and handling of the newly configured `refund.created`, `refund.updated`, `refund.failed`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed` events. Platform endpoint `we_1USMj9LAzgkvCvrIzq4UAION` now has 16 enabled events; the existing nine, URL, bypass and API version were preserved. The connected-account and thin destinations are unchanged.
4. Enable `STRIPE_REFUNDS_ENABLED=true` only on `feature/ui-polish` for controlled synthetic QA. Verify actual full/partial refunds before and after release, pending/failed customer refunds, insufficient-balance recovery, repeated/stale events, refund/reversal permissions and scheduler recovery. Browser UI→API→Stripe→database verification is still pending.
5. Finish bank-payout success/failure testing through Stripe's supported UI, then reverse/refund synthetic funds, close zero-balance disposable accounts and remove only fixture data. Production remains untouched.

## Browser blocker and resumable test fixture

The separate bank-payout QA account is `acct_1USi72LAzgvhqEGk`, mapped to `dd_bank_20261020a_transporter`. It completed onboarding with Stripe's documented GBP `no_account` test bank and has received no funds. Express's payout settings showed a generic loading error. Browser calls then timed out twice after secure platform sign-in; sign-in completion is unverified. The original users/bookings/files remain unchanged, and the temporary app session/private links have been removed. Resume from a fresh observed browser state; do not repeat password/OTP entry based on the failed tool result alone. Bank payout success/failure remains unverified.

If Express bank editing continues to fail, investigate the supported hosted-onboarding update flow using a newly generated account link. Do not widen application Payout permissions merely for QA, use an unrelated account, or bypass a platform/authentication restriction.

Sources checked: Stripe [Connect testing](https://docs.stripe.com/connect/testing), [manual payouts](https://docs.stripe.com/connect/manual-payouts), [separate charges and transfers](https://docs.stripe.com/connect/separate-charges-and-transfers), [refunds and disputes](https://docs.stripe.com/connect/marketplace/tasks/refunds-disputes), and [refund creation](https://docs.stripe.com/api/refunds/create).
