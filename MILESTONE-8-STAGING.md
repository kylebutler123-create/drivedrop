# DriveDrop Milestone 8 — Staging & End-to-End Test Pack

This milestone prepares the hardened application for a repeatable staging run. It does **not** claim that a remote staging deployment has been created from this offline build environment.

## Added
- Local PostgreSQL 16 staging service via `docker-compose.staging.yml`.
- Staging environment template with sandbox finance explicitly enabled.
- Lightweight staging smoke-test script covering the public app, health endpoint, auth pages and three role dashboards.
- Repeatable staging runbook and end-to-end marketplace acceptance checklist.

## Run locally / on a staging host
1. Copy `.env.staging.example` to `.env.local` and replace credentials for any shared environment.
2. `npm install`
3. `npm run staging:db`
4. `npm run db:generate`
5. `npm run db:migrate`
6. `npm run dev`
7. In another terminal: `npm run staging:check`
8. Complete `E2E-ACCEPTANCE.md` with separate customer, transporter and admin sessions.

## Current verification status
Dependency installation was attempted in this environment but timed out before Prisma/Next.js became available, so `prisma validate`, typecheck and `next build` could not be honestly marked as passed. No remote PostgreSQL or hosting credentials were supplied, so no external staging deployment was attempted.

## Gate before live payments
All items in `E2E-ACCEPTANCE.md` must pass against a clean staging database, and `npm run check` must pass after dependencies are installed.
