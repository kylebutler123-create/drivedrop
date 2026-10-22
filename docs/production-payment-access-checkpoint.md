# Payment and file-access preflight — 22 October 2026

The branch was refreshed at `f80c958facc246db599b45b5eff4e1bd489aced9`, with no uncommitted work or newer remote changes. The native PostgreSQL rehearsal also passed at this head in [run 39835883593](https://github.com/kylebutler123-create/drivedrop/actions/runs/39835883593).

## Local checks completed

`scripts/test-private-file-access.cjs` exercises the actual delivery-evidence, message-attachment and transporter-profile route handlers with synthetic identity/database/storage adapters. It passed:

- Guest and unrelated-user read denial before privileged storage is contacted.
- Both booking participants and the administrator can retrieve the exact synthetic file bytes, with private/no-store and nosniff headers.
- Missing objects and storage failures return the expected bounded responses without provider details.
- Delivery, message and profile validators reject spoofed MIME, SVG, empty files and oversized files, while accepting their exact limits.
- Profile uploads/removal use the signed-in transporter, ignoring a supplied other-user identifier. Public transporter profile images remain intentionally public.

The existing dispute-fine regression test was blocked by missing test doubles for newer alternative-refund summary and recovery exports. Those doubles were restored, all original financial/authorization assertions retained, and the suite passes locally. Application code and business rules did not change.

A small independent GitHub Actions workflow runs these two tests without hosted credentials, databases, browsers, artifacts or deployment commands. The [saved local evidence](evidence/production-payment-file-access-preflight.json) records source hashes and the scope of the results. These checks supplement existing verification-document, vehicle-photo and alternative-refund suites; they do not certify hosted Supabase permissions or real uploads.

## Actual hosted observations and limits

- The signed-in Stripe Support widget again showed a fresh assistant greeting for **drivedrop sandbox**. The earlier escalation, human reply and case number could not be recovered. No duplicate message was sent. The genuine insufficient-balance reversal/retry gate remains **UNVERIFIED**.
- The preview `/admin/payouts` page requires administrator sign-in. No administrator session was created in this preflight. Signed-in customer/transporter/administrator journeys remain incomplete.
- The alternative-refund evidence endpoint returned HTTP **403**, `Administrator access required`, for an unauthenticated request using a nonexistent synthetic identifier.
- Four other guest-download checks are **inconclusive**: the Vercel fetch connector classified HTTP 401 as deployment authentication and returned no application body. Those responses are not recorded as proven application permission checks. No unchanged retry or protection-setting change was attempted.
- Earlier desktop account CI at `f649bc5` stopped before browser execution on the missing test double now repaired. Its browser journeys were not rerun here. Earlier public visual CI stopped because the old `.homeQuoteExpand` locator matches two controls; that legacy comparison is not accepted as current passing evidence. No desktop/mobile appearance change was made.

No hosted schema, stored file, financial record, key, email flag or production setting was changed. No email or provider money operation occurred. The protected £110 case and immutable QA21 ALT audit were not used as fixtures. Application/storage fingerprints were not resampled in this step; prior preservation evidence retains its own date.

## Resume requirements

Use the preview's real sign-in flow to restore authorized administrator access, then complete the approved role/private-file browser checks with dedicated fixtures and bounded actions. A secure sign-in handoff must collect credentials without exposing them in chat or logs. Confirm a named recipient before sending any delivery-test email. Keep production changes and live operations behind the later exact cutover approval.
