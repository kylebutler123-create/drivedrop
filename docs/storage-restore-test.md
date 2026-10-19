# Bulk Storage restore test

Prepared on 19 October 2026. **The hosted run is still pending.**

The tool is `scripts/storage_restore_test.py`. It uses Python 3.10 or later and
only the standard library. It is locked to **DriveDrop Restore Test 2026-10-19**
(`urzkdwvfplawjvnfubda`) and the exact verified 19 October storage archive.

## What it does

- Verifies the archive SHA-256 and all 136 files before making any network call.
- Checks the existing buckets' visibility, size limits and MIME restrictions.
- Creates the missing private `vehicle-photos` bucket with its recorded limits.
- Downloads each existing original path and checks its SHA-256. Matching files
  are skipped; missing or mismatched file contents are uploaded at the original
  path using the Storage API's upsert option.
- Downloads every uploaded file and requires a matching size and SHA-256.
- Checks one anonymous download per bucket: the public profile sample must
  match, and all four private samples must deny access.
- Saves a private JSON report next to the archive, checkpointed after each
  completed file. A second run rechecks all files and skips matching content.

The tool never deletes objects or changes existing bucket settings. The earlier
temporary `(1)` duplicate is preserved. It does not change the database schema,
application rows, website settings, source project or production project.
Objects outside the archive are not inventoried by this script.

## Run from a trusted computer

1. Download `DriveDrop-storage-backup-2026-10-19.zip` from the saved backup.
   Keep it in a private folder outside this repository and outside any shared
   cloud folder. Leave it zipped.
2. Download `scripts/storage_restore_test.py` from `feature/ui-polish` into the
   same private folder. Use Python 3.10+; there are no packages to install.
3. Open a terminal in that folder and run the offline check first:

   ```sh
   python3 storage_restore_test.py
   ```

   On Windows, use `py -3` in place of `python3` if that is how Python is installed.

   Expected: `Backup verified: 136 files, 227100491 bytes.` followed by the
   message that no network calls or hosted changes were made.

4. In Supabase, select **DriveDrop Restore Test 2026-10-19** and confirm its
   project reference is `urzkdwvfplawjvnfubda`. In its API Keys settings, find the
   legacy **service_role** key. This is a privileged key belonging only to the
   disposable test project. Use the existing test key; do not rotate project
   credentials, use a source/production key, or create a personal access token.
5. Start the hosted restore with the explicit test destination:

   ```sh
   python3 storage_restore_test.py --restore-to urzkdwvfplawjvnfubda
   ```

   Paste the test key only into the script's hidden terminal prompt. Do not paste
   it into chat, a command, a source file, a notebook or a report. The prompt
   refuses to run if hidden input is unavailable. The script rejects keys whose
   project claim is not the isolated test or whose role is not `service_role`.
   Supabase, not the local claim check, verifies the key's signature.
6. Wait for `PASS: all 136 hosted files match; five bucket access samples passed.`
   Keep the generated `DriveDrop-hosted-storage-readback-*.json` report private.
   Share that report for review when the run finishes; it contains no key.

If the connection drops, rerun the same command and enter the key again. The
tool downloads and rechecks every object; it does not trust an old report to
skip verification. A failed run is recorded as failed and never marked passed.

The script requires working HTTPS access to the test project's Supabase Storage
endpoint. It preserves the configured proxy and normal certificate checks;
redirects are refused to prevent forwarding credentials to another destination.
Its default concurrency is three files, with bounded retries and request timeouts.
`--workers 1` can reduce load on a slow connection. Keep the computer awake.

## Acceptance checks after the hosted run

- Report status `passed`, 136 verified objects, 227,100,491 verified bytes and
  five passed bucket access samples.
- Independently check the test project's bucket configuration, object count,
  original paths and null object ownership. Account for the preserved duplicate.
- Verify source and prepared production remain unchanged.
- Reconcile the older database snapshot with the later file snapshot before
  claiming a complete application recovery. This tool verifies file bytes and
  bucket access samples, not application authorization or database consistency.
- Retire the test project only after explicit cleanup approval.

## Preparation evidence

The original archive was rechecked with this tool: 136 files / 227,100,491 bytes,
with no network calls. Sixteen offline tests passed, covering full restore,
resuming with 134 files remaining, rerunning without uploads, hash corruption,
private-file exposure, unexpected bucket settings, denied access, rejected
source/production keys, unsafe paths, refused redirects and bounded retries.

Run the tests without any credentials or network:

```sh
cd scripts
python3 -m unittest -v test_storage_restore_test.py
```

These offline results are **not evidence of a completed hosted restore**.

Implementation references:
- https://supabase.com/docs/guides/storage/uploads/standard-uploads
- https://supabase.com/docs/guides/storage/management/download-objects
- https://supabase.com/docs/reference/self-hosting-storage
- https://github.com/supabase/storage-js/blob/main/src/packages/StorageBucketApi.ts
