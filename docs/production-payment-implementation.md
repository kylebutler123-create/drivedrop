# Production payment implementation — 21 October 2026

**Resumed and reviewed on 22 October.** Remote `feature/ui-polish` was refreshed and still pointed to `da94f63799455ec1ff54cab46d12ff276ec18e21`. The interrupted staged implementation was recovered intact. Review added complete live-credential/webhook configuration checks across both providers and PostgreSQL 17 `MAINTAIN` privilege checks. The production runtime and relevant financial regression suites passed again, along with the TypeScript/optimized build; the isolated WASM schema rehearsal now passes 20 checks. Implementation commit `f649bc5` is saved on the feature branch and its preview is READY; the [publication checkpoint](production-payment-preview-checkpoint.md) records exact deployment, health and preservation evidence.

**Prepared on `feature/ui-polish`; production remains inactive.** This implements the approved code/schema preparation from the [rollout plan](production-payment-rollout-plan.md), starting at `da94f63799455ec1ff54cab46d12ff276ec18e21`. It does not authorize or perform a hosted migration, main merge, production configuration/deployment, live financial operation or new sandbox transaction.

## Changes prepared

- A separate additive production migration with exact baseline/emptiness preconditions, final refund constraints, immutable alternative-payment evidence, production-only environment checks, private recovery leases and explicit client permission revocation. Historical preview migrations and production's 5,000p fee default are preserved. [Migration and rehearsal instructions](../scripts/production-database/README.md).
- Production payment mode requires restricted live keys, the expected platform identity, prepared-production database/storage configuration and a fixed HTTPS origin. Test keys/accounts/events and TEST finance remain rejected. Canonical ownership, GBP/amount checks, stable idempotency, locks, safe retry windows and manual administrator release are retained.
- New-payment controls are separate from canonical recovery. Pausing creation preserves existing authorisations, refunds/reversals and transfers; active administrators can reconcile existing records through environment-bound PATCH routes. Production requires the exact request origin. Customer/transporter/admin payout labels distinguish real operations from sandbox operations.
- An independent production worker log, authenticated full-queue dispatch and health endpoint reporting stale runs, pending age, review cases, reservations and expired leases. The existing preview worker namespace remains intact. Production scheduling is only a proposed configuration; no scheduler was activated.
- Explicit production email opt-in, verified-sender attestation, fixed-origin links and redacted provider errors. No email was sent and no general outbox/delivery guarantee was introduced. Production disputes also require explicit enablement.

The [configuration guide](production-payment-configuration.md) records every flag, identity requirement, endpoint and scheduler candidate. All production creation/email flags start off. With live instructions present, keep `STRIPE_PAYMENTS_ENABLED=true` during a creation pause so canonical recovery can finish existing work. Review actual Vercel deployment environment changes as part of the pause; environment edits alone do not update an already deployed build.

## Verification completed locally

| Check | Result and limit |
| --- | --- |
| TypeScript and optimized Next.js build | Passed against the unchanged lockfile; build used a dummy localhost database URL and no hosted credentials. The resumed build also encountered a corrupt old Turbopack cache; retaining that generated output separately and rebuilding cleanly passed. No source or dependency workaround was needed. |
| New production runtime suite | Passed fail-closed mode/key/account/database/origin checks, TEST denial, GB/GBP account readiness, signed webhook mismatch/tamper cases, creation-off/recovery-on scenarios, response/commit loss, administrator/origin checks, worker health, email opt-in/redaction and real-payment labels/button routing. Stripe, email and database adapters were mocked. |
| Existing financial regression suites | Connect, refunds, alternative refunds, refund policy, payment recovery and Stripe authorisation-provider suites passed. Includes late refund failure, dispute holds, response/commit loss, concurrent instruction creation and simulated insufficient-balance retry behavior. |
| Related notifications/UI | Job digest, availability notification concurrency, administrator payout layout/guards and transporter account suites passed. No provider email request was sent. |
| SQL baseline and migration | **20 checks passed**, rerun 22 October in isolated PostgreSQL **17.5 WASM**. Includes rejection of client `MAINTAIN`-only grants. Baseline schema/bucket fingerprint exactly matched prepared production; additive DDL and enum additions committed in one transaction; final counts are 31 tables / 377 columns / 140 constraints / 121 indexes / 4 audit triggers. |
| SQL negative/audit checks | Rejected schema/bucket/default/history drift, occupied app/auth/storage, client grants, repeat application, client audit/lease reads and duplicate active leases. Synthetic financial checks verified reservation protection, complete atomic settlement, immutable evidence/failed-refund history, duplicate rejection and payout/ledger guards. All synthetic rows rolled back. |
| Native PostgreSQL 17.11 | **Blocked, not passed.** Official 17.11 source checksum/build succeeded, but this workspace only maps UID 0 and denies a non-root namespace. PostgreSQL's root restriction was preserved. Native multi-connection locking and the Prisma-backed `test-booking-authorisation.cjs` suite were not rerun here. |

[Exact local SQL report](evidence/production-payment-database-rehearsal.json) · [Hosted preservation evidence](evidence/production-payment-implementation-preservation.json).

The WASM single backend cannot certify real transaction concurrency, networked Prisma behavior or hosted Supabase Auth/Storage. Mocked live-mode objects cannot certify a live Stripe account, hosted production configuration, Checkout/3DS or customer delivery/email journeys. Component rendering and handler tests are not a completed browser journey. These limits remain explicit release gates.

## Preserved hosted state

Read-only checks matched all 32 preview application/storage fingerprints and all 28 prepared-production fingerprints from the previous review; prepared production remains empty. The 29 environment metadata entries match, and `STRIPE_REFUNDS_ENABLED=false` is unchanged on `feature/ui-polish`. The original £110 failed refund remains held/reserved and the immutable simulated £1.10 QA21 ALT audit remains retained. No key or secret was displayed.

Production remains on `dpl_B4bCCxXTQT3EECVXJT6CF2cC6YUz` / `8b87d8c66bd9fcca3f7f4716366cd6ea9b86485c`, with its existing three aliases. Only the approved feature branch is being published through its ordinary preview deployment. Publication verification is recorded in the branch's subsequent checkpoint if required; no new hosted browser/payment test is implied by a READY preview.

## Next work before any cutover

1. Run the supplied rehearsal on a real disposable PostgreSQL 17.11 cluster, then the Prisma-backed authorisation and multi-connection lease/locking checks with isolated fixtures. The portable result does not close this gate.
2. Obtain Stripe's actual insufficient-balance reversal failure/retry guidance or an explicitly reviewed disposition. This genuine-provider gate remains **UNVERIFIED**. On 22 October the signed-in Support widget opened a fresh assistant conversation; the previous escalation and any specialist reply could not be recovered from that view. No duplicate request was sent. See the dated [Support check](stripe-support-recovery-question.md).
3. Verify the intended production account/domain, minimum restricted-key permissions, scoped database/storage credentials, separate signed endpoints and a supported scheduler/operator. Review the exact migration/configuration before any hosted write.
4. Complete separately authorized browser/role/private-file and email-delivery checks, a production-target candidate, current recovery evidence and a compatible fallback. The old public production build is not a safe automatic fallback after live activity.
5. Present the exact commit, migration, scopes, domains, schedule and remaining limitations for approval. Do not merge main, move aliases, activate production or improvise live money tests from this preparation alone.

No table deletion, data import, account bootstrap, settlement of the retained £110 case or alteration of simulated QA21 ALT evidence is part of the next rehearsal.
