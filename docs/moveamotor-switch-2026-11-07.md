# MoveAMotor domain switch — 7 November 2026

## Scope

Rebrand the existing DriveDrop application as MoveAMotor, with https://moveamotor.co.uk as the canonical public origin. Keep the same Vercel project, production database, users, bookings, payment provider and private storage. No schema/data migration or live financial transaction is part of this change.

Both moveamotor.co.uk and moveamotor.uk were purchased in Porkbun. Vercel project domains include the apex .co.uk plus www and both .uk variants; the latter three redirect permanently to the canonical domain. DNS uses the project-recommended A 216.150.1.1 and www CNAME 5ce1a6ad7b3aafce.vercel-dns-017.com. Certificates issued for both domains and their www names.

## Application behavior

- Public and workspace branding, vector logos, titles, structured data, sitemap, manifest, receipts and future notification copy use MoveAMotor.
- Only public entry pages on drive-drop.com redirect to the new origin. Authenticated routes, API/webhook routes and existing signed links remain available at the old domain.
- Existing users sign in again on the new domain because cookies are host-scoped. Accounts and bookings are unchanged.
- Production NEXT_PUBLIC_APP_URL and STRIPE_CHECKOUT_ORIGIN must both be https://moveamotor.co.uk. New email and checkout/onboarding return links use that origin.
- Existing production sessions may finish requests on drive-drop.com. The payment origin helper permits only the exact canonical HTTPS origin and the original owned HTTPS origin when canonical production is MoveAMotor. Same-origin middleware and role checks remain in place.
- Verified sender account@contact.drive-drop.com and support@drive-drop.com remain operational. Sender display names change to MoveAMotor. New mailbox/DNS verification is separate follow-up work.
- Stripe webhook destinations, signing keys, payment/recovery flags, scheduled recovery and database configuration remain unchanged.
- Stripe account business profile/statement descriptor and Google Search Console migration still require follow-up verification.

## Validation before publication

Production build and TypeScript passed. Production-payment-runtime tests passed, including allowed/blocked origin cases. Contact enquiry tests passed with updated brand assertions and unchanged historical QA fixtures. Read-only local HTTP checks passed: 10 public pages, 11 private routes, 10 sitemap URLs, canonicals, structured data, robots headers. Old public URLs return 308 preserving query parameters; old login returns 200 and both webhook GET requests return 405 without redirects.

## Rollback

Previous known live production deployment: dpl_8nu6W3UFF11EtNtXDDcu17ZtpQMR, source 7999ad725562c927a0561015ae1fbbd84cba5a17, URL drivedrop-du8v9u83p-future-9f39.vercel.app. Reassign affected aliases to that deployment if rollback is needed. Before a subsequent old-source rebuild, restore both production URL variables to https://drive-drop.com. Existing deployment environments are immutable. Preserve the new domain registrations and email DNS.

Final production deployment ID and live verification results will be appended after publication.
