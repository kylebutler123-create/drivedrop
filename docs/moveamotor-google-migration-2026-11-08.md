# MoveAMotor Google migration — 8 November 2026

## Completed in Google Search Console

- Used the owner's existing signed-in Google Search Console account in their connected Chrome browser. The existing property was `https://drive-drop.com/` and showed verified ownership.
- Added the domain property `sc-domain:moveamotor.co.uk` and verified ownership through a Porkbun DNS TXT record. Google explicitly returned **Ownership verified**.
- Submitted `https://moveamotor.co.uk/sitemap.xml`. The first status was `Couldn't fetch`; without changing the sitemap or resubmitting it, the report subsequently showed **Success**, last read 8 November 2026, **10 discovered pages**, 0 videos.
- Independently fetched the live XML: HTTP 200, XML content type, 10 public URLs, all on the canonical `https://moveamotor.co.uk` origin.
- Opened Settings → Change of address on the old URL-prefix property and selected the new domain property. Google returned **Validation passed**, with the homepage redirect found and ownership verified for both sites.
- Confirmed the move. The old property now reports **This site is currently moving**, from `drive-drop.com` to `moveamotor.co.uk`, date started **November 8, 2026**. The new property reports that the old site is moving to it.
- Inspected `https://moveamotor.co.uk/`: Google reports **URL is on Google**, **Page is indexed**, and HTTPS is served.
- Ran a live URL test, completed **8 November 2026 at 00:51 UK/UTC**: **URL is available to Google** and **Page can be indexed**.

Sitemap discovery does not mean all 10 pages are indexed. The homepage's indexed status was checked separately. Search rankings and the full migration's processing time are not guaranteed by these results. No additional indexing request was needed for the already-indexed homepage.

## Verification DNS record

Added one record at Porkbun; existing web and mail records were preserved (13 total records afterward).

| Type | Host | Value | TTL |
| --- | --- | --- | --- |
| TXT | @ | google-site-verification=hccvD3B2NnfYsW60sfemru-1XkJqIiupc3PpXaUVFCM | 600 |

Keep this record to retain Search Console ownership verification.

## Useful account pages

- New property: https://search.google.com/search-console?resource_id=sc-domain%3Amoveamotor.co.uk
- Sitemap report: https://search.google.com/search-console/sitemaps?resource_id=sc-domain%3Amoveamotor.co.uk
- Old property's move status: https://search.google.com/search-console/settings/change-address?resource_id=https%3A%2F%2Fdrive-drop.com%2F

## Scope and remaining work

No application code, deployments, redirects, account data, Stripe settings or payment flows were changed during this Google setup. Existing public redirects and retained private/API routes remain as recorded in the domain-switch notes.

The Google ownership, sitemap and change-of-address tasks are complete. Stripe branding and profile updates were subsequently completed; see `moveamotor-stripe-branding-2026-11-08.md`. Separate remaining work: Microsoft mailbox DKIM activation and delivery retest (already authorised), and responsive visual verification. See the email-switch notes for the current Microsoft recognition delay.
