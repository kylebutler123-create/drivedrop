# MoveAMotor mobile admin visual upgrade — 8 November 2026

Approved scope: apply the reviewed mobile admin design while preserving existing admin functionality and desktop presentation.

## Implementation

- Mobile-only header uses the existing MoveAMotor dark logo, notification unread badge and account link.
- Fixed Home / Users / Payouts / Messages / More navigation. The authenticated `/admin/sections` directory includes every admin section, account, notifications, messages, sign out and Show everything.
- Light Control Centre, six mobile counters, stacked action rows, fines overview, consistent cards, readable forms, scrollable filters and touch targets below 1024px.
- Payout category balance uses the existing calculated category values; all eight categories, search, CSV export and record controls remain.
- Fines balances and account fine history are visible on mobile.
- User summary shows activity counts; full account/compliance facts remain in the expanded details. Contact controls appear first when expanded.

## Validation

- `npm run typecheck`: passed.
- `npm run build`: passed, using an inert local `POSTGRES_PRISMA_URL` for build-time Prisma initialization; no production database credentials or data used.
- `git diff --check`: passed.
- Source comparison confirms existing user, verification, dispute, booking, payout record, review moderation and fine-directory action modules are unchanged. Admin data queries and payout category/eligibility calculations are unchanged.
- Browser checks used actual components and source CSS in a separate local fixture with clearly synthetic data. All writes were blocked in the fixture. No fixture files are included in the app or deployment.
- Overview checked at 360, 390, 430, 768, 1023, 1024 and 1440px. No page-wide horizontal overflow. Mobile navigation switches off at 1024px; the desktop retains five counters and its existing navigation.
- Checked user search/filtering and expansion; verification document/contact/account controls; dispute evidence, notes and additional fine controls; expanded booking timelines/finance/evidence; payout category changes and expanded records; review moderation controls; fine ledger expansion; all sections directory.
- No live payment, refund, fine, message, verification or account-status action was executed. Authenticated live-admin browser verification remains separate from the isolated visual checks.

Baseline: `801cba56fc8e987ec2dbcd72f790977d6d117e64` on `feature/moveamotor-rebrand` and `feature/ui-polish`.

## Production and authenticated follow-up

- Production code: `7f98d98aef59ae47c087259f7ff439d8b8a7e46c`; deployment `dpl_G7hKYyJerhf24mLqBW4KpzTC9qE6`. Both `moveamotor.co.uk` and the retained `drive-drop.com` alias point to this deployment. Live health returned HTTP 200 and version `7f98d98aef59`.
- After the owner signed in, verified the actual production admin at 360/390px: overview, all-sections links, user search and transporter filtering, expanded user/contact/account controls, expanded verification document controls and disabled approval guard, all eight payout categories, bookings/disputes/reviews/fines empty states, and Messages navigation. No page-wide horizontal overflow was observed on these screens.
- Production currently has no bookings, payouts or disputes. Populated financial/evidence layouts were checked in the isolated fixture; no live financial workflow was exercised. No account-status, document approval, payment, refund, fine or message action was submitted.
- Live overview breakpoint checks: 390px shows six counters and mobile navigation; 1024px and 1440px show five counters and the existing desktop navigation. No browser console errors were recorded. Temporary viewport override reset; Chrome left on the signed-in Control Centre.
- Authenticated follow-up is complete; no application changes were required after deployment.

