# Contact form and support details

The desktop `/contact` form previously prevented submission and displayed a notice that sending was unavailable. It now posts enquiries to `/api/contact`, which sends them through the existing Resend service to `support@drive-drop.com`. The visitor's validated email address becomes Reply-To, so the support team can reply from Outlook. No automatic reply is sent to the visitor.

The existing contact card now displays the support email, telephone number and postal address already saved in the live Stripe public-details profile. Email and telephone are clickable. Opening hours are omitted because none have been supplied. The existing desktop layout and all mobile styles remain unchanged apart from sizing the populated desktop detail boxes to fit their content.

The handler validates required fields and lengths, rejects cross-origin requests, caps the request body, checks a honeypot and uses the application's existing per-process IP rate limiter (five attempts per fifteen minutes). The destination is fixed, and unknown request fields are rejected. Enquiries use plain text; visitor input cannot become HTML. An unchanged retry retains its Resend idempotency key. The client blocks repeated clicks while sending, preserves entered content on errors and only resets it after provider acceptance.

The existing transactional-email enablement rules are retained, including the production guards. No production settings, email flags, database schema, DNS, payment code or monitoring settings were changed. This update is intended for `feature/ui-polish` preview only. Public `drive-drop.com` availability remains a separate launch task.

## Validation

- `node scripts/test-contact-enquiry.cjs`: passed. Covers fixed recipient, Reply-To, retry payload/key stability, invalid input, honeypot, request origin/size/type, rate limiting, missing configuration, production email guard, provider failures and rendered details. Provider is mocked; no email or database calls.
- `npm run typecheck`: passed.
- `VERCEL_ENV=preview NEXT_TELEMETRY_DISABLED=1 POSTGRES_PRISMA_URL=<unreachable local build placeholder> npm run build`: passed, including `/api/contact` and `/contact`. A stale Turbopack cache was moved aside; no real database credentials were required.
- `git diff --check`: passed.

No live contact-form message was sent. The earlier Microsoft mailbox send/receive test remains complete and is not repeated by this change. This validation establishes the implementation and build, not end-to-end Resend delivery to Outlook.

Provider references: [Send email](https://resend.com/docs/api-reference/emails/send-email), [Idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys). Rate limiting is process-local, consistent with the existing application helper; it is not a global distributed quota.
