# DriveDrop app-store preparation — 7 November 2026

The owner requested downloadable apps in both Apple's App Store and Google Play, confirmed no developer accounts yet, and confirmed individual/sole-trader status.

## Scope and current status

Prepared an isolated Expo/React Native app in `mobile/` and four additive backend routes. The project is a development foundation, not a released or store-ready app. Application identity, native signing, reviewer access, store registration and distribution have not been created. The live site remains on SEO deployment `dpl_8nu6W3UFF11EtNtXDDcu17ZtpQMR`; public checkout stays on.

The only change to existing website files is excluding `mobile/` from the website TypeScript project. Public page design/wording, payment handlers, website authentication, database schema and production configuration are unchanged. Native API routes are disabled by default behind `MOBILE_APP_ENABLED`; no environment flag was enabled.

## Verification

- Root TypeScript check passed.
- Website production build passed using Next.js 16.3.8 / standard Turbopack and an unreachable local database placeholder. No production database/payment credentials were used.
- Twelve isolated native API and link-security tests passed. They cover disabled endpoints without DB access; token validation/hashing; wrong-password, inactive-account and admin rejection; expiry; customer ownership filtering and response-field limits; cookie-only API access rejection; POST-only, role-bound secure cookie handoff; cross-site handoff rejection; logout scope; external-link and API-origin restrictions.
- Mobile TypeScript and ESLint checks passed without errors or warnings after fixes.
- iOS and Android JavaScript/Hermes bundle exports passed (SDK 58.0.23, React Native 0.88.1). These are not native compiled or signed installable packages.
- No real-device, simulator, native compilation, real-account login, payment, upload or store review has run. Those limits must remain explicit.
- Local HTTP checks against the built website confirmed all four native endpoints return 503 with no-store while disabled. The local server needed an explicit loopback hostname because this environment cannot enumerate network interfaces.
- Expo generated both native projects successfully using Continuous Native Generation. Generated iOS/Android directories remain ignored; configuration and source are tracked.

The online Expo compatibility check could not reach its service because of a proxy timeout, so the chained Expo Doctor did not run. The offline bundled compatibility check reported dependencies up to date, with its own warning that offline validation is less reliable. Each native dependency was installed through the SDK-aware Expo installer. The external React Native Directory lookup was also unavailable. Re-run online dependency/Doctor checks in the owner's build environment before signing.

## Confirmed release gaps

The existing close-account route revokes access without erasing associated data; implement a reviewed deletion/retention process and both in-app and public web request paths. The existing website login clears all sessions for the user, which can invalidate a native session. The current rate limiter is process-local. These need resolving before the native API is enabled in production.

Complete device verification for auth/cookie handoff, uploads, location permission, receipts, Android back navigation and Stripe/bank returns. Push notifications, offline evidence, native evidence capture and universal/app links are not included. App-store minimum-functionality approval cannot be assumed from successful code checks.

See `mobile/README.md` for implementation, owner registration route, build commands and primary policy references. The next owner action is Apple individual developer enrollment; Google business-identity/D-U-N-S setup also needs completing. No agreement was accepted and no fee was paid.
