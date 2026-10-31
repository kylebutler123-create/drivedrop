# Signed-in mobile homepage

The approved premium homepage was restricted to `role-guest`: signed-in visitors received the same `/` route, but CSS hid the new homepage and exposed the legacy content. This was a presentation condition, not an authentication redirect or service-worker cache.

The public mobile navigation now renders on `/` for every session. Public mobile styling follows that navigation's presence instead of the user's role. Signed-in visitors see “My account” and a menu link to their existing role-specific dashboard; guest sign-in and registration links remain unchanged. The public header replaces the mobile workspace header and bottom navigation only while this public navigation is present. Navigating back to an account screen restores its existing navigation.

The premium photography, logo dimensions and homepage content are retained. Desktop presentation, session handling, `/app` launch redirects, account authorization and APIs are unchanged. Other signed-in routes keep their existing presentation.

Verification uses isolated fixture sessions for guests, customers, transporters and admins, with API traffic intercepted locally. Checks cover mobile homepage visibility, identical content styling, menu and logo sizing, account links, client navigation, browser back/refresh, guest auth regression and unchanged desktop rendering. No live accounts or records are modified.
