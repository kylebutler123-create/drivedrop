# Native production payment rehearsal — 22 October 2026

**Passed on native PostgreSQL 17.11. Production remains inactive.** Tested commit `b3a4c52d38c0098268d70fb282ff3ab9b4689553` on `feature/ui-polish` completed [GitHub Actions run 39835288707](https://github.com/kylebutler123-create/drivedrop/actions/runs/39835288707) successfully on its first attempt at 18:54 UTC / 19:54 BST. Job `120021871921` used PostgreSQL `17.11 (Debian 17.11-1.pgdg12+2)` on a disposable Ubuntu runner.

The implementation still comes from `f649bc5`; this test commit changes only the workflow, rehearsal harnesses and their instructions. No application source, dependency lockfile or proposed migration SQL changed in this step.

| Native check | Result |
| --- | --- |
| Additive migration | All 20 schema/audit checks passed against the reviewed baseline fingerprint `dbafd834d5aaa168c554d9a62c382b84`. Transactional enum/table additions, negative preconditions, repeat refusal, client permission revocation, immutable audit protections and the £50 default passed. Final counts: 31 tables, 377 columns, 140 constraints, 121 indexes, 4 triggers. |
| Independent connections | Six recovery checks passed using two distinct native backends. A held production advisory lock excluded a competing claimant; six simultaneous claims created one active run. |
| Interrupted execution | An expired run became interrupted and was replaced. A late completion could not overwrite that record or finish the replacement. Failure in the transfer stage still reached refund recovery and persisted failed/unhealthy status. Missing configuration could not claim. |
| Booking and pending capture | 52 Prisma-backed checks passed. Concurrent confirmations produced one booking. A forced database commit failure after a simulated successful capture left a real local `CAPTURING` row; the actual production dispatcher completed it while new checkout was paused, with one booking, one financial event and no second capture. Repeated completion/reconciliation retained those counts. |
| Production configuration | The existing production runtime suite passed again, covering fail-closed configuration, identity/environment checks, separate creation/recovery controls, administrator/origin guards and email opt-in behavior. |

Exact migration SHA-256: `7d3864f328b3429e7b8c1cb736a8c05e98581796e31d2caaeb174252428eb8ff`. The [saved native evidence](evidence/production-payment-native-rehearsal.json) includes the tested commit, source hashes, actual server version, individual results, run/job identifiers and read-only hosting checks. The earlier [WASM evidence](evidence/production-payment-database-rehearsal.json) remains unchanged and historically accurate.

## What this closes and what remains

This closes the isolated native-17.11 schema rehearsal, real multi-connection run-claim/lease checks and Prisma-backed booking-authorisation test gates for this exact source. It proves pending capture recovery through the local production dispatcher, rather than only an idle scan or HTTP acknowledgement.

Stripe objects/responses and outbound messages are offline fixtures. Transfer/refund stages in the native dispatcher tests are inert fixtures; their detailed recovery behavior remains covered by the separate mocked runtime suites and historical sandbox evidence. Native Auth/Storage roles and tables are minimal stubs. This does **not** certify hosted Supabase Auth/Storage, production scheduler delivery, a live Stripe account, browser/private-file journeys or email delivery.

The genuine Stripe `balance_insufficient` reversal failure and later retry remain **UNVERIFIED**. No Stripe Support message or new provider test was performed here. The existing specialist-response gate remains open.

## Hosted boundaries checked

Read-only Vercel checks after the job confirmed the existing production deployment `dpl_B4bCCxXTQT3EECVXJT6CF2cC6YUz`, commit `8b87d8c66bd9fcca3f7f4716366cd6ea9b86485c` and its three aliases were unchanged. All 29 environment metadata entries still match the prior checkpoint, and preview `STRIPE_REFUNDS_ENABLED=false`.

No hosted database was written or used for these tests. This step did not resample application/storage fingerprints; the [preview publication checkpoint](production-payment-preview-checkpoint.md) retains its own dated preservation evidence. The protected £110 case and immutable QA21 ALT audit were not used as fixtures.

Next: resolve the genuine provider gate, then complete the remaining authorized browser/ownership, hosted scheduler and named-recipient delivery checks and prepare the exact production candidate/configuration/fallback. No main merge, hosted migration, production activation, live credentials or live funds movement is authorized by this successful test run. The [rollout plan](production-payment-rollout-plan.md) still governs the later exact cutover approval.
