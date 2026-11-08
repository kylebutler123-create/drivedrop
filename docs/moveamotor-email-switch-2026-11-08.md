# MoveAMotor email switch — 8 November 2026

## Verified email infrastructure

- Microsoft 365 reports the domain Healthy after completing ownership and Exchange DNS setup for `moveamotor.co.uk`.
- Existing Exchange Online Plan 1 mailbox retained; no additional license or mailbox purchased.
- Display name: `MoveAMotor Support`.
- Primary SMTP address: `support@moveamotor.co.uk` (confirmed saved in Exchange admin center).
- Retained alias: `support@drive-drop.com`.
- Microsoft sign-in user ID remains `support@drive-drop.com`; admin sign-in is unchanged.
- Resend sending domain `contact.moveamotor.co.uk` verified in Ireland (`eu-west-1`), domain ID `8efaf369-a164-4976-84d6-3144faa4082f`. Receiving remains disabled there.
- Porkbun existing web A/CNAME records preserved.
- Microsoft DKIM for `moveamotor.co.uk` is now **Valid / Enabled**, with signed delivery independently confirmed by the receiving mailbox in retest MM-1108-B below. Both retest messages still landed in Junk despite passing authentication.

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
| CNAME | selector1._domainkey | selector1-moveamotor-co-uk._domainkey.drivedrop279.k-v1.dkim.mail.microsoft | 3600 | |
| CNAME | selector2._domainkey | selector2-moveamotor-co-uk._domainkey.drivedrop279.k-v1.dkim.mail.microsoft | 3600 | |

## Application change

- Public support address and fixed contact-form recipient: `support@moveamotor.co.uk`.
- Transactional, contact-form and password-reset sender: `account@contact.moveamotor.co.uk`.
- Contact-form visitor reply-to, validation, rate limits, idempotency and production email guards unchanged.
- No Stripe, payments, database, auth-session, or logo changes.

## Validation and cutover

- PASS: `node scripts/test-contact-enquiry.cjs` (provider mocked).
- PASS: `node scripts/test-job-digest.cjs` (provider and database mocked).
- PASS: production `npm run build`, including TypeScript, with inert localhost database URL.
- Resend production key retained and renamed `MoveAMotor Production`; sending-only access now restricted to `contact.moveamotor.co.uk`. No key value was exposed or replaced. Preview key already supports the new domain; its permissions were unchanged.
- Production deployment `dpl_DuB9rpr6HiSLi7NMAKzGRXjw1a2K` from commit `c123e88584fa62743f4a81ac8008e040afbd2632` reached READY. Both `moveamotor.co.uk` and `drive-drop.com` aliases assigned to it immediately after saving the Resend restriction.
- Live `/contact` checked in Chrome: public email link and form destination show `support@moveamotor.co.uk`.
- Two user-authorised real email tests completed; delivery succeeded in both directions, but both messages initially landed in Junk. Details below. Clean Inbox delivery is not yet verified.
- Rollback requires restoring the old production key domain together with the previous deployment (`dpl_EidYUUXgu5gtkTErVYeFS1zX8z7h`). Both old domain DNS and mailbox alias are retained.

## Real delivery test MM-1108-A

Tested through the user's connected Google Chrome on 8 November 2026. Times are UK/UTC. Exactly one live contact-form submission and one mailbox reply were sent, with the user's explicit approval. No booking or payment was involved.

| Direction | Result | Authentication at receiving mailbox |
| --- | --- | --- |
| Live `/contact` form → `support@moveamotor.co.uk` | Submitted 00:21; Resend delivered 00:22; found in Microsoft business mailbox Junk | SPF pass (`rsend.contact.moveamotor.co.uk`), DKIM pass (`contact.moveamotor.co.uk` and Amazon SES), DMARC pass, composite authentication pass; Microsoft SCL 5 |
| Reply from `support@moveamotor.co.uk` → owner's approved Hotmail address | Sent and received 00:25; found in Hotmail Junk | SPF pass, DKIM none (unsigned), DMARC pass, composite authentication pass; Microsoft SCL 5 |

- Resend email ID: `01a1b888-8abd-7c85-8eb7-4c2a3bc72e07`; log ID: `1e33832d-7c8d-4339-957d-13b23f1f983b`.
- Public form displayed its success confirmation. Sender was `MoveAMotor contact form <account@contact.moveamotor.co.uk>`; visitor reply-to populated the approved Hotmail address correctly when Reply was selected.
- The received contact test alone was moved from Junk to Inbox to permit replying. The option to always trust the sender was unchecked. No safe-sender entry, allowlist or spam-filter bypass was added.
- No private inbox screenshots or full message headers were saved. Authentication results above were read from Outlook's message-details/source UI.

## Microsoft mailbox DKIM follow-up

- Microsoft Defender showed `moveamotor.co.uk` as `NoDKIMKeys` / Disabled. The old `drive-drop.com` DKIM configuration remains Valid / Enabled.
- Created the new domain's DKIM keys and added both exact Microsoft-provided CNAMEs at Porkbun. Both saved records were verified in the DNS table; total records increased from 10 to 12. Existing web, MX, SPF, Resend and DMARC records were preserved.
- Initial enable attempt reported that Microsoft could not yet see the CNAME records. Signing is pending DNS recognition; do not treat the DNS save alone as enabled signing.
- Follow-up retry on 8 November: Google Public DNS returned both exact CNAME targets successfully, and both Microsoft targets returned TXT public keys. The domain's public NS records point to Porkbun. The saved configuration is publicly resolvable; Microsoft Defender nevertheless still reports `CnameMissing` / Disabled and rejects enablement. No DNS records were changed during this retry.
- The user approved proceeding with enabling signing and repeating delivery checks. No additional messages were sent while Microsoft signing remains blocked. That approval remains available for the next contact-form/reply test pair once signing is enabled.
- The pending activation described above was resolved later on 8 November; see the completed retest below. Passing authentication alone does not establish Inbox placement.

## DKIM enabled and real delivery retest MM-1108-B

Microsoft accepted the enable action after the subsequent mobile checks. The domain row then showed **Valid / Enabled**. The existing old-domain DKIM setting was not altered.

Exactly one additional live contact-form message and one support-mailbox reply were sent under the user's renewed approval. Times are UK/UTC on 8 November 2026.

| Direction | Result | Receiving authentication |
| --- | --- | --- |
| Live `/contact` form → `support@moveamotor.co.uk` | Sent 01:13:02; received in business Outlook **Junk** at 01:13 | SPF pass, DKIM pass for `contact.moveamotor.co.uk` and Amazon SES, DMARC pass, composite authentication pass, SCL 5 |
| Support reply → approved owner Hotmail address | Sent 01:15:55; received in Hotmail **Junk** at 01:16 | SPF pass, **DKIM pass for `moveamotor.co.uk`**, DMARC pass, composite authentication pass, SCL 5 |

- The contact form confirmed that the message was sent. Reply-to selected the approved Hotmail recipient correctly.
- Moved only the received contact test to Inbox to enable Reply; explicitly unchecked the option to trust future sender messages. No sender allowlist or spam-filter bypass was added.
- Outlook displayed the reply as sent. Receiving headers establish that Microsoft DKIM signing is working, not just enabled in settings.
- Full raw headers and private inbox screenshots were not saved; only the authentication summary above is retained.
- **Remaining issue:** both Outlook destinations still classify these messages as spam. The test does not establish the reason for that classification. Authentication is fixed; reliable Inbox placement is not yet verified. The two authorised retest sends are now used; further real test messages need a clear continued request.
