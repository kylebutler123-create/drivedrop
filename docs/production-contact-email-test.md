# Controlled Production contact-form email check

The contact form supports one explicitly configured delivery check while general
transactional email and payments remain disabled. `DRIVEDROP_CONTACT_EMAIL_TEST`
is a Production-only JSON configuration with a random UUID `id`, ISO `startsAt`
and ISO `expiresAt`. The interval must be positive and no longer than one hour;
the request is rejected before the start and at or after expiry. Missing or
malformed configuration keeps the check disabled.

The existing Production Resend key and `TRANSACTIONAL_EMAILS_SENDER_VERIFIED=true`
are required. The ordinary contact form must contain exactly:

- Name: `DriveDrop email check`
- Email: the fixed support mailbox already used by the contact handler
- Enquiry: `General enquiry`
- Booking reference: blank
- Subject: `DriveDrop production email check <id>`
- Message: `This is the authorised DriveDrop production contact-form delivery test. No booking or payment is involved.`

The usual input validation, same-origin, honeypot and rate-limit checks remain.
The provider receives a fixed support recipient and Reply-To, and a stable
`contact-production-test/<id>` idempotency key even after a new browser form.
The configured interval is shorter than Resend's idempotency retention. The
check does not enable any booking or lifecycle email and does not read or write
the database. Production-specific credentials are used by the staged deployment.

After the authorised single submission, inspect its provider record and actual
mailbox delivery. Clear the test configuration for future deployments; existing
immutable deployments stop permitting it automatically at the recorded expiry.
Do not call provider acceptance proof of inbox placement or link acceptance:
the contact email is plain text and contains no application action link.
