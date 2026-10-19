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

- Dated database recovery is verified: the selected 18 October 2026 04:40:54 UTC physical backup was restored to a separate hosted test project on 19 October. Database integrity and snapshot comparisons passed; details below.
- Storage byte backup and an isolated local file restore are complete: all 136 files match their SHA-256 hashes. Hosted storage verification is PARTIAL: two original-path samples were restored and public/private access behavior checked, but hosted download hash verification is blocked.
- Finish the full hosted storage restore/readback in urzkdwvfplawjvnfubda (DriveDrop Restore Test 2026-10-19). The remaining 134 archive objects, three other buckets and application-level access checks are not verified there. Neither the working preview nor the prepared production project is a restore-test target. The approved test project remains active at the quoted additional $9.68/month compute cost.
- Keep credentials and personal-data backups out of this repository. The storage archive and verification report have been saved privately outside Git.
- Configure production-only database/storage credentials at cutover; retain preview's existing credentials.
- Bootstrap the real admin account securely; no accounts were seeded.
- Test uploads/downloads through the application when production credentials are connected. Only database/bucket configuration has been verified here.
- Complete live payment, email, scheduled-task and other readiness gates from the audit before launch.

The connected Supabase tools do not expose backup history, backup download or a dated-backup restore. Dashboard access now works, backup history is verified, and hosted database recovery has passed. Full hosted storage recovery remains incomplete. No code merge or website production deployment was performed.

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

## Hosted storage verification — PARTIAL

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

The 136-file backup/local restore and the hosted database restore are verified. Full hosted storage recovery and overall production readiness are NOT yet complete.


## Bulk transfer tooling prepared — 19 October 2026

The backup archive was rechecked and its SHA-256 is unchanged. The isolated test project remains ACTIVE_HEALTHY, and its four existing bucket configurations match the backup. GitHub, the Supabase database connector and the signed-in dashboard respond normally. Direct Storage access from the current execution environment still fails at the configured proxy; the earlier browser download failures remain unresolved.

A guarded bulk restore tool and runbook are now available:
- `scripts/storage_restore_test.py`
- `scripts/test_storage_restore_test.py`
- `docs/storage-restore-test.md`

The tool is restricted to urzkdwvfplawjvnfubda and the exact dated archive. Default execution verifies all 136 files offline, with no network calls. Hosted writes require the explicit test destination and a securely entered legacy service_role key whose project claim matches the test. The tool preserves bucket visibility, creates only the missing private vehicle-photos bucket, uses original-path upserts, downloads and SHA-256-verifies every restored file, and tests one public/private access sample per bucket. It preserves unrelated objects, including the earlier duplicate, and can resume by rechecking every file.

Validation: the real 136-file / 227,100,491-byte archive passed offline verification, and all 16 regression tests passed without credentials or network. Tests cover the two-existing/134-remaining case, full restore and rerun, corrupted readback, private-file exposure, bucket drift, denied access, wrong-project keys, path safety, redirects and retry bounds.

These are preparation results only. The full hosted run still needs a trusted transfer environment with working Storage access and the isolated test project's credential. No additional uploaded files were restored during this preparation, no new cloud runner or Edge Function was deployed, and the remaining 134 hosted objects are still outstanding. The test project remains active; the prior cost and cleanup-approval requirements still apply.
