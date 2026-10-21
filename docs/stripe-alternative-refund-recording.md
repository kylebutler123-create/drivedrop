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

## Implementation verification before the committed browser test

The new unit/API tests cover atomic evidence/accounting, read-only preflight, duplicate/concurrent requests, lost replies and rollback, file/date/reference validation, reference/evidence reuse, admin/Origin/environment gates, canonical mismatches, stale reads, incomplete history and transfer/dispute/partial-settlement rejection. Existing refund tests now prove later stale events preserve separate Stripe/external totals with refunds on and off, while new external inconsistencies hold without another repayment.

`scripts/sql/verify-alternative-refund.sql` passed 11 actual PostgreSQL trigger/transaction checks using new disposable IDs inside a rolled-back transaction. The 19 lifecycle-expression cases also passed. No test row or alternative repayment remains in the database. All 31 full original table/storage counts and fingerprints match the saved baseline.

TypeScript, the complete Next build, alternative/refund/policy/Connect/payout/fine-preview/admin-payout tests pass. The build uses documented `CHECKPOINT_DISABLE=1` and `NEXT_TELEMETRY_DISABLED=1` opt-outs after optional tool telemetry was blocked. The unrelated, unmodified `test-transporter-proceeds.cjs` harness currently fails resolving `./payout-policy`; this is not counted as a pass.

## Committed administrator-flow verification

On **21 October 2026 at 16:26 UTC**, the actual two-step administrator form recorded a separate **QA21 ALT / DD-AFDVANK7** test once. Hosted Checkout and the deployed worker had captured a new **110p sandbox payment**; its one actual Stripe refund subsequently failed with `expired_or_canceled_card`. Transporter confirmation/CAPTURING setup and the app failed-instruction prerequisite were seeded. The form's alternative settlement and PDF were explicitly labelled **simulated**, with no real bank transfer or receipt of funds represented.

The administrator UI → deployed API → canonical Stripe checks → committed accounting/private evidence → displayed result passed. Alternative record `5f82847b-20a0-4a3e-91ab-7e2c0994c0bb` records 110p, method OTHER, reference `SIMULATED-DD-ALT-20261021-A`. The payment is REFUNDED / payout CANCELLED with zero fee/proceeds, and the screen separates **£0 Stripe refunded / £1.10 alternative repaid**. Exactly one alternative finance event and one notice per synthetic party exist. The original failed instruction remains FAILED, attempt count 1 and ledger timestamp null; only the resolved reservation is released.

The private 44,415-byte PDF downloaded through the actual administrator link and matched SHA-256 `69991625af954c80f978ec3b9932e88909cd10818545e80f2d20bbc09eef8d5e`. The final independent Stripe read still contains exactly one failed refund and 0p successfully refunded. All 31 original table/storage counts and fingerprints match, excluding only the 13 newly retained QA21 ALT rows. The original £110 case is unchanged and held; refunds stayed off throughout, and production/permissions/live payments were untouched.

**Keep the new QA21 ALT record and supporting rows.** Its alternative audit is intentionally immutable; no trigger disabling or cleanup deletion was attempted. [Review screenshot](evidence/stripe-alternative-refund-e2e-review.jpg) · [Completed result](evidence/stripe-alternative-refund-e2e-completed.jpg) · [Exact evidence and exclusions](evidence/stripe-alternative-refund-e2e-verification.json).

## Boundaries and remaining verification

The implementation-only pass created no Stripe payment/refund/transfer/reversal. The later bounded QA21 ALT test created a separate sandbox payment and failed refund as described above. Neither pass made a real bank payment, displayed secrets, expanded permissions, released to production or settled the original £110 fixture. `STRIPE_REFUNDS_ENABLED=false` remains unchanged. Recording is independently enabled only in the already-configured Connect preview/development environment; the recording operation itself makes Stripe reads only.

The committed simulated-repayment gate is now verified for the administrator flow above. This does not establish actual alternative funds received, the full end-user booking/onboarding flow, email delivery or actual concurrent/lost-response browser submissions. Genuine insufficient-balance reversal failure/retry remains a different open gate under the existing account configuration. Never use the preserved £110 fixture for a new test.

Application commit `2a670bf58ccb5eddc10a4a3a369612ebe6f1bcea` is deployed READY as ordinary preview `dpl_6QX2RG7W88UKSNVuGyWW4RQsgwbF`, feature alias only. The initial implementation check opened the real administrator form and passed its read-only preflight with zero alternative records at that checkpoint. [Earlier browser proof](evidence/stripe-alternative-refund-form.jpg) · [Earlier detailed evidence](evidence/stripe-alternative-refund-verification.json). The later committed test above leaves one clearly labelled alternative audit. Later documentation-only commits may supersede this equivalent application build.
