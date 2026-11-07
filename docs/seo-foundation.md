# DriveDrop technical SEO foundation

Scope: existing public pages at https://drive-drop.com. Page design and visible copy are unchanged. Payment, booking, authentication, database, email and scheduled-worker behaviour are unchanged.

## Baseline

The live site had no robots.txt or sitemap.xml (both returned 404), no canonical links or JSON-LD, and the same generic description on every public page. Most informational pages had basic titles; the home and legal pages inherited the generic title. Google Search Console had no property for this site in the owner's signed-in account.

## Changes

- Ten public pages receive unique titles/descriptions, self-referencing canonical URLs, UK English locale and Open Graph/Twitter sharing metadata using the existing logo.
- The sitemap includes only those ten canonical public URLs, with no invented last-modified dates.
- Production robots.txt allows the public site and advertises the sitemap. API crawling is excluded. Private pages remain crawlable so crawlers can see their noindex directives; authentication remains the access control.
- Root metadata defaults to noindex/nofollow. Only the explicit public-page list opts into indexing in Production. Preview metadata is noindex and Preview robots.txt disallows crawling.
- Alternate hosts, API responses and the two legacy HTML design examples receive X-Robots-Tag noindex headers. Assets used by the public pages remain crawlable. No host redirects were added, preserving payment callbacks and sessions.
- Home-page Organization and WebSite JSON-LD describes the verified brand only. It does not turn sample reviews, example prices or delivery counts into structured data.
- Google's ownership meta tag was obtained from the owner's signed-in Search Console account for the exact https://drive-drop.com/ URL-prefix property. Ownership verification and sitemap submission completed successfully after publication.

## Validation before publication

- Next.js 16.3.8 version-matched metadata, robots, sitemap, JSON-LD and header documentation reviewed.
- TypeScript check passed.
- Standard Turbopack production build passed using an unreachable local database placeholder; no production database or payment credentials were used locally.
- Read-only HTTP checks passed on the production build: 10 public pages, 11 private routes, sitemap membership, query canonicalisation, JSON-LD, Google tag, share tags and response headers on canonical/alternate hosts.
- Source comparison confirmed visible markup and behaviour unchanged in all 12 edited page/layout files, apart from the nonvisual JSON-LD script and UK English language attribute.
- The alternate Webpack build exposed an existing unrelated CSS-module selector incompatibility. No unrelated CSS changes were made; the deployed/default builder is Turbopack.

Run the reusable checks with `node scripts/check-seo.mjs https://drive-drop.com`. For a local production build, supply its URL and a canonical Host override: `node scripts/check-seo.mjs http://127.0.0.1:3107 drive-drop.com`.

## Publication and live validation — 7 November 2026

- Application commit: `7999ad725562c927a0561015ae1fbbd84cba5a17`; PR #8 merged into `feature/ui-polish` as `61d0b6e69da61cea89ee4060808713e7384a46f8`.
- Production deployment: `dpl_8nu6W3UFF11EtNtXDDcu17ZtpQMR`, promoted around 00:00–00:01 UTC on 7 November. Both `drive-drop.com` and the existing public Vercel alias mapped to this deployment.
- Hosted Preview `dpl_9WFCjqZvttCdTzCMywz3NNJSrGpy` was checked: noindex metadata and response header, robots.txt disallowing crawling, and empty sitemap.
- Read-only checks against https://drive-drop.com passed: 10 public pages, 11 private routes, 10 sitemap URLs, two query canonicalisation cases, structured data and response headers.
- Production environment comparison found no changed or removed values. Public checkout remains enabled continuously; this SEO publication did not alter payment controls.
- Initial operational checks at 00:02 UTC found no error/fatal runtime logs for the new deployment, five recent successful recovery-worker runs and no finished unsuccessful or stale runs.
- No genuine booking or payment existed at that check. SEO validation does not replace verification of the first genuine live payment flow.
- Previous functional production deployment, if an SEO-specific rollback is needed: `dpl_7txmQ5oXX15FiuYvUBodmifwThSy` (checkout enabled).

## Google Search Console

- Ownership of the exact URL-prefix property `https://drive-drop.com/` verified successfully using the deployed HTML meta tag.
- Submitted https://drive-drop.com/sitemap.xml on 7 November 2026. Search Console reported **Success**, last read 7 November, and **10 discovered pages**.
- The historical homepage inspection showed a failed 404 crawl from 2 November 2026 at 12:38:27. This was the stored Google record, not the current deployment response.
- A fresh Google live URL test at **00:08 UTC on 7 November 2026** reported **URL is available to Google** and **Page can be indexed**.
- The homepage indexing request was accepted: **Indexing requested**, with the URL added to Google's priority crawl queue.
- Successful submission and live crawl eligibility do not mean the homepage or all ten pages are already indexed. No ranking or indexing guarantee is made.

## Follow-up

Use Search Console indexing and search-performance reports after Google processes the submission. Investigate any new crawl failures against the current deployment; do not treat the historical 2 November 404 as a new failure. Do not repeatedly request indexing for the same unchanged URL.

Further keyword/content work should use actual customer search data and approved page content. No location doorway pages, fabricated reviews, paid links, tracking scripts or analytics cookies are introduced here.

Public-page design and visible wording remain as approved. The SEO work is complete for this technical foundation; future content changes are a separate scope.

## References

- https://developers.google.com/search/docs/fundamentals/get-started-developers
- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- https://developers.google.com/search/docs/crawling-indexing/block-indexing
- https://developers.google.com/search/docs/appearance/site-names
