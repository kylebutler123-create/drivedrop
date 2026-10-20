# Stripe refund preparation — 20 October 2026

## Scope and current state

The existing admin refund and dispute-refund endpoints still reject Stripe payments. This preparation does not change those routes, the UI, the deployed preview, database schema, webhook configuration or API-key permissions. Production and live money remain disabled.

`src/lib/stripe-refund-policy.ts` is a pure calculation/validation module for the next implementation. `scripts/test-stripe-refund-policy.cjs` checks amount conservation, partial/full refunds, fine treatment, sequential recovery, over-reversals, invalid/stale requests, canonical refund matching and the 23-hour create-retry limit. These are local policy checks, not evidence of an actual Stripe refund or bank payout.

## Prepared accounting rules

- A Stripe refund instruction must have a captured GBP sandbox payment, a balanced ledger and the expected current refunded amount. Stale admin requests cannot become a second partial refund.
- Preserve the booking's recorded platform-fee proportion, including legacy rates. Use integer arithmetic to avoid penny errors at large values.
- A refund reduces transporter earnings. Existing fine deductions remain up to those remaining earnings. Any excess deduction must be restored to the outstanding fine ledger, with an audit record, only when Stripe confirms the refund. This changes the amount applied to this payment, never the original fixed cancellation fine or adjustable dispute-fine amount.
- For separate charges and transfers, the customer refund and recovery of transporter funds are distinct operations. Recover only the excess transfer beyond the new net entitlement, subtracting amounts already reversed.
- A manual over-reversal requires review. Never create a replacement transfer automatically.
- An unsettled payout instruction must be reconciled before a refund is prepared. Failed bank payouts must never create a replacement booking transfer.

Example: £110 paid = £10 recorded platform fee + £100 transporter gross. A £25 fine results in a £75 transfer. A £55 customer refund leaves a £5 fee, £50 transporter gross, £25 applied fine and £25 net entitlement. Recover £50 of the £75 transfer. A full £110 refund instead requires a £75 reversal and restoration of the £25 fine to outstanding deductions.

## Required integration before activation

1. Add a server-only durable refund instruction with an immutable amount/source/recipient snapshot, stable idempotency key, optimistic refunded-balance version, attempt timestamp, lease, Stripe refund/reversal IDs and separate customer-refund/recovery statuses. Add RLS, deny client roles, and reserve one active instruction under the existing booking lock.
2. Verify the canonical parent PaymentIntent/charge against the booking request and sandbox before creation. A Stripe v1 Refund has no `livemode` property; its parent must establish sandbox ownership. Detect external refunds or charge disputes and require reconciliation.
3. Recover an existing refund from its stored ID or paginated charge-refund list and matching metadata before any create retry. An old ambiguous create attempt must go to review after 23 hours. `pending` or `requires_action` is not success; `failed` or `canceled` must not change the confirmed refunded ledger.
4. Only after canonical success, atomically apply accounting and any fine-deduction restoration once. Cancellation deduction rows require positive amounts, so a fully restored row needs a preserved audit event before removal. Dispute-fine applied events also need an auditable restoration scheme. Do not delete the original fine or change its amount.
5. Persist transfer-recovery work separately. Insufficient transporter funds must leave an explicit unrecovered amount for admin review; never claim recovery succeeded. Do not reissue a customer refund while retrying a transfer reversal.
6. Connect admin refunds/dispute resolutions to the durable worker, webhook handlers and the existing recovery scheduler. A dispute remains unresolved until the customer-refund outcome is confirmed. Keep already-released funds held for recovery review as appropriate. Update UI response messages so HTTP 202 never says the refund completed.
7. Add a separate preview activation flag. Review the smallest restricted-key permission change needed for Refunds write (the existing Connect key has Charges and Refunds read) and add `refund.created`, `refund.updated`, `refund.failed` and relevant charge-dispute reconciliation events to the existing platform destination. Preserve the Checkout key and production scope. Do not activate before permissions, durable recovery and event handling are verified.
8. Exercise real sandbox full/partial refunds before release, post-release recovery, insufficient balance, lost responses/database commits, repeated requests, stale events, fine restoration and the UI→API→Stripe→database flow. Reconcile all synthetic funds before removing fixtures.

## Browser blocker and resumable test fixture

The separate bank-payout QA account is `acct_1USi72LAzgvhqEGk`, mapped to `dd_bank_20261020a_transporter`. It completed onboarding with Stripe's documented GBP `no_account` test bank and has received no funds. Express's payout settings showed a generic loading error. Browser calls then timed out twice after secure platform sign-in; sign-in completion is unverified. The original users/bookings/files remain unchanged, and the temporary app session/private links have been removed. Resume from a fresh observed browser state; do not repeat password/OTP entry based on the failed tool result alone. Bank payout success/failure remains unverified.

If Express bank editing continues to fail, investigate the supported hosted-onboarding update flow using a newly generated account link. Do not widen application Payout permissions merely for QA, use an unrelated account, or bypass a platform/authentication restriction.

Sources checked: Stripe [Connect testing](https://docs.stripe.com/connect/testing), [manual payouts](https://docs.stripe.com/connect/manual-payouts), [separate charges and transfers](https://docs.stripe.com/connect/separate-charges-and-transfers), [refunds and disputes](https://docs.stripe.com/connect/marketplace/tasks/refunds-disputes), and [refund creation](https://docs.stripe.com/api/refunds/create).
