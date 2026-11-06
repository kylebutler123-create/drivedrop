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
- Google's ownership meta tag was obtained from the owner's signed-in Search Console account for the exact https://drive-drop.com/ URL-prefix property. Verification and sitemap submission follow publication.

## Validation before publication

- Next.js 16.3.8 version-matched metadata, robots, sitemap, JSON-LD and header documentation reviewed.
- TypeScript check passed.
- Standard Turbopack production build passed using an unreachable local database placeholder; no production database or payment credentials were used locally.
- Read-only HTTP checks passed on the production build: 10 public pages, 11 private routes, sitemap membership, query canonicalisation, JSON-LD, Google tag, share tags and response headers on canonical/alternate hosts.
- Source comparison confirmed visible markup and behaviour unchanged in all 12 edited page/layout files, apart from the nonvisual JSON-LD script and UK English language attribute.
- The alternate Webpack build exposed an existing unrelated CSS-module selector incompatibility. No unrelated CSS changes were made; the deployed/default builder is Turbopack.

Run the reusable checks with `node scripts/check-seo.mjs https://drive-drop.com`. For a local production build, supply its URL and a canonical Host override: `node scripts/check-seo.mjs http://127.0.0.1:3107 drive-drop.com`.

## Follow-up

Verify the hosted Preview exclusions, publish the tested Production build with all existing live-payment controls preserved, then finish ownership verification and submit https://drive-drop.com/sitemap.xml. Search Console indexing and search performance become the source of truth after Google processes the pages; publication or sitemap submission does not guarantee indexing or rankings.

Further keyword/content work should use actual customer search data and approved page content. No location doorway pages, fabricated reviews, paid links, tracking scripts or analytics cookies are introduced here.

## References

- https://developers.google.com/search/docs/fundamentals/get-started-developers
- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- https://developers.google.com/search/docs/crawling-indexing/block-indexing
- https://developers.google.com/search/docs/appearance/site-names
