# QA23 pending payout recovery probe

This temporary hook is disabled unless a valid server-only manifest is present.
It changes no payment eligibility, accounting, worker selection or Stripe POST.
After the ordinary admin route commits a real payout instruction, it can omit
only that route's immediate `after` task. The existing minute worker remains on.
No schema migration, dependency/API upgrade, webhook pause or production change
is required. The initial deployment must remain unarmed.

## Exact activation boundary

`DRIVEDROP_QA23_PAYOUT_RECOVERY` is a private server environment variable, never a
request parameter or `NEXT_PUBLIC_` variable. It accepts strict JSON with exactly:

- `case`: `QA23`
- `platformAccountId`: the pinned `STRIPE_SANDBOX_ACCOUNT`
- `bookingId`, `paymentId`, `destinationAccountId`, `paymentIntentId`, `sourceChargeId`:
  the new case's exact identifiers, recorded privately after normal booking
- `armedAt`, `expiresAt`: absolute UTC ISO timestamps; a positive window no longer
  than 10 minutes, active only at `armedAt <= now < expiresAt`

No real case values belong in this public repository. An absent, malformed,
oversized, premature or expired manifest cannot activate the hook. The runtime
must match Vercel preview, `feature/ui-polish`, the exact preview Checkout origin,
Connect enabled and refunds explicitly disabled. The admin request must use the
same origin. Production remains inert even with a copied valid manifest.

The hook requires a newly created, never-attempted PENDING instruction, £11 paid,
£10 gross/net proceeds, £1 platform fee, no fine or reimbursement, a natural
24-hour customer-confirmation hold, no disputes and no active refund or payout
event. It canonically rechecks the test-mode captured source and absence of the
transfer group. The platform identity is verified by the existing client.
Any mismatch/read failure retains normal foreground behavior; it is not a
recovery-test pass. A final row read detects a worker winning during these reads.

Only normal `prepareStripePayout` creates/reserves the instruction. Duplicate
admin requests reuse it. This is one case and one time window, not a durable
one-shot toggle. The operator submits once. There is no reset, backdating,
financial seeding, global queue pause or client-controlled activation endpoint.

## Evidence and failure handling

The short-lived `QA23 payout recovery` trace contains only event, payout ID,
optional run ID and status. It never prints the manifest, provider payload,
request, credentials or personal data. `foreground_deferred` identifies the
omitted task; `worker_selected` and `worker_finished` link the selected payout to
the existing durable scheduled-run ID. `worker_claimed` records the acquired
lease; `worker_transfer_submitted` and `worker_transfer_returned` bracket the
actual provider request, so merely observing another caller's completion is not
mislabelled as this worker creating the transfer. `worker_threw` preserves normal exception
propagation. Logging failures do not change financial processing.

A pass requires one real pending instruction, scheduled attribution, one
canonical £10 sandbox transfer and one `PAYOUT_PAID` event, plus two later scans
without duplicates. An acknowledgement, aggregate checked count or an increased
attempt counter alone cannot prove this. If another path wins, evidence is
missing, or the guard does not activate, preserve the case as inconclusive.
Do not create a fresh key, booking or payment to chase a pass. Inspect unresolved
work after five minutes and retain ordinary recovery. The existing canonical
lookup/idempotency key and 23-hour creation cutoff remain unchanged.

## Verification and cleanup

`node scripts/test-payout-recovery-probe.cjs` runs offline guards. The dedicated
`QA23 bounded payout recovery checks` workflow uses PostgreSQL 17.11, two real
connections, the real admin/preparation/cron/reconciliation/ledger code and fake
Stripe/auth boundaries. Its explicit loopback database guard runs before schema
creation. It checks default behavior, auth/origin/hold rejection, concurrent
release deduplication, pending work, run attribution, canonical replay and two
later scans. Fixture dates are synthetic only in this disposable database.

These results are not hosted Stripe, real inbox, a real 24-hour wait, lost-POST
response recovery, bank arrival or insufficient-balance reversal evidence.
The separate private QA23 plan specifies the normal UI journey, new accounts,
email/date containment, protected historical cases and bounded execution scope.
No hosted financial test is started by committing this code or running CI.

After the bounded hosted run, remove the manifest and temporary hook/tracing,
verify the ordinary route and deploy the clean preview. Preserve all financial
and audit records. Do not refund, reverse or delete data as test cleanup. Any
production rollout and remaining payment-readiness gates stay separate.
