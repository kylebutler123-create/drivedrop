# DriveDrop security baseline — Milestone 7

- HTTP-only, Secure-in-production, SameSite=Lax session cookies.
- Same-origin checks on mutating API requests.
- Security headers and CSP configured at the application edge.
- Role/ownership checks remain mandatory on every protected API route.
- Test finance is blocked in production unless explicitly overridden; do not override for a live launch.
- Verification/evidence files still require private object storage, signed URLs, malware scanning and MIME/size validation before launch.
- Add managed rate limiting/WAF at deployment for login, registration, messaging, quote and payment endpoints.
- Rotate secrets, use separate production database credentials, enable backups/PITR and centralised audit/error logging.
