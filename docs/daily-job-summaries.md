# Daily job summaries

Transporter Account → Email preferences offers Daily summary (default) and Off.
The account API accepts only the authenticated active transporter's own boolean
preference. Booking/account email triggers are unchanged. New request creation
does not send any email.

The worker selects at most five new requests still open under the shared request
expiry policy, created in the previous completed 08:00 UTC-to-08:00 UTC window.
It sends nothing when that selection is empty. This is a general jobs summary,
not location/vehicle matching. The complete list remains available in the account.
Recipients must still be active, approved, unrestricted and have valid insurance.

## Schedule and activation

`GET /api/cron/daily-job-summary` requires `Authorization: Bearer <CRON_SECRET>`.
`vercel.json` schedules it at 08:00 UTC (08:00 GMT / 09:00 BST).
Vercel Cron runs only on production deployments. Adding this entry to a preview
does **not** activate a preview schedule. The existing email helper also disables
all transactional email on production; that guard has intentionally not changed.

For preview, configure an authenticated external scheduler against the stable
feature/ui-polish preview alias. It must have authorized Vercel protection access
as well as the cron secret. Do not disable deployment protection. Start at 08:00
UTC and retry on 503 / `state: more`, at least six minutes apart after a timeout.
Stop on `complete` or `complete-or-running`; if the latter follows a timeout,
retry once the six-minute lease has elapsed. `disabled` means check email config.
Do not point this scheduler at production. Do not invoke a live send just to test.

## Reliability and resources

The worker pages 100 users at a time, with indexes for recipients/new requests.
Each Resend API batch contains at most 100 separate emails. Calls are paced.
A database lease prevents overlapping workers. Progress and the exact pending
payload/key are persisted before sending. On ambiguous provider failure, retry
the same window to reuse the Resend idempotency key (valid for 24 hours).
Retries older than 23 hours are discarded. The worker runs for at most about
four minutes per invocation; a scheduler must resume `state: more` for larger lists.
No old daily windows are replayed automatically. Run data is retained 30 days.

Before sending/retrying a pending batch, it rechecks opt-outs, account eligibility,
email addresses, insurance and job availability. If any of these changed, that
batch is conservatively skipped. This avoids a changed-payload retry causing
duplicate emails after an ambiguous delivery outcome. `skippedCount` records this
trade-off; affected transporters remain eligible for the next day's summary.

Preview and production have separate run keys. The private run table has RLS and
no browser Data API grants. Stored pending email payloads are cleared on completion.

## Verification

`node scripts/test-job-digest.cjs` uses mocked database/email services and sends no
real email. Covers paging, eligibility, daily cutoffs, empty results, concurrency,
retry keys/payloads, changed preferences/jobs, preference ownership and cron auth.
Build with `npm run build` after applying the additive Prisma SQL migration.
