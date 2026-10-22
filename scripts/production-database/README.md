# Proposed production schema delta

**Unapplied.** This is a separate, reviewed additive migration for the empty prepared production project `srqhjgrhgyyfdaxckjum`. It is outside the historical Prisma migration chain deliberately. Do not run `db:push`, replay that chain, or apply the baseline script to either hosted project.

Candidate: `supabase/migrations/20261021193022_production_payment_schema.sql`, named using Supabase CLI 2.121.0. Execute the entire file in **one transaction** only after the remaining acceptance gates and an exact hosted change approval. The actual applied Supabase migration version/name must be recorded at that later step.

Preflight locks the existing public tables, requires the known single baseline migration and empty application/auth/storage data, checks the complete reviewed schema/bucket fingerprint, and rejects client privileges, including PostgreSQL 17 `MAINTAIN`. It refuses drift or a repeat application. Postflight checks 31 tables, 377 columns, 140 constraints, 121 indexes, RLS, effective table/function access and the unchanged 5,000p cancellation fee.

The delta adds four payment tables and two payout enum values. It retains all final refund constraints and four alternative-refund audit triggers, changes the four new environment checks to `production` only, and adds the private `drivedrop_production_ops.booking_authorisation_runs` lease log. It grants the service role access and explicitly revokes PUBLIC/anon/authenticated access, including rights inherited from broad default ACLs. No accounts, files, scheduler, secret, HTTP extension or preview data is copied.

Unmodified source migration SHA-256 values:

| Source under `prisma/migrations` | SHA-256 |
| --- | --- |
| `20261019213129_stripe_connect_sandbox/migration.sql` | `95a2ed292d38f7d0f2092826ac2e134bab1a10f41d28d4dc35b720cca20b90cf` |
| `20261020193911_stripe_refund_sandbox/migration.sql` | `8f9430b99b5a222c509e7f89c503cf61df5c8c4e92b83aa4372b5952d8c0bc46` |
| `20261020220726_stripe_refund_late_failure/migration.sql` | `787bd9b8e38829529441f30d0b05e9f657d497295f0376ec53e267996044e054` |
| `20261021125850_alternative_refund/migration.sql` | `ed6a74bf9cdbe5f746417d37d790437c902d8ce34a7e6c2f68a8a62dc0987983` |

## Reproduce the local rehearsal

Use an empty, disposable PostgreSQL **17.11** cluster with a local administrator role and `psql` on PATH. The script accepts only a localhost URL with an explicit port and database name starting `drivedrop_rehearsal_`; connection overrides are rejected. It creates minimal local Auth/Storage/role stubs and leaves the migrated schema for inspection. Synthetic financial fixtures roll back. It must not run against a shared local cluster because it creates cluster roles if absent.

```bash
REHEARSAL_DATABASE_URL=postgresql://postgres@127.0.0.1:55432/drivedrop_rehearsal_payments \
  node scripts/rehearse-production-database.cjs
```

For the portable WASM check, install `@electric-sql/pglite@0.3.14` outside the application and point `PGLITE_MODULE` to its absolute package directory, then run the same script. It uses an in-memory database and reports its actual version. `REHEARSAL_REPORT` optionally sets the JSON output path; the default is `/tmp/drivedrop-production-database-rehearsal.json`.

The recorded run used PostgreSQL **17.5 / WASM**, not native 17.11. The 17.11 source downloaded from PostgreSQL and its checksum/build succeeded, but this workspace maps only UID 0 and blocks a non-root user namespace. PostgreSQL's non-root requirement was preserved; the native server could not start. The WASM baseline fingerprint exactly matched prepared production, and transactional DDL, negative preconditions, audit triggers, privileges and lease uniqueness passed. Native 17.11, real multi-connection locking and the Prisma-backed booking-authorisation suite remain release gates. See [rehearsal evidence](../../docs/evidence/production-payment-database-rehearsal.json).

### Native CI rehearsal

`.github/workflows/production-payment-rehearsal.yml` is a separate feature-branch test job using an ephemeral `postgres:17.11-bookworm` service on a standard Ubuntu runner. It uses no repository secrets, hosted services, deployment command or artifact upload. Action references are pinned to commits; dependencies come from the existing lockfile. Evidence is recorded in the job logs and summary, including the tested commit and source hashes. A green run is required before changing the native gate's status.

The schema script requires exactly native PostgreSQL 17.11 in this job. The next script calls the actual production recovery worker through separate Prisma connections: advisory-lock contention, six competing claims, an expired lease, late completion, stage failure, configuration rejection and health reporting. The booking suite then tests real database transactions with offline Stripe fixtures in production mode. A deliberately failed booking commit leaves a real `CAPTURING` request; the actual dispatcher must recover it with new payment creation paused, one booking and one financial event, without another capture. Notifications and transfer/refund provider stages are inert fixtures. This is neither live Stripe evidence nor a hosted scheduling/delivery check.

For native reproduction, set `POSTGRES_PRISMA_URL` to the same disposable URL as `REHEARSAL_DATABASE_URL`, set `VERCEL_ENV=preview`, and run the schema script, `scripts/test-native-payment-recovery.cjs`, and `scripts/test-booking-authorisation.cjs` in that order. The latter scripts leave labelled synthetic rows in the disposable cluster; destroy that cluster after inspection. Their Prisma datasource is explicitly bound to the validated localhost URL before production-shaped configuration fixtures are loaded. Never copy these fixtures or credentials to a hosted environment.

There is no destructive down migration. A failed one-transaction application rolls back. After live activity, retain tables, audit evidence, reservations and provider identifiers; use a compatible deployment or a forward fix. The old production build is not a safe fallback after live payments. See the [rollout plan](../../docs/production-payment-rollout-plan.md).
