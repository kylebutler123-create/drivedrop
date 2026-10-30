# Mobile public pages — approved first design

Implements the first approved mobile public-page review boards on `feature/ui-polish`. Guest pages below 1024px use the navy, orange and pale-blue design; the existing signed-in account and delivery workspaces remain in place.

## Pages and behaviour

- Home (subsequently replaced by the approved **02 / Premium photography** layout), full-screen public menu, how it works, customer/transporter introductions, About, Help/FAQ, Contact, Terms and Privacy.
- Customer/transporter sign-in and registration, forgot-password and reset-password screens. Existing auth endpoints, role-based destinations, account notices and vehicle-type continuation are retained.
- Four-step quote request: journey, vehicle, transport, review/account. It reuses the existing address lookup, collection calendar/window, photo preparation and auth/job request flow. Mobile step validation checks the required collection times and compatible transport type. Values remain mounted when moving between steps.
- Contact retains its existing submit handler and request ID for retries. Terms and Privacy retain the established legal text.
- Menu uses a native modal dialog with Escape, focus containment, return focus and breakpoint closing. Form success/error/busy states remain visible and accessible.
- Four optimized WebP images reproduce the approved photography direction. The public logo is the existing orange-pin/navy-wordmark asset.

## Validation

- Next.js production compilation and TypeScript check passed. Local verification disabled Turbopack's filesystem build cache temporarily because the workspace cache could not be reopened; repository build configuration was restored unchanged.
- Browser review at 390px for all 14 public route variants, plus layout/overflow checks at 320, 390, 430, 768 and 1023px for home, auth, quote, contact, help and legal pages.
- Browser flow checks covered menu focus/Escape/navigation, information tabs, FAQ search/empty state, legal anchors, both registration roles and payloads, password visibility, auth error/retry and actual-role redirects, account notices, password reset mismatch/missing token/expired token/success, contact error/retry/success and duplicate-request ID reuse.
- A complete quote journey checked date/time validation, non-running transport compatibility, optional photo preparation, back/edit value retention, job payload and a retry after account creation without a second registration.
- Form/API responses were intercepted locally. No live accounts, jobs, enquiries or password-reset emails were created by these checks.
- Desktop public pages were compared against the preceding branch version at 1440px. No visual changes were detected in the checked initial-page screenshots.

Release scope: preview branch only. No production promotion or database changes.

## Homepage update — 02 / Premium photography

The guest homepage below 1024px now follows the approved second concept: white brand/navigation bar, full-width coastal transport photography, overlapping orange quote action, three benefits, navy transporter panel, three delivery steps and compact footer. The homepage uses a standalone server component, locally hosted Plus Jakarta Sans fonts (SIL OFL included), optimized WebP images and the existing logo without its small tagline. Legal links remain available in the footer and menu.

The quote, transporter, sign-in, menu and footer actions keep their existing destinations. The remaining public pages, desktop presentation, account workspaces, auth handlers and APIs are unchanged.

Validation: production compilation and TypeScript checks passed; browser review covered 320, 375, 390, 430, 580, 768 and 1023px, with no horizontal overflow or missing images, and confirmed the desktop switch at 1024px. Quote entry, transporter/sign-in navigation, all footer routes and menu Escape/focus behaviour passed. Separate baseline comparisons found no pixel changes in the desktop homepage or the mobile transporter sign-in, transporter introduction and quote pages. No browser runtime errors or failed assets were detected in those checks. No live form submissions were made.

Release scope remains `feature/ui-polish` preview only.
