# DriveDrop production rollout preparation — 29 October 2026

The monitoring safeguards now pass focused native PostgreSQL checks after a
blocked-query timeout fix. Production is still unchanged and monitoring is off.
This document updates the historical 21 October plan; it does not authorize a
production migration, deployment, secret change, alert or money operation.

## Confirmed launch address

Kye confirmed **https://drive-drop.com** as the canonical launch origin on
29 October 2026. The planned `NEXT_PUBLIC_APP_URL` and
`STRIPE_CHECKOUT_ORIGIN` both use this exact origin; only the review template has
been filled in. No deployed environment variable was changed.

Read-only Vercel checks confirm the domain is already registered to and verified
for team `team_HR29ivw10fPMfg8JK98snQj5`, with `ns1.vercel-dns.com` and
`ns2.vercel-dns.com` authoritative. Apex and `www` configuration checks report no
DNS conflicts and `misconfigured=false`. The domain has no project assignments,
so this is not proof that the DriveDrop website or its HTTPS certificate is live
there. No domain purchase, transfer, DNS edit, project assignment or verification
mutation was performed.

The zone contains existing Resend/DMARC records, certificate-authority records,
and apex/wildcard aliases. Preserve those records. At the approved release,
connect the apex to the intended production candidate and verify HTTPS and app
routing. A `www` redirect to the canonical apex is a proposed release detail;
neither hostname has been attached or redirected in this pass. Use Vercel's
then-current project-specific instructions rather than hardcoded DNS targets.

## Live Stripe account review

Read-only inspection of the signed-in local Chrome dashboard on 29 October 2026
identified **drivedrop**, live platform **`acct_1US4BsLo6y2NJoQw`**. The account
switcher shows the signed-in user's role as **Super Administrator**. The account's
business website is already `https://drive-drop.com`. This establishes the
dashboard identity and access role, not completed legal/identity verification or
permission for the application to process live payments.

| Observed area | Result and remaining gate |
| --- | --- |
| Business details | Business information, customer-facing information, statement descriptor and account representative are each marked **Incomplete**. |
| Product and live setup | The setup guide marks product activation and Connect business-model selection **Not Started**; identity verification and integration confirmation are blocked. The Connect platform profile independently says **Onboarding incomplete**. |
| Dashboard phone verification | The account details page offers **Verify now** and says SMS verification is needed to process payments from the Dashboard. This is not evidence about API capability status. |
| Server API keys | The API keys page shows a create-key prompt and a publishable key, with no existing server-key permission scopes listed. Restricted live-key permissions remain unverified; no key was created, revealed or copied. |
| Live webhook destinations | Workbench shows the empty destination setup screen. No live destinations or signatures were verified; the three reviewed application webhook routes still need configuration during an approved preparation step. |
| Application capabilities | Live capability status was not read through the API and remains unverified. Dashboard access and a live publishable key do not establish payment or transfer readiness. |

The Stripe connector still exposes only the separate sandbox
`acct_1US4BzLAzgkvCvrI` (`livemode=false`); browser sign-in does not grant that
connector access to live data. No sandbox configuration was changed.

The next step is completing the live business/product and Connect onboarding
requirements with the account holder, then reviewing actual capabilities and
restricted-key scopes. Preserve the existing separate-charges-and-transfers
integration; do not repeat financial QA or create test accounts from the setup
guide. Any submission, acknowledgement, credential provisioning or production
configuration is outside this read-only review. The review template now records
the non-secret platform ID; deployed environment values are unchanged.

## Completed work to retain

| Area | Evidence and scope |
| --- | --- |
| Preview heartbeat integration | PR #2 merged at `e83f8a95484755bdc4ebd658deb7851ff5eed9ed`; normal CI and preview health passed. Explicit production plus enable flag is required. |
| Enabled monitoring concurrency and timeouts | [Native CI](https://github.com/kylebutler123-create/drivedrop/actions/runs/40802374705) passed at `3c6465adb3528c484536335de84ae704e9fc78d6`. Four PostgreSQL 17.11 connections; actual worker/sender, inert financial/email/HTTPS fixtures. |
| Database timeout correction | The initial native test reproduced blocked SQL exceeding Prisma's five-second limit. The monitoring transaction now uses `SET LOCAL statement_timeout = '1000ms'`. Native lock wait and slow query ended in 1005/1004ms; connection wait 1002ms; simulated HTTPS timeout 2004ms. Commit/rollback restore the prior setting. |
| Notification setup | Free Healthchecks project and two checks prepared. Kye confirmed all four authorized failure/recovery emails. Budget used: 4/4. Both checks were paused with ignore-pings behavior; no new provider inspection or alert is claimed here. |
| Previous financial QA | QA25 COMPLETE/PASS; QA23 COMPLETE; QA24 CLOSED/INCONCLUSIVE. Retain these results and protected cases. This pass creates no hosted payment case and does not repeat them. |
| Scheduler selection | Kye has confirmed Vercel Pro. The reviewed candidate preserves the three daily jobs and adds one minute recovery job. It is not installed. Do not ask again for the plan or alert recipient. |

The [sanitized evidence](evidence/payment-monitoring-native-2026-10-29.json)
records source hashes, native results and fresh read-only production observations.
The native fixtures establish the exercised monitoring behavior; they do not
certify hosted credentials, full schema/RLS, provider delivery, network partitions
or process termination. Distributed delivery is not atomic with database state.

## Fresh production observations

- Main remains `8b87d8c66bd9fcca3f7f4716366cd6ea9b86485c`; deployment
  `dpl_B4bCCxXTQT3EECVXJT6CF2cC6YUz` is READY with its three existing aliases.
- Vercel's project domain list contains only `drivedrop-pink.vercel.app`.
  The subsequently confirmed launch origin is `https://drive-drop.com`, whose
  team ownership and Vercel DNS configuration were verified separately above.
  Project attachment, website routing and HTTPS acceptance remain pending.
- Prepared Supabase project `srqhjgrhgyyfdaxckjum` is ACTIVE_HEALTHY on PostgreSQL
  17.11. At 01:48 UTC, all 27 application tables plus Auth users and stored objects
  contained zero rows. The exact catalog/bucket fingerprint remains
  `dbafd834d5aaa168c554d9a62c382b84`.
- Production ops/cron schemas are absent. The four new financial tables are
  absent; only migration `20261019020729` is applied. The additive migration is
  still unapplied and unchanged at SHA-256
  `7d3864f328b3429e7b8c1cb736a8c05e98581796e31d2caaeb174252428eb8ff`.
- Vercel metadata contains 31 variables, hidden production count zero. No
  production-scoped live Stripe configuration, recovery secret, fixed app origin,
  Resend key or heartbeat variables are present. Some database/storage variables
  still share production/preview scopes. No values were decrypted or exported.
- These checks confirm the prepared database, not the secret connection mapping
  of the August public deployment. No hosted database/configuration was changed.

## Remaining decisions and release requirements

| Requirement | Concrete next action | Release condition |
| --- | --- | --- |
| Launch address | Confirmed: `https://drive-drop.com`; team ownership and Vercel DNS configuration verified. Connect and verify the website only during the approved release. | Exact origin fixed for app links, Checkout and webhooks; project assignment, HTTPS and any `www` redirect still require acceptance. |
| Live Stripe readiness | Live dashboard identity `acct_1US4BsLo6y2NJoQw` and Super Administrator access verified. Complete the observed business/product and Connect onboarding requirements, then securely verify capabilities and restricted-key scopes. Preserve the separate sandbox. | Legal/identity requirements satisfied, live capabilities and application key permissions verified, and all three webhook destinations/signatures configured and verified. No keys in chat or Git. |
| Isolated production configuration | Split only the required production database/storage scopes to the prepared project; preserve every preview value. Use the existing environment template with all creation, email and heartbeat flags initially false. | Candidate proves its actual production database, storage and identity; metadata alone is insufficient. |
| Additive migration and access | Recheck the exact empty baseline, apply only the reviewed additive migration after approval, verify permissions/postflight, and securely bootstrap the real administrator. | Expected schema and private access; no preview database clone or synthetic account import. |
| Provider limitation | Retain the genuine insufficient-balance reversal/retry gate as unverified until supported evidence or an explicit reviewed disposition exists. | QA25 response-loss/idempotency evidence is not relabelled as this provider failure. No repeated payment experiment in this plan. |
| Production acceptance and email | Map existing accepted evidence to the unchanged code; identify only remaining production-specific identity, role/file, webhook, link and delivery checks. | Named scope and recipients for any new sends/actions. Healthchecks' four emails do not certify application email or inbox placement. |
| Recovery and monitoring | Install the single reviewed minute scheduler, retain daily jobs, and bind the private production Healthchecks endpoint through secure production-only input. | Real durable current-run completion plus fresh healthy aggregate; never an HTTP 202 or manual success ping. |
| Backup, fallback and release | Capture a fresh consistent recovery package; prepare a compatible fallback that uses the intended production database and can reconcile existing work. | Exact source, migration, environment scopes, aliases, scheduler, fallback and observation window presented together for cutover approval. |

The old August public build is not a safe automatic fallback once live financial
instructions exist. A rollback must preserve records, reservations, evidence and
canonical reconciliation; it must not restore old data over new financial history.

## Proposed controlled sequence — not executed

1. Use the confirmed `https://drive-drop.com` origin and live platform ID; finish live-account onboarding, capability and key-permission verification. Record the final
   reviewed release commit and lockfile, incorporating the monitoring timeout fix.
2. Capture fresh backup/restore and alias evidence for the actual cutover window.
   Recheck the prepared database's fingerprint and emptiness immediately before
   any approved migration. Stop on drift; do not rebuild or drop existing objects.
3. Under a specific production-preparation approval, apply only the unchanged
   additive migration in one transaction and verify its postflight and access.
   Configure production-only credentials securely; preserve preview scopes.
4. Build a production-target candidate without automatically moving public
   domains. Keep new Checkout, Connect instructions, refunds, alternative refunds,
   disputes, outbound email and monitoring disabled. Verify actual target wiring.
5. Once identity, origin and signed webhook configuration are verified, enable
   canonical reconciliation on the approved candidate while keeping new-operation
   flags off. Any approved worker observation must inspect durable completion and
   fresh aggregate health. An empty scan is valid; do not manufacture a payment.
6. Install only the reviewed Vercel minute schedule as part of the approved
   release. Preserve daily schedules `0 8 * * *`, `0 3 * * *`, `0 4 * * *` and the
   preview database scheduler. Verify the active scheduler/deployment mapping
   rather than assuming a staged build is receiving cron traffic.
7. At the approved monitoring activation, coordinate resuming the real check and
   enabling its production-only flag. Use the 60-second period plus 240-second
   grace. The first accepted success must originate from actual completed healthy
   worker activity. Keep the separate validation check paused; no more test emails.
8. Promote only the approved production candidate to the agreed aliases after the
   remaining gates and compatible fallback are satisfied. Enable new money
   operations and application email only in the separately agreed order and scope.
   Observe ordinary completion, backlog, webhook errors and delivery; no improvised
   live payment is part of this plan.

For an incident, pause new-operation controls while retaining the reconciliation
master, secrets, webhooks and recovery for existing instructions. Coordinate a
deliberate maintenance pause with the operator; otherwise missing heartbeats must
alert. Do not stop financial recovery just to silence monitoring.

## Provider documentation checked

PostgreSQL documents [statement timeouts](https://www.postgresql.org/docs/17/runtime-config-client.html)
and [transaction-local settings](https://www.postgresql.org/docs/17/sql-set.html).
Supabase's [Data API exposure change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)
does not require broader client grants for this server-side Prisma worker. The
prepared migration retains explicit service-role grants and client revocations;
verify those permissions in the future production postflight. No provider setting
was changed in response to the changelog.
