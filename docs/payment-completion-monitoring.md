# Payment completion monitoring — disabled review candidate

The recovery dispatch returns HTTP 202 before its work finishes. This optional
Healthchecks integration reports only a current, durably completed worker run,
then evaluates the existing payment health checks. It is disabled by default.
This change does not install a scheduler or activate production monitoring.

## Behavior

1. Run the existing authorisation, payout and refund stages unchanged.
2. Save the final run result with the existing `finished_at is null` guard.
   Zero rows updated means no heartbeat; an expired/replaced callback cannot
   report its replacement's success.
3. Only when `VERCEL_ENV=production` and
   `DRIVEDROP_PAYMENT_HEALTHCHECK_ENABLED=true`, read the private URL and start
   a separate monitoring transaction after that save has committed.
4. Try the same advisory lock used by the dispatcher. While held, read the latest
   run and the unchanged aggregate health queries using that transaction's
   connection. Require this exact run ID, a finished succeeded/failed status,
   and a completion less than 60 seconds old. A competing claim or different
   current run means no ping.
5. Send success only for a succeeded run with zero item failures and
   `healthy=true`. Otherwise send `/fail` for the completed unhealthy run.
   Existing review, reserved failed-refund, backlog and expired-lease warnings
   are retained; monitoring never clears them.

A completed scan with no queued work is valid evidence; a dispatch acknowledgement,
callback registration or process start is not. The health GET remains read-only,
with its existing response shape. Preview and development do no additional
monitoring reads or network calls.

## Isolation and limits

- Run completion commits before monitoring begins. Monitoring reads and network
  failures cannot roll back the completion, retry a money operation, change a
  payout policy or mutate financial records.
- The dispatch lock is held during the health read and ping to avoid a new run
  overtaking the completion evidence. This can cause a concurrent tick to return
  the existing busy response; the next scheduled tick retries normally. Existing
  four-minute leases and three recovery stages are unchanged.
- The monitoring transaction permits up to one second to obtain a connection,
  has a five-second transaction limit, and stops sending at a four-second budget
  inside the callback. A transaction-local PostgreSQL `statement_timeout` of one
  second also bounds each monitoring SQL statement, including lock waits. The
  Prisma transaction limit alone did not cancel a blocked native health read;
  the focused native rehearsal reproduced that failure. The setting resets at
  commit/rollback and never applies to the already-completed financial stages.
  HTTPS has at most two seconds, reduced to the remaining
  budget. There is no automatic ping retry. A platform termination or database
  outage therefore becomes a missing-heartbeat alert once monitoring is active.
- Only an exact `https://hc-ping.com/<UUID>` endpoint is accepted. No custom host,
  redirect, query, fragment, credentials, port or suffix is accepted as config.
  A native Node HTTPS POST sends an empty body with no application credentials,
  run IDs or customer/payment data. It avoids Next's fetch cache/tracing path.
- Only HTTP 200 with exactly `OK` is accepted. Healthchecks can also return 200
  for an unknown or rate-limited UUID. Read at most 32 response bytes; never log
  the response. Even accepted transport is not proof of inbox delivery.
- Failures log only `Payment recovery heartbeat failed` with a fixed reason:
  `configuration`, `delivery` or `health_unavailable`. Never log the error object,
  ping URL, headers or provider response. Account for URL redaction if separate
  infrastructure tracing is introduced later.
- The advisory lock and deadline bound ordinary races; no distributed monitor
  can make provider delivery atomic with database state. A connection loss or
  platform termination during transmission can leave delivery uncertain. Do not
  resend a completed financial stage to resolve that uncertainty.

## Configuration and future activation

The review template has empty private URL and a false enable flag. No real value
belongs in Git, chat, screenshots, logs or client bundles. Keep both variables
out of Preview and Development. The recipient belongs in Healthchecks, not code.

Before a separately approved production activation, verify the isolated database,
live identity, reviewed migration, webhook/scheduler configuration and rollback
package. Use exactly the reviewed minute scheduler; preserve the daily jobs.
The real check uses period 60 seconds plus grace 240 seconds. Keep the validation
check paused; the four service-delivery test alerts have already been verified
and must not be repeated as part of this code review.

For that future activation, install the private URL through secure provider input,
keep the flag false until the deployment/configuration is verified, explicitly
resume the real check and enable the flag under the approved rollout. The first
success must come from actual completed healthy work. Never use Ping Now or a
manual success to establish production health. Confirm ordinary subsequent run
completion and provider receipt without manufacturing payment cases.

To stop sending, disable only the heartbeat flag. Coordinate a deliberate
maintenance pause with the operator; otherwise silence should alert. Never
disable financial recovery merely to stop monitoring. The current review work
leaves both Healthchecks checks paused and makes no provider/environment changes.

## Verification

`node scripts/test-payment-recovery-heartbeat.cjs` loads the actual worker and
sender with a strict dependency allowlist. Database, payment stages, notifications
and HTTPS are simulated; it cannot contact Healthchecks, Stripe or a hosted DB.
It verifies persistence ordering, no heartbeat on acceptance, preview/disabled
silence, stale/current-run guards, a competing claim during transmission, review
warnings, strict URL handling, redacted errors, body limits and a real timeout.
`scripts/test-payment-recovery.cjs` retains the existing offline dispatch checks.
The focused CI workflow also typechecks and builds with a dummy localhost URL.

`node scripts/test-payment-recovery-heartbeat-native.cjs` is the separate native
PostgreSQL 17.11 monitoring-only rehearsal. It requires an explicitly named empty
localhost database and uses four independent connections. The actual worker and
sender run with financial, email and HTTPS dependencies replaced by strict inert
fixtures. It checks committed visibility, native lock ownership, duplicate and
superseded completion, review preservation, connection acquisition, transport
timeout, genuinely blocked/slow SQL, and timeout-setting reset. The operational
table/index DDL comes from the reviewed migration; minimal backlog fixtures do
not certify the full migration or RLS. CI records the exact tested source and
measured bounds. See the native evidence before treating this gate as passed.

Neither suite repeats QA25, validates production configuration, or claims hosted
monitoring is active. Process termination, network partitions and distributed
delivery atomicity remain outside the proof. Production activation and live
observation remain separate release gates.

References: [Healthchecks ping API](https://healthchecks.io/docs/http_api/),
[failure signals](https://healthchecks.io/docs/signaling_failures/), and the
installed Next.js 16.3.8 `after` and `fetch` guides.
