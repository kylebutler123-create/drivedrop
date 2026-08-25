# DriveDrop Production — Milestone 3

Milestone 3 adds a persistent delivery lifecycle to the Milestone 2 marketplace core.

## Added
- Booking statuses: confirmed, collection scheduled, collected, in transit, arriving soon, delivered
- Persistent `TrackingEvent` audit trail in PostgreSQL
- Role-protected delivery status API for the assigned transporter or admin
- Valid status-transition enforcement
- Transporter active-delivery controls
- Customer delivery timeline with periodic refresh
- Admin visibility into the same tracking events
- Jobs automatically become `COMPLETED` when delivery is completed

## Existing core
- Customer/transporter registration and login
- Secure HTTP-only sessions and password hashing
- Customer / Transporter / Admin roles
- Persistent jobs and quotes
- Transactional quote acceptance and locked booking price

## Run locally
1. Copy `.env.example` to `.env` and set `DATABASE_URL` to PostgreSQL.
2. `npm install`
3. `npm run db:generate`
4. `npm run db:push`
5. `npm run dev`

## Important
This milestone does not process real payments or provide true GPS tracking. Delivery tracking is event/status based. Real payment integration should be added only after the core transaction and security flows are tested.


## Milestone 4
- Persistent booking messages between customer and transporter
- Collection and delivery evidence records
- Customer delivery confirmation
- One verified review per completed/confirmed booking
- Admin visibility into messages, evidence and review state

### Evidence storage note
Milestone 4 stores secure image URLs in PostgreSQL. In production, connect the evidence UI to an object-storage provider (for example S3-compatible storage) and pass the resulting private/signed URL to the evidence API. Do not rely on arbitrary public URLs for launch.


## Milestone 5 — Transporter Verification
- Transporter business verification profile
- Insurance/company/identity/operator-licence document records
- Policy/reference and document expiry dates
- Submit-for-review workflow
- Admin approve, reject and suspend controls
- DriveDrop Verified badge on customer-facing quotes when approved
- Verification review notes and audit timestamps

### Security note
Document records currently store secure URLs. Production launch must use private object storage, short-lived signed access URLs, malware scanning, strict MIME/size validation, access logging, and retention/deletion rules. Verification approval should also be backed by documented DriveDrop operating procedures.


## Milestone 6 — Test-mode finance
Adds persistent booking payment records, configurable deposit and commission percentages, sandbox customer deposit capture, refund accounting, transporter payout status, finance events, and admin finance visibility. No live payment provider is connected and no real funds should be accepted through these test routes.

## Milestone 7 — Production hardening
- Added same-origin protection for mutating API calls and baseline security headers/CSP.
- Added database health endpoint at `/api/health`.
- Added Prisma migration directory plus indexes and one-quote-per-transporter-per-job constraint.
- Hardened quote submission against closed jobs and duplicate transporter quotes.
- Test payment capture is blocked in production by default and is idempotent for an already-captured deposit.
- Added `db:validate`, `db:migrate`, `typecheck`, and combined `check` scripts.
- Added `SECURITY.md` launch checklist.

### Recommended verification
`npm ci` (or `npm install` if no lockfile), `npm run db:generate`, `npm run db:validate`, `npm run typecheck`, `npm run build`.
Use `prisma migrate deploy` against a staging PostgreSQL database before production.
