# Production payment configuration — proposed, not applied

Use this with the [implementation checkpoint](production-payment-implementation.md) and [rollout plan](production-payment-rollout-plan.md). No production setting, key or endpoint has been created by this implementation. The [environment template](examples/production-payment-environment.example) contains names, empty placeholders and disabled flags only; it is not ready to import.

Vercel project: `prj_8BO4s7P2sffGKR4czg6nHOZqg4Ze`, team `team_HR29ivw10fPMfg8JK98snQj5`. Retain the 29-entry metadata baseline and all preview values/scopes. Any later production values must be entered through secure provider input and deployed with the reviewed commit. Do not download/decrypt credentials into chat or commit environment exports.

## Mode and identity

Production requires two restricted `rk_live_` keys, a separately verified `STRIPE_PLATFORM_ACCOUNT_ID` different from sandbox `acct_1US4BzLAzgkvCvrI`, and all three webhook secrets plus `CRON_SECRET`. The common configuration check requires the complete set before either provider can operate; a valid Checkout key alone cannot enable bookings while Connect/recovery configuration is missing. Both keys independently read the current Stripe account before provider operations. Their minimum permissions must include that read and the existing reviewed Checkout/PaymentIntent/refund or Connect/account/transfer/reversal endpoints respectively. Do not reuse sandbox keys or grant extra permissions to make a failing check pass.

`NEXT_PUBLIC_APP_URL` must be the exact approved HTTPS production origin, with no path, credentials, query or fragment. `STRIPE_CHECKOUT_ORIGIN` must equal that origin. The domain is still an explicit cutover decision. Live money code requires `SUPABASE_URL=https://srqhjgrhgyyfdaxckjum.supabase.co`, its service role credential and a direct connection to `db.srqhjgrhgyyfdaxckjum.supabase.co` or a Supabase pooler connection with user `postgres.srqhjgrhgyyfdaxckjum`. Actual credential ownership and candidate connectivity still require secure provider verification; URL checks alone are not proof of credentials.

New live connected accounts retain UK/GBP, Express dashboard and application fee/loss responsibility. Readiness requires canonical live country/currency, metadata ownership and active transfer/payout capabilities. No sandbox account is promoted or copied. Canonical charges, transfers, bank payouts and webhooks must match the deployment mode and ownership. Refund mode is verified through its parent charge because Stripe's V1 Refund does not expose `livemode`.

Checkout's `2024-06-20` API/card/manual-capture behavior and Stripe SDK `23.0.0` are unchanged. This is not a dependency/API upgrade.

## Controls

| Variable | Initial production value | Behavior after deliberate activation |
| --- | --- | --- |
| `STRIPE_PAYMENTS_ENABLED` | `false` | Master production configuration and canonical reconciliation control; keep **true** during an incident creation pause |
| `STRIPE_CHECKOUT_ENABLED` | `false` | Allows new quote/Checkout payment setup and new transporter capture claims; already claimed capture/release work continues through recovery |
| `STRIPE_CONNECT_ENABLED` | `false` | Allows new connected-account setup and administrator payout instructions; existing account status/dashboard and transfer reconciliation remain available with the master on |
| `STRIPE_REFUNDS_ENABLED` | `false` | Allows new refund instructions when Connect creation is also enabled; existing approved refunds/reversals continue with the master on |
| `STRIPE_ALTERNATIVE_REFUNDS_ENABLED` | `false` | Allows the narrow, independently evidenced alternative-repayment recording workflow; existing evidence remains privately readable with the master on |
| `DISPUTES_ENABLED` | `false` | Enables production dispute workflow with the payment master on; existing payout/dispute safety checks remain enforced |
| `TRANSACTIONAL_EMAILS_ENABLED` | `false` | Explicit production sending opt-in |
| `TRANSACTIONAL_EMAILS_SENDER_VERIFIED` | `false` | Operator attestation after real sender/domain verification, not a provider verification performed by this flag |

Email also requires `RESEND_API_KEY` and the validated fixed production origin. Sender remains `account@contact.drive-drop.com`. Provider errors are redacted. Sending is still best effort where previously implemented; this change does not add a general durable outbox or guarantee delivery. Named authorized recipients, actual receipt and failure handling remain acceptance work.

For an incident pause, turn creation flags off, preserve the master, credentials, webhook endpoints and recovery. Existing instructions can still complete their already approved refund, reversal or transfer. Existing issued Checkout sessions are not revoked by changing a deployment flag. Disabling the master is a full processing stop and can strand work; use it only under an explicit incident decision. Vercel environment edits affect new deployments, so record the deployed flag state and in-flight work before calling a pause effective.

Production TEST simulation remains denied even with every live flag enabled. Preview behavior and its normally-off refund flag remain unchanged.

## Recovery, endpoints and monitoring

Keep production webhook destinations and signing secrets separate:

- `/api/stripe/webhook`: platform Checkout/PaymentIntent, refund/charge-dispute and transfer events already handled by the application.
- `/api/stripe/connect/webhook`: connected-account bank payout snapshot events.
- `/api/stripe/connect/events`: V2 account thin notifications followed by canonical account retrieval.

Verify exact subscriptions against the route code, endpoint account/version and signatures before activation. Signed test/live mismatches are rejected. The platform route ignores connected-account payloads. No live endpoint has been configured or exercised in this pass.

Authenticated `GET /api/cron/booking-authorisations` in production claims the private production lease and dispatches all three queues: booking authorisations/releases, transfers, and refunds/recovery. It returns 202 for acceptance; the durable run record proves completion. Duplicate dispatch reuses the active run, interrupted leases expire after four minutes, and seven-day retention applies only to this operational log. One queue failing does not skip the remaining queues.

Authenticated `GET /api/cron/booking-authorisations?health=1` returns aggregate queue counts, oldest pending work, review/reservation/expired-lease counts and the last five runs. It returns 503 without a recent successful worker, after a failed/interrupted latest run, for a stale active run, a REVIEW/held failed-refund case, a lease expired more than five minutes, or pending work older than 15 minutes. Those thresholds are initial operational defaults. No secret, evidence bytes or customer identity is returned. This endpoint does not replace Stripe webhook-delivery/error monitoring or a named operator.

The [cron candidate](examples/production-cron-candidate.json) preserves the three existing daily schedules and proposes a minute recovery tick. **It is not installed:** the root `vercel.json` is unchanged and minute-schedule plan eligibility is unverified. Select and approve one scheduler, prove an actual pending fixture reaches durable completion, and nominate an operator/alert destination. Do not copy preview's database cron URL/Vault secret or operate two dispatch sources accidentally.

Admin refund and payout PATCH routes operate on existing environment-bound instructions, require an active administrator, and require the exact origin in production. The payout retry and refund recovery buttons use those routes while new instructions are paused. They do not change safe retry windows or turn REVIEW into authority to create a second payment.

Before a hosted migration or cutover, finish native 17.11/concurrency rehearsal, provider insufficiency-gate disposition, role/browser/storage journeys, actual authorized email delivery, production-target candidate verification, current recovery evidence and a compatible fallback. Present the exact commit, database delta, environment scopes, domains and scheduler for approval together.
