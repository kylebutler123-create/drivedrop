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

No accounts, sessions, bookings, test payments or files were copied.
Verified new production: zero users, zero bookings, zero storage objects.
No Vercel environment variables changed; neither website was switched to the new project.
The existing production website and preview therefore remain connected to the original shared project until an explicitly approved cutover.

## Outstanding gates

- Dated database backup availability is verified: seven COMPLETED physical backups dated 12–18 October 2026. The latest is 18 October 2026 04:40:54 UTC. Actual hosted recovery is still untested.
- Storage byte backup and an isolated local file restore are complete; see verification below. This does not establish a database restore or hosted storage access test.
- Restore the dated database backup to a separate disposable hosted project, compare recovered data, and test restored storage access. Neither the working preview nor the prepared production project is a restore-test target. The separate-project restore is awaiting approval of Supabase's quoted extra cost.
- Keep credentials and personal-data backups out of this repository. The storage archive and verification report have been saved privately outside Git.
- Configure production-only database/storage credentials at cutover; retain preview's existing credentials.
- Bootstrap the real admin account securely; no accounts were seeded.
- Test uploads/downloads through the application when production credentials are connected. Only database/bucket configuration has been verified here.
- Complete live payment, email, scheduled-task and other readiness gates from the audit before launch.

The connected Supabase tools do not expose backup history, backup download or a dated-backup restore. Dashboard access now works, and backup history has been verified there. Full hosted recovery remains incomplete. No code merge or website production deployment was performed.

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

This is a verified file-byte recovery test. It does NOT restore the Postgres database or verify hosted Supabase uploads, object ownership, bucket access behavior or application behavior. The original public/private bucket configuration is recorded; no source storage RLS policies were present.

## Dated database backups and pending hosted test

The existing project's dashboard lists these seven physical backups as COMPLETED (UTC):
- 18 October 2026 04:40:54
- 17 October 2026 04:39:13
- 16 October 2026 04:41:23
- 15 October 2026 04:40:18
- 14 October 2026 04:45:00
- 13 October 2026 04:39:08
- 12 October 2026 04:41:51

The separate-project restore workflow was opened for the latest dated backup. Its confirmation states that it creates a NEW project in the same organization and eu-central-1 region, copying database schema, data, indexes, roles, permissions and users. Storage objects/settings and other service settings require separate work.

The quoted additional monthly cost is $9.68 compute + $0 disk = $9.68 total. The Continue button has NOT been pressed; no test project has been created. User approval of this quoted cost is required before proceeding.

The latest daily database backup predates the storage export. Treat these as separate snapshots; do not claim they form a single transactionally consistent recovery point. When the hosted restore is approved, validate data against that dated snapshot and account for files added afterward.

After the file backup, the prepared production project was rechecked: zero application users, zero auth users, zero bookings and zero storage objects. This continuation made no database/storage changes, changed no Vercel configuration and did not merge or publish to production.
