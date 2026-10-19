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

- Verify dated backups in Supabase dashboard for the existing project. Pro plan eligibility alone is not evidence a particular backup can be restored.
- Back up actual storage file bytes separately; database backups include object metadata, not uploaded file contents.
- Restore a backup to an isolated destination and compare data counts and representative file hashes/access permissions. Do not restore over the working preview.
- Keep credentials and personal-data backups out of this repository. Choose a protected durable backup destination before exporting.
- Configure production-only database/storage credentials at cutover; retain preview's existing credentials.
- Bootstrap the real admin account securely; no accounts were seeded.
- Test uploads/downloads through the application when production credentials are connected. Only database/bucket configuration has been verified here.
- Complete live payment, email, scheduled-task and other readiness gates from the audit before launch.

The connected Supabase tools do not expose backup history, backup download or restore.
Backup verification is still incomplete. No code merge or website production deployment was performed.

## Backup connectivity and inventory checkpoint — 19 October 2026

GitHub file access and Supabase project/SQL access responded successfully in the continuation session. Both Supabase projects reported ACTIVE_HEALTHY.
The browser also responded, but it was not signed in to Supabase. Automated sign-in is incomplete: after the selected GitHub / Apple sign-in route, automatic approval review blocked access to Apple's authentication origin pending explicit user authorization. Do not treat a submitted sign-in choice as successful authentication.

The existing project's storage inventory was re-counted with read-only SQL:

| Bucket | Access | Objects | Bytes |
| --- | --- | ---: | ---: |
| delivery-evidence | Private | 104 | 179,040,935 |
| message-attachments | Private | 5 | 10,358,355 |
| transporter-profiles | Public | 3 | 1,509,484 |
| transporter-verification | Private | 23 | 36,017,094 |
| vehicle-photos | Private | 1 | 174,623 |
| **Total** | | **136** | **227,100,491** |

These byte totals are database metadata, not proof that the file contents have been downloaded or verified.
No storage RLS policies were returned for the source project. Preserve the bucket visibility configuration and verify actual download behavior during the restore test.

The new production project was rechecked: zero application users, zero auth users, zero bookings and zero storage objects.

Bulk export has NOT started. No durable file backup, file-content hashes or isolated restore result is available yet. The connector exposes storage metadata through SQL but does not expose storage file downloads; dashboard access or an authenticated storage client is still needed.

Resume by completing authorized Supabase dashboard authentication, verifying dated database backups, and selecting a protected durable destination outside Git. Export the actual bytes and a manifest of bucket, object path, size, content type and SHA-256. Check the source inventory again to detect changes during export. Restore into a separate disposable test destination; neither yozbuuvebzxitoqrvyer nor srqhjgrhgyyfdaxckjum is a restore-test target. Compare all 136 file hashes and counts, then verify private/public access behavior before marking the restore gate complete.

This continuation made no database/storage changes, changed no Vercel configuration and did not merge or publish to production.
