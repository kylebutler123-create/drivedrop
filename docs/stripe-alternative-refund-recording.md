# Alternative refund recording — preview implementation

21 October 2026. The user approved the desktop form and implementation on `feature/ui-polish`. This is a record of money **already received by the customer**, not a payment command. Production remains disabled. The original failed £110 fixture is deliberately **not settled** by this work.

## Administrator flow

Open the eligible held payout and choose **Record alternative refund**. A read-only preflight checks the configured sandbox account, captured source, terminal failed refund, complete bounded refund/transfer history and booking state. No evidence or accounting is written by opening the form.

The administrator supplies method, settlement date, unique reference, PDF/JPG/PNG evidence (maximum 3 MB), optional note and explicit confirmation that the customer has received the full amount. The second step reviews the exact details and explains that the record is immutable. The final submission repeats canonical Stripe checks while holding the booking lock.

The first release supports only one terminal **full** refund with zero previously refunded balance, no app or matching canonical transporter transfer, no deduction/recovery, no dispute history and no unrelated prior payout hold. Partial settlements and other cases stop for separate review. Opening the form is not evidence that repayment has happened.

## Accounting and evidence

- `AlternativeRefund` is an immutable, server-only audit linked to payment, failed instruction and active administrator. Evidence bytes are bounded and committed in the same transaction, avoiding orphan uploads or a successful record without its proof. No storage bucket or public policy changed.
- `BookingPayment.refundedPence` now explicitly represents **combined customer reimbursement**. The alternative record identifies the external amount; canonical Stripe reconciliation subtracts it. The screen separately displays Stripe-refunded and alternative-repaid totals.
- A complete recording zeros fee/proceeds, makes the payment REFUNDED, cancels transporter entitlement and releases only the resolved refund reservation. The original FAILED state, failure code, ledger timestamp and attempt count remain intact.
- One finance event and one in-app notice per party commit atomically. This flow adds no email delivery guarantee. Payment ID, failed refund ID, normalized reference hash and evidence hash have unique constraints. A stable request ID and payload hash make same-submission retries safe after an interrupted reply.
- Database guards reject audit edits/deletes, incomplete commits, stale ledger overwrites and renewed payout eligibility. Later unexpected Stripe events may hold the payment for review without overwriting the external repayment or sending another refund.
- Evidence downloads require an active administrator, are attachments with `private, no-store`, and never appear in general payment payloads. The new table has RLS and no anon/authenticated privileges or policies. The advisor's informational “RLS enabled, no policy” is intentional deny-all, not a new exposure ([Supabase explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)).

Repository migration: `20261021125850_alternative_refund`; applied only to preview `yozbuuvebzxitoqrvyer` as Supabase migration `20261021131534 / alternative_refund`. No original row or column was rewritten.

## Verification

The new unit/API tests cover atomic evidence/accounting, read-only preflight, duplicate/concurrent requests, lost replies and rollback, file/date/reference validation, reference/evidence reuse, admin/Origin/environment gates, canonical mismatches, stale reads, incomplete history and transfer/dispute/partial-settlement rejection. Existing refund tests now prove later stale events preserve separate Stripe/external totals with refunds on and off, while new external inconsistencies hold without another repayment.

`scripts/sql/verify-alternative-refund.sql` passed 11 actual PostgreSQL trigger/transaction checks using new disposable IDs inside a rolled-back transaction. The 19 lifecycle-expression cases also passed. No test row or alternative repayment remains in the database. All 31 full original table/storage counts and fingerprints match the saved baseline.

TypeScript, the complete Next build, alternative/refund/policy/Connect/payout/fine-preview/admin-payout tests pass. The build uses documented `CHECKPOINT_DISABLE=1` and `NEXT_TELEMETRY_DISABLED=1` opt-outs after optional tool telemetry was blocked. The unrelated, unmodified `test-transporter-proceeds.cjs` harness currently fails resolving `./payout-policy`; this is not counted as a pass.

## Boundaries and remaining verification

No real bank payment, Stripe create/refund/transfer/reversal, secret read, permission change, production release, original-fixture settlement, notification delivery or cleanup is part of this implementation pass. `STRIPE_REFUNDS_ENABLED=false` remains unchanged. Recording is independently enabled only in the already-configured Connect preview/development environment; it makes Stripe reads only.

Browser opening/preflight and final deployment evidence are recorded in the main sandbox/refund progress documents. A **committed end-to-end simulated repayment on a separate disposable Stripe scenario** remains a separately bounded next test; unit mocks and rolled-back SQL checks do not claim that result. Never use the preserved £110 fixture for it. Genuine insufficient-balance reversal failure/retry remains a different open gate under the existing account configuration.
