# Availability confirmation before booking

Implementation is for `feature/ui-polish`. Do not apply the migration or publish this commit while preview uses the production database without explicit approval for that shared database change. Inspection on 7 October 2026 found one `POSTGRES_PRISMA_URL` environment entry targeting both production and preview, with no branch override.

## Flow

1. Customer selects a live quote and reviews the agreed collection date/window. No booking or payment record is created yet.
2. An owner-scoped availability request appears on customer Quote requests and transporter My quotes. Selection sends an in-app notification and transactional email using the existing delivery helpers.
3. Transporter confirms the collection window and chooses the preparation/travel time they need (minimum 30 minutes). They can decline without a fine.
4. Customer sees the exact UK payment deadline. The existing **TEST** payment provider is available only outside production; there is no live card processor in the current repository. This change does not pretend to add one.
5. Successful test capture atomically creates the paid booking, accepts the selected quote and closes remaining pending quotes. The customer moves to Your deliveries. Normal messaging, collection, delivery, receipt and payout workflows continue there.
6. Declines, withdrawals, timeouts and unpaid reservations do not incur a cancellation fine. The £50 transporter fine requires an active, fully-paid booking. Cancelled booking/payment history is preserved on rebooking.

## Timings

All dates and deadlines use Europe/London, including GMT/BST.

- Collection times are mandatory for same-day requests, including old/future requests selected on the collection day. Both times are optional for future dates.
- Normal response allowance: 12 hours counted between 08:00 and 20:00 UK time; the clock pauses overnight.
- Same-day response allowance: up to 1 hour, starting no earlier than 08:00 and ending no later than 20:00. Late-night same-day requests require a later collection date/window.
- Response deadlines are also capped by the offer expiry and by the collection cutoff, reserving payment time and a minimum 30-minute travel allowance. At least 15 minutes must remain to respond.
- Payment allowance: 2 hours normally, 30 minutes for same-day collection, capped by collection cutoff minus the transporter's chosen travel allowance. At least 15 minutes must remain when confirmation is issued.
- A future date without an agreed time uses end-of-day only as a calendar expiry limit; no collection appointment is invented.
- Quote expiry is independent from request collection-date expiry. Once confirmed, the displayed payment reservation remains valid to its pay-by time.
- Server mutations enforce deadlines immediately. Account reads lazily mark timed-out reservations expired and notify the customer; there is no preview-specific background scheduler.

## Data and security

Migration `20261007114426_availability_confirmation` adds two nullable collection-window fields to TransportJob, nullable Quote.expiresAt, and AvailabilityRequest. No existing rows are deleted. The new table has RLS enabled and no anon/authenticated Data API grants; DriveDrop's server sessions authorize each operation.

Every selection, confirmation, capture, quote revision and date negotiation locks the same job row. A nullable unique activeJobId enforces one live reservation per job; Booking's existing job/quote uniqueness remains. Repeated capture returns the original booking without changing its delivery status. Withdrawing a reservation and capture compete under the same lock. Confirmation history remains after expiry.

## Verification

- `node scripts/test-availability-time.cjs`: UK clock changes, same-day/future dates, overnight clocks, exact expiry boundaries and travel cutoffs.
- `POSTGRES_PRISMA_URL=<disposable localhost database> VERCEL_ENV=preview node scripts/test-availability-db.cjs`: real Prisma queries against a disposable PostgreSQL-compatible database, including owner checks, decline/no fine, timeout, late payment, parallel clicks, price/commission, repeat capture and cancelled-booking retention. The script refuses non-local database hosts.
- Full Next build and TypeScript validation.
- Browser flow through both signed-in accounts at 1440px. These are test accounts in a local isolated database, not a live signed-in Vercel review.

Before preview rollout: approve the shared database additions or provision a separate preview database; apply the migration to the approved target; deploy the commit to the preview branch; verify the deployment and repeat the signed-in flow. Production application code must remain on its existing branch until separately approved. Do not enable real charges until a real payment provider and verified webhook/late-payment refund path are implemented.
