# Session recovery across devices

Signing in already replaces the account's earlier server session. The earlier device keeps its cookie and its cached Next.js layout, however. Private client pages could then receive unauthorized API responses while retaining the old navigation, or render a legacy signed-out fallback without the mobile account styles.

`SessionBoundary` keeps the presentation in sync with `/api/me` for customers, transporters and admins. It checks initial private loads, route/query changes, app focus/visibility restoration, browser page restoration and every 30 seconds while visible. Same-origin link navigation checks the session before replaying the original link, preserving its handlers. Modifier clicks, downloads, external links, API links and same-page anchors retain their browser behavior. Concurrent checks are deduplicated and abandoned checks are cancelled.

A confirmed 401 sends the device through a full document navigation to the current sign-in page, with the appropriate customer/transporter choice and “Your session has ended. Please sign in again.” This removes the stale layout, account components, prefetched pages and unread badge values together. Fresh signed-out visits do not render private fallback screens. A changed account identity rebuilds the shell for the current account. Temporary network errors and 5xx responses do not count as a sign-out. The newer device's session is not cleared.

The existing server/API authorization and single-session policy remain authoritative and unchanged. `/api/me` explicitly disables response caching. Expired-session reads return null without attempting to change cookies during Server Component rendering; the existing sign-in cleanup and explicit logout still remove expired/current records. Auth forms explicitly use POST as their native fallback, so a submit before hydration cannot put credential fields into a URL.

Validation:

- `node scripts/test-session-recovery.cjs`: real auth helper and session endpoint with isolated records; second-device revocation, old-cookie rejection, preservation of the newer session, uncached 200/401 responses, expired sessions during read-only rendering, re-sign-in and cleanup.
- Isolated Next.js browser fixture uses the real session creation, lookup and `/api/me` code with synthetic local records. Customer, transporter and admin checks cover second-device sign-in, navigation to Messages, current mobile sign-in, re-sign-in, focus restoration, cached Account navigation, browser back, query-only navigation, guest private deep links and public navigation. Server/network failures retain the signed-in shell. Desktop recovery retains the desktop sign-in design.
- Production build and TypeScript check. No live accounts, payments, database schema or production deployment are changed.
