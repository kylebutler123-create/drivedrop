# Staging runbook

## Local repeatable staging database
`npm run staging:db`

The included Docker Compose file is for local/staging testing only. Change its password before using it on any shared host.

## Application setup
Copy `.env.staging.example` to `.env.local`, then run:

```
npm install
npm run db:generate
npm run db:migrate
npm run check
npm run dev
```

Run smoke checks in a second terminal:

```
npm run staging:check
```

## Shared/remote staging
Use a dedicated PostgreSQL database and a non-production hostname. Set `ALLOW_TEST_FINANCE=true` only there. Run migrations with `npm run db:migrate`; do not use `prisma db push` for the release path.

## Reset policy
Prefer a fresh disposable staging database for destructive end-to-end test cycles. Never point staging commands at the production database.
