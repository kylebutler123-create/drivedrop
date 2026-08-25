# DriveDrop staging acceptance checklist

Use three separate browser sessions: Customer, Transporter and Admin. Use only sandbox/test finance.

## Environment
- [ ] PostgreSQL is healthy.
- [ ] `npm run db:migrate` succeeds on a clean staging database.
- [ ] `npm run check` succeeds.
- [ ] `/api/health` returns a successful database health response.
- [ ] `ALLOW_TEST_FINANCE=true` only in staging; production remains false/absent.

## Authentication / authorization
- [ ] Customer can register, log out and log back in.
- [ ] Transporter can register, log out and log back in.
- [ ] Customer cannot call transporter-only quote/status actions.
- [ ] Transporter cannot create customer jobs or access another transporter's booking updates.
- [ ] Non-admin cannot access admin data.

## Marketplace transaction
- [ ] Customer creates a vehicle transport job and it persists after refresh/login.
- [ ] Transporter sees the open job and submits one quote.
- [ ] Duplicate quote from the same transporter is rejected.
- [ ] Customer sees the quote and accepts it.
- [ ] One booking is created; agreed price equals accepted quote.
- [ ] Other quotes are declined and the job becomes BOOKED.
- [ ] Further quotes against the booked job are rejected.

## Sandbox finance
- [ ] Booking creates a finance record with configured deposit and commission.
- [ ] Customer sandbox deposit capture succeeds once.
- [ ] Repeating sandbox deposit capture is idempotent and does not double-charge the record.
- [ ] Admin can inspect payment and finance events.
- [ ] Refund/payout test actions respect permissions and valid states.

## Delivery lifecycle
- [ ] Transporter moves booking through Collection Scheduled/Collected → In Transit → Arriving Soon/Delivered.
- [ ] Invalid state jumps are rejected.
- [ ] Customer and admin see the same persisted status and tracking history.
- [ ] Delivered job becomes COMPLETED.

## Messaging / evidence / review
- [ ] Customer and assigned transporter can exchange booking messages.
- [ ] Unrelated users cannot post/read booking messages.
- [ ] Transporter can attach collection and delivery evidence records.
- [ ] Customer confirms receipt only after delivery.
- [ ] Customer can leave exactly one verified review after confirmation.

## Verification
- [ ] Transporter can submit verification/business/document metadata.
- [ ] Admin can approve/reject/suspend verification.
- [ ] Approved transporter displays DriveDrop Verified to customers.

## Release gate
- [ ] No high/critical authorization issue remains.
- [ ] No live payment credentials are present.
- [ ] Staging logs contain no secrets/passwords/session tokens.
- [ ] Database backup/restore procedure has been tested before production launch.
