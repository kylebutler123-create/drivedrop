# Production database preparation — 19 October 2026

Production project: srqhjgrhgyyfdaxckjum (DriveDrop Production), eu-central-1.
Existing preview/shared project: yozbuuvebzxitoqrvyer. No existing data was modified.
Source code baseline: 09d23db7debdaf7e8661ea6b46baaaa891c451a8 on feature/ui-polish.

## Applied

Supabase migration: drivedrop_production_schema_and_storage_baseline.
The accompanying SQL is a schema-only bootstrap for an EMPTY database. Do not run it on the existing preview or on an already initialized production database.
It is intentionally outside prisma/migrations: the historical incremental migrations are not a complete fresh-install baseline.

The baseline captures the actual working database, including raw-SQL tables and collection/delivery evidence fields absent from schema.prisma.
27 tables, 276 columns, 15 enums, 98 constraints and 98 indexes were verified after application.
All application tables have RLS enabled; PUBLIC, anon and authenticated have no table privileges.
Server-side authorization remains required. Supabase reports only informational RLS-without-policy notices, expected for these server-only tables:
https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

Created buckets:
- delivery-evidence: private, 8 MiB, JPEG/PNG/WebP.
- message-attachments: private, 8 MiB, JPEG/PNG/WebP.
- transporter-profiles: public, 2 MiB, JPEG/PNG/WebP.
- transporter-verification: private, 20 MiB, PDF/JPEG/PNG.
- vehicle-photos: private, 900,000 bytes, JPEG/PNG/WebP.

Cancellation fee default is 5,000 pence, matching the approved £50, application constant and repository migration.
The source database default was 2,500 pence; it was NOT altered. Current application inserts explicitly use 5,000 pence.

No accounts, sessions, bookings, test payments or files were copied to the prepared production project.
Verified new production: zero users, zero bookings, zero storage objects.
No Vercel environment variables changed; neither website was switched to the new project.
The existing production website and preview therefore remain connected to the original shared project until an explicitly approved cutover.

## Outstanding gates

**Cleanup complete:** the disposable restore-test project was permanently deleted with explicit approval on 19 October 2026. The original preview/shared project and prepared production project remain healthy. Earlier test/preparation sections below are historical; the final cleanup section records the current state.

- Dated database recovery is verified: the selected 18 October 2026 04:40:54 UTC physical backup was restored to a separate hosted test project on 19 October. Database integrity and snapshot comparisons passed; details below.
- Storage recovery is verified: all 136 archived files were restored at their original paths in the isolated hosted test project and read back with matching SHA-256 hashes (227,100,491 bytes). All five bucket access samples passed; details in the final section below.
- Hosted file restore/readback in urzkdwvfplawjvnfubda is complete. Full application recovery/role-authorization checks remain pending because the dated database and later file snapshots differ and no website was connected to the test. The isolated project was subsequently deleted after explicit approval; its additional compute usage has ended.
- Keep credentials and personal-data backups out of this repository. The storage archive and verification report have been saved privately outside Git.
- Configure production-only database/storage credentials at cutover; retain preview's existing credentials.
- Bootstrap the real admin account securely; no accounts were seeded.
- Test uploads/downloads through the application when production credentials are connected. Only database/bucket configuration has been verified here.
- Complete live payment, email, scheduled-task and other readiness gates from the audit before launch.

The connected Supabase tools do not expose backup history, backup download or a dated-backup restore. Dashboard access now works, backup history is verified, and hosted database recovery has passed. Full hosted storage recovery was subsequently completed through the authenticated dashboard and a temporary test-only worker. No code merge or website production deployment was performed.

## Storage backup and local restore verified — 19 October 2026

Supabase dashboard access was established through GitHub sign-in. The earlier authentication blockage is resolved.

All 136 uploaded files were downloaded through 41 complete folder ZIP exports. The backup preserves bucket names, original object paths and the source storage metadata.

| Bucket | Access | Objects | Bytes |
| --- | --- | ---: | ---: |
| delivery-evidence | Private | 104 | 179,040,935 |
| message-attachments | Private | 5 | 10,358,355 |
| transporter-profiles | Public | 3 | 1,509,484 |
| transporter-verification | Private | 23 | 36,017,094 |
| vehicle-photos | Private | 1 | 174,623 |
| **Total** | | **136** | **227,100,491** |

Private saved artifacts, outside this repository:
- DriveDrop-storage-backup-2026-10-19.zip — 227,369,898 bytes.
- DriveDrop-storage-backup-verification-2026-10-19.json.

Archive SHA-256: b05bcbaf828879b98f6b34e2d57500bfc9286bc295c621dbc2affe66a7408c40

Verification:
- Every downloaded object's size and MD5 matched the source storage metadata ETag: 136/136.
- Before/after source inventories matched for buckets, object IDs, paths, versions, metadata, ownership and modification times. Final inventory check: 19 October 2026 03:33:59 UTC.
- The archive was restored into a new, isolated private filesystem directory. All 136 restored files matched their SHA-256 hashes; total restored bytes: 227,100,491.
- Restore files and directories have private filesystem permissions. A second run against the existing destination was refused and existing files remained unchanged.
- The archive includes manifest.json, source-inventory.json, restore_files.py and README.txt. The restore script makes no network calls, validates entries and hashes, rejects unsafe paths and refuses to overwrite an existing destination.

This local test establishes file-byte recovery only; it does not by itself establish Postgres or hosted storage recovery. The later hosted test below provides separate database and limited storage-access evidence. The original public/private bucket configuration is recorded; no source storage RLS policies were present.

## Dated database backups and hosted test

The existing project's dashboard lists these seven physical backups as COMPLETED (UTC):
- 18 October 2026 04:40:54
- 17 October 2026 04:39:13
- 16 October 2026 04:41:23
- 15 October 2026 04:40:18
- 14 October 2026 04:45:00
- 13 October 2026 04:39:08
- 12 October 2026 04:41:51

The separate-project restore workflow was opened for the selected 18 October 2026 04:40:54 UTC backup, which was the latest available at the original selection. By the time of creation, an additional completed backup dated 19 October 2026 04:41:49 UTC was visible; the test remained based on the selected 18 October snapshot. Its confirmation states that it creates a NEW project in the same organization and eu-central-1 region, copying database schema, data, indexes, roles, permissions and users. Storage objects/settings and other service settings require separate work.

The quoted additional monthly cost is $9.68 compute + $0 disk = $9.68 total. The user approved this cost, entered the new database password securely, and submitted the final form on 19 October 2026. The new project is urzkdwvfplawjvnfubda, named DriveDrop Restore Test 2026-10-19, created at 09:41:16 UTC in eu-central-1. Supabase displayed Restoration complete, and the connector independently reported ACTIVE_HEALTHY. No source or production project was used as the restore destination.

Before proceeding, a read-only source check found no pg_cron, pg_net or wrappers extension, no cron.job table, no enabled logical subscriptions and no foreign servers. This reduces the risk of cloned database jobs initiating live external work; the restored project must still be checked independently.

The selected 18 October database backup predates the 19 October storage export. Treat these as separate snapshots; do not claim they form a single transactionally consistent recovery point. The recovered schema, rows and storage metadata reflect the older database snapshot; later changes were compared explicitly.

After the file backup and again after the hosted test, the prepared production project was rechecked: zero application users, zero auth users, zero bookings and zero storage objects. The hosted test made changes only inside its separate restore project. No Vercel configuration changed; nothing was merged or published to production.

## Hosted database verification — 19 October 2026

Target: urzkdwvfplawjvnfubda only. Final check: 10:01:24 UTC.

| Check | Result |
| --- | --- |
| Recovered schema | 26 application tables, 264 columns, 15 enums, 97 constraints, 94 indexes |
| Recovered application data | 1,134 rows, including 16 users and 52 bookings |
| Supabase Auth users | 0, matching the source's application-managed authentication model |
| Referential integrity | All 45 foreign keys checked; 0 orphaned rows; 0 unvalidated constraints |
| Row-level security | Enabled on all 26 application tables; no public/storage policies |
| Security advisor | 26 informational RLS-without-policy notices; no warning/error findings |
| External database work | No pg_cron, pg_net or wrappers extension; no cron.job table, enabled logical subscription or foreign server |

Using the columns that existed in the backup, 1,128 restored rows exactly matched current-source row fingerprints. Six existing rows differed: two Booking, one BookingPayment, one Quote and two TransportJob rows. None of the restored row IDs was missing from the current source. The current source had 19 additional rows; all 19 have creation timestamps after the selected backup. This is a comparison to current data, not an independent historical checksum of the daily backup.

All 264 shared column definitions matched. The current source's later schema includes the 10-column JobDigestRun table, TransportJob.vehiclePhotoPath and User.dailyJobEmails; these are absent from the older backup as expected. The original source default cancellation fee remains 2,500 pence in the restored snapshot; the prepared production baseline remains 5,000 pence.

Full application-data fingerprints on the current source were unchanged across this test. The test project has no website or repository connected, and no application credentials, payment integrations, email configuration or scheduled tasks were connected to it.

The expected informational advisor notice is documented here:
https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

## Initial hosted storage verification — partial (superseded below)

The database restore recovered four bucket definitions and 131 storage metadata rows. Those rows are NOT evidence that their file contents were recovered. The later storage archive contains five buckets and 136 files.

Two archive files were restored at their original paths in the test project:
- transporter-profiles: 1,130,114 bytes. The authenticated dashboard preview and anonymous public URL both rendered successfully.
- delivery-evidence: 7,759 bytes. The authenticated dashboard preview rendered successfully; the unsigned public route returned 404 NoSuchBucket, preserving private-bucket behavior.

For both uploads, reported byte sizes and single-part multipart ETags matched calculations from the verified local files. Object ownership remains null, matching the source's server-upload model. This is NOT a downloaded SHA-256 verification.

A normal upload of the profile sample initially auto-renamed it with a '(1)' suffix. The original path was then restored using Replace file. That temporary duplicate remains only in the test project; no cleanup deletion was attempted. At the final check the test contained 133 metadata records, with three records written during testing (the two intended files plus the duplicate). Most copied metadata still has no restored file bytes.

Browser single-file downloads and the actual multi-file ZIP download all failed at the browser transfer layer, even though the dashboard reported successful ZIP creation and the samples rendered. A 7,759-byte upload call also took approximately 134 seconds. Further bulk uploads/readback through this unreliable route were stopped; all 136 original backup files remain intact and locally hash-verified.

Remaining work:
- Restore the remaining 134 archive objects and verify all hosted readback bytes through a reliable, authorized Storage transfer route.
- Verify hosted recovery for message-attachments, transporter-verification and vehicle-photos. The last bucket does not exist in the selected older database snapshot.
- Reconcile the two snapshot dates before a full application recovery test, then verify application-level authorization and uploads/downloads.
- Remove the temporary duplicate or retire the isolated test project only after appropriate explicit cleanup approval. The test project remains active and billable meanwhile.

Private machine-readable evidence, outside Git:
DriveDrop-hosted-restore-verification-2026-10-19.json.

At this earlier checkpoint, full hosted storage recovery was incomplete. The later section records its successful completion; overall production readiness remains pending.


## Bulk transfer tooling prepared — 19 October 2026

The backup archive was rechecked and its SHA-256 is unchanged. The isolated test project remains ACTIVE_HEALTHY, and its four existing bucket configurations match the backup. GitHub, the Supabase database connector and the signed-in dashboard respond normally. Direct Storage access from the current execution environment still fails at the configured proxy; the earlier browser download failures remain unresolved.

A guarded bulk restore tool and runbook are now available:
- `scripts/storage_restore_test.py`
- `scripts/test_storage_restore_test.py`
- `docs/storage-restore-test.md`

The tool is restricted to urzkdwvfplawjvnfubda and the exact dated archive. Default execution verifies all 136 files offline, with no network calls. Hosted writes require the explicit test destination and a securely entered legacy service_role key whose project claim matches the test. The tool preserves bucket visibility, creates only the missing private vehicle-photos bucket, uses original-path upserts, downloads and SHA-256-verifies every restored file, and tests one public/private access sample per bucket. It preserves unrelated objects, including the earlier duplicate, and can resume by rechecking every file.

Validation: the real 136-file / 227,100,491-byte archive passed offline verification, and all 16 regression tests passed without credentials or network. Tests cover the two-existing/134-remaining case, full restore and rerun, corrupted readback, private-file exposure, bucket drift, denied access, wrong-project keys, path safety, redirects and retry bounds.

These are preparation results only. The full hosted run still needs a trusted transfer environment with working Storage access and the isolated test project's credential. No additional uploaded files were restored during this preparation, no new cloud runner or Edge Function was deployed, and the remaining 134 hosted objects are still outstanding. The test project remains active; the prior cost and cleanup-approval requirements still apply.

## Server-side restore preparation checkpoint — 19 October 2026

The interrupted session was resumed. The test project is ACTIVE_HEALTHY and the dashboard remains signed in. The private `drivedrop-restore-staging-20261019` bucket already existed; it has a 20 MiB limit, no public access and no storage RLS policies.

The local archive was prepared as 15 checksum-verified binary transfer packs containing the same 136 files. The first pack, `pack-00.bin`, uploaded successfully through the dashboard; a read-only database query independently confirmed its 16,543,419-byte record. It contains 9 archive objects. This is a staging upload only: no new files were restored to original paths in this attempt, and the staged pack has not yet received a hosted SHA-256 check.

A temporary recovery worker is prepared privately but NOT deployed. It is locked to urzkdwvfplawjvnfubda, requires the test project's existing service-role authorization with gateway JWT verification, expires automatically on 21 October 2026 at 00:00 UTC, and only processes fixed paths and checksums from the private backup manifest. Its intended flow verifies each staged pack, upserts original object paths, downloads and hashes each object inside the test project, and verifies all five bucket access samples. It does not delete files, change existing bucket visibility, touch application data, or connect a website.

Ten local checks passed: service-role restriction, project restriction, corrupted pack rejection, bucket-drift rejection, original-path restoration, safe rerun, readback evidence, private access denial, corrupted readback rejection and unexpected public-access rejection. These are local tests, not hosted results.

Automatic approval review rejected the next upload (`pack-01.bin` through `pack-04.bin`), stating that explicit authorization for the sensitive backup payload and named destination was not established. No retry or alternative transfer was attempted. Further transfers are paused pending that specific approval. The user should not be asked to install software or perform manual transfer steps.

Private continuation bundle: DriveDrop-restore-resume-checkpoint-2026-10-19.zip. It contains the prepared worker, local tests, private manifest and checkpoint; no credentials or original photo bytes are included. It is saved outside Git. The original 227 MB backup remains intact.

No Edge Function was deployed, no source or prepared production data was written, no Vercel configuration changed, and no production merge/deployment occurred. Remaining original-path hosted restores: 134, plus readback verification of all 136.

## Full hosted storage restore verified — 19 October 2026

**PASS: all 136 files / 227,100,491 bytes recovered at their original paths, with matching SHA-256 readback checksums.** The user explicitly approved uploading and verifying all 136 backed-up photos, attachments and verification documents in urzkdwvfplawjvnfubda using the temporary recovery function, resolving the prior automatic-approval block.

The exact verified archive was split into 15 private transfer packs and uploaded through the signed-in Supabase dashboard into `drivedrop-restore-staging-20261019`. A temporary test-only `drivedrop-restore-worker` Edge Function verified each entire pack's SHA-256, checked every extracted object's input bytes, restored original paths with Storage API upserts, downloaded the hosted objects through the authenticated Storage API and compared their SHA-256 hashes with the fixed manifest. Hosted readback happened on the server; no browser file-download success is claimed.

| Bucket | Access | Files verified | Bytes verified |
| --- | --- | ---: | ---: |
| delivery-evidence | Private | 104 | 179,040,935 |
| message-attachments | Private | 5 | 10,358,355 |
| transporter-profiles | Public | 3 | 1,509,484 |
| transporter-verification | Private | 23 | 36,017,094 |
| vehicle-photos | Private | 1 | 174,623 |
| **Total** | | **136** | **227,100,491** |

The run restored and verified the remaining 134 files and independently reverified the two earlier samples. Those two earlier samples' browser-default cache settings were subsequently restored to their original values and their bytes reverified. Final independent SQL comparison confirmed all 136 original paths, sizes, MIME types, cache-control values and null ownership match the archive. The missing private vehicle-photos bucket was created with its recorded limits. All five bucket visibility, size-limit and MIME configurations match the backup.

Five anonymous public-route samples passed: transporter-profiles returned HTTP 200 and the expected bytes/hash; each of the four private buckets returned HTTP 400 with a not-found/denied response. Every private object's authenticated readback already passed during restoration. These are Storage-level checks, not application-role authorization tests.

The complete per-file server reports were exported as JSON from the dashboard, then independently compared against the local archive manifest: 15 complete reports, 136 unique expected paths, matching per-file sizes/hashes and matching pack hashes. No missing, duplicate or unexpected path appears in the verified 136-file set.

The test retains 137 application-bucket object records: the 136 expected files plus the previously documented profile '(1)' duplicate, which was not deleted. The separate private staging bucket retains 15 packs and 15 reports. No source files were deleted or replaced.

The worker required the test project's existing service-role credential and gateway JWT verification throughout. No key was copied into chat, source control or reports. An unauthenticated request was rejected with HTTP 401. Thirteen local worker checks passed. After the successful report was independently validated, the worker was replaced with an inert handler; an authenticated test confirmed HTTP 410 and `recovery_worker_enabled: false`. The current function has no file-access or mutation logic.

Source User, Booking and full Storage metadata fingerprints matched before/after the hosted run: 16 application users, 52 bookings and 136 storage objects. Prepared production remained at zero application users, auth users, bookings and storage objects, with matching empty fingerprints. The recovered test application still has 16 users and 52 bookings. No Vercel setting, source/production database data, merge or production deployment was changed.

Private saved evidence:
- `DriveDrop-hosted-storage-readback-2026-10-19.json`: full per-file SHA-256 reports, bucket access results, independent inventory/fingerprint checks, worker source/local tests and disabled-worker confirmation.
- The original `DriveDrop-storage-backup-2026-10-19.zip` remains unchanged; archive SHA-256 is `b05bcbaf828879b98f6b34e2d57500bfc9286bc295c621dbc2affe66a7408c40`.

**Still pending:** reconcile the 18 October database snapshot with the 19 October file snapshot before claiming complete application recovery; verify application-role authorization/uploads/downloads; finish payment, email, scheduled-task and other launch gates. The test project was subsequently deleted after explicit cleanup approval; see the final cleanup section.

## Cleanup and launch configuration review — 19 October 2026

This section records the pre-approval checkpoint. The deletion block was subsequently resolved by explicit user approval; cleanup is complete as recorded below.

The user asked to continue after the recovery explanation. Deletion of **DriveDrop Restore Test 2026-10-19** (`urzkdwvfplawjvnfubda`) was prepared in the dashboard. Automatic approval review rejected the final action because explicit approval of the named project's permanent deletion and all its test data was not established. **The project was not deleted; it remains ACTIVE_HEALTHY and billable.** The disabled recovery worker remains in place. A concrete deletion confirmation is pending; do not retry deletion through another interface to bypass the review.

Before cleanup, the saved original storage archive (227,369,898 bytes) and completed hosted verification report (135,202 bytes) were confirmed present with their persisted file identities. The original/shared and prepared-production projects are separate from the test destination.

A read-only review of the `feature/ui-polish` code at `f2d1d32c324ac23c6a8af45038b3653ca80338ca` and current Vercel project environment metadata confirmed:

| Gate | Current evidence | Work required before launch |
| --- | --- | --- |
| Payment integration | No `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` or `CRON_SECRET` entry is present in the project's environment metadata. The provider falls back to TEST without a Stripe key and explicitly rejects the production environment. | Configure branch-scoped Stripe **test** credentials, webhook delivery and authenticated payment reconciliation; complete real Stripe test-mode authorisation/capture/release/retry tests. Live payments, transporter payouts and real refunds need their separately reviewed implementation and rollout. |
| Production email | `RESEND_API_KEY` is scoped only to preview. `src/lib/email.ts` explicitly returns false for production notifications. | Verify the sender/domain and intended messages, prepare production configuration and an explicit production enablement change, then obtain approval for actual test sends to named recipients. Adding a production key alone will not enable email. |
| Scheduled work | `CRON_SECRET` is absent. The booking-authorisation and daily-summary routes deny requests when it is missing. `vercel.json` contains daily summary, quote-expiry and insurance-expiry schedules, but no booking-authorisation schedule. | Configure authenticated scheduling and retries in the appropriate environment, including payment reconciliation before using real Stripe test holds. The existing runbooks require a separate preview scheduler because Vercel Cron runs on production deployments. Do not invoke email/payment jobs merely to inspect them. |
| Database separation | Project metadata still scopes `POSTGRES_PRISMA_URL` to production and preview together, and the server Storage settings to production/preview/development. No branch-specific override was returned. | At the explicitly approved cutover, assign prepared-production-only database/storage credentials and preserve preview's working configuration. |
| Full application acceptance | Storage-byte and dated database recovery passed; no application was connected to the restore project. | Complete role authorization, uploads/downloads and the marketplace acceptance flow in an isolated test environment; reconcile recovery-point differences before claiming complete application recovery. |

The latest inspected preview deployment for the reviewed commit was READY (`dpl_Bm99BRu9jstynDRfWLyMpirvRYeh`). This is build/deployment evidence, not a live payment or full application acceptance result. Environment values were not decrypted or displayed.

Independent read-only checks again found source counts of 16 users, 52 bookings and 136 Storage records with the same full User, Booking and Storage metadata fingerprints as the completed restore test. Prepared production remained empty (zero users, auth users, bookings and Storage objects) with matching empty fingerprints.

This continuation changed documentation only. No environment variable, production guard, database row, live payment, email send, scheduler or production deployment was changed.

## Approved test-project deletion completed — 19 October 2026

The user explicitly approved permanent deletion of **DriveDrop Restore Test 2026-10-19** (`urzkdwvfplawjvnfubda`), including its database, uploaded test files and recovery function, after the irreversible consequences and the separation from preview were explained.

The named project was deleted through its Supabase dashboard confirmation. The dashboard returned to the organization's project list without the restore test, and the Supabase connector independently returned only the original/shared project, prepared DriveDrop Production project and unrelated AutoMove project. Deletion was verified by 12:20 UTC (13:20 BST). No alternate interface was used to bypass the earlier approval review.

Post-deletion checks:
- Original preview/shared `yozbuuvebzxitoqrvyer`: ACTIVE_HEALTHY; 16 application users, 52 bookings, 0 Supabase Auth users and 136 Storage records.
- Original full User, Booking and Storage metadata fingerprints exactly match the pre-deletion/restore-run values.
- Prepared production `srqhjgrhgyyfdaxckjum`: ACTIVE_HEALTHY; zero users, auth users, bookings and Storage records, with the same empty fingerprints.
- The privately saved original storage archive remains 227,369,898 bytes, SHA-256 `b05bcbaf828879b98f6b34e2d57500bfc9286bc295c621dbc2affe66a7408c40`.
- The privately saved completed hosted verification report remains 135,202 bytes, SHA-256 `a653ba7a9d89c47d60c201df90d38118d642354435ae082f194e022ce5bffa4f`. Its historical evidence is unchanged.

Deleting the disposable project removes its restored copies, staging packs/reports, temporary duplicate and disabled worker. It stops further usage for that project; usage already incurred can still appear on the bill. Supabase's documented behavior: https://supabase.com/docs/guides/platform/delete-project

The recovery test is closed. The fixed-target Python hosted restore instructions are now historical because their destination no longer exists; offline archive verification remains usable. Any future hosted test requires a newly reviewed isolated destination.

No preview/source or prepared-production data, website environment settings or application code changed. No production merge or production deployment was performed. Payment, email, scheduling, cutover and full application-acceptance gates remain as recorded above.
