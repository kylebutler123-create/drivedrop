# MoveAMotor email switch — 8 November 2026

## Verified email infrastructure

- Microsoft 365 accepted ownership and completed Exchange DNS setup for `moveamotor.co.uk`.
- Existing Exchange Online Plan 1 mailbox retained; no additional license or mailbox purchased.
- Display name: `MoveAMotor Support`.
- Primary SMTP address: `support@moveamotor.co.uk` (confirmed saved in Exchange admin center).
- Retained alias: `support@drive-drop.com`.
- Microsoft sign-in user ID remains `support@drive-drop.com`; admin sign-in is unchanged.
- Resend sending domain `contact.moveamotor.co.uk` verified in Ireland (`eu-west-1`), domain ID `8efaf369-a164-4976-84d6-3144faa4082f`. Receiving remains disabled there.
- Porkbun existing web A/CNAME records preserved.

## DNS added at Porkbun

| Type | Host | Value | TTL | Priority |
| --- | --- | --- | --- | --- |
| TXT | @ | MS=ms85300555 | 3600 | |
| MX | @ | moveamotor-co-uk.mail.protection.outlook.com | 3600 | 0 |
| TXT | @ | v=spf1 include:spf.protection.outlook.com -all | 3600 | |
| CNAME | autodiscover | autodiscover.outlook.com | 3600 | |
| TXT | resend._domainkey.contact | Exact Resend-provided public DKIM key (verified) | 600 | |
| CNAME | rsend.contact | rsend-euw1.forge.rmta.net | 600 | |
| CNAME | send.contact | send.forge.rmta.net | 600 | |
| TXT | _dmarc | v=DMARC1; p=none; | 3600 | |

## Application change

- Public support address and fixed contact-form recipient: `support@moveamotor.co.uk`.
- Transactional, contact-form and password-reset sender: `account@contact.moveamotor.co.uk`.
- Contact-form visitor reply-to, validation, rate limits, idempotency and production email guards unchanged.
- No Stripe, payments, database, auth-session, or logo changes.

## Validation and cutover

- PASS: `node scripts/test-contact-enquiry.cjs` (provider mocked).
- PASS: `node scripts/test-job-digest.cjs` (provider and database mocked).
- PASS: production `npm run build`, including TypeScript, with inert localhost database URL.
- Resend production key metadata verified as sending-only and currently restricted to the old domain. Its edit is prepared to change only the name and restricted sending domain; save during live alias cutover, never grant all-domain or full access.
- Production deployment and key-domain cutover pending at this source checkpoint.
- Real delivery/send-receive verification remains pending; no test email was sent in this setup session.
- Rollback requires restoring the old production key domain together with the previous deployment (`dpl_EidYUUXgu5gtkTErVYeFS1zX8z7h`). Both old domain DNS and mailbox alias are retained.
