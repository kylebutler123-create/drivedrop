# Payment and file-access preflight — 22 October 2026

The branch was refreshed at `f80c958facc246db599b45b5eff4e1bd489aced9`, with no uncommitted work or newer remote changes. The native PostgreSQL rehearsal also passed at this head in [run 39835883593](https://github.com/kylebutler123-create/drivedrop/actions/runs/39835883593).

**CI verified:** [run 39837732141](https://github.com/kylebutler123-create/drivedrop/actions/runs/39837732141) passed both suites at commit `5b5482392000905136c68bbceafeaf0280d9754a`. The saved evidence includes this run and the tested source hashes.

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

## Later authenticated administrator check

The secure email/password handoff succeeded later in the same session. Fresh page state showed the Administrator role and the real `/admin/payouts` page. This supersedes the earlier sign-in blocker only; a normal administrator session was created, so session preservation is not claimed for this follow-up.

At preview deployment `dpl_n4R6cCEeSoTNnTa6jHcrSPnmM4Zz`, commit `cd7a44773c4e68a51960cca19baf32653674e7bb`, read-only category/search/expand interactions showed:

- **QA20 RFD / DD-711BXM28:** £110 customer payment captured, the original refund failed, payout held, and no replacement payment sent. A focused database read confirmed `PAID`, 0p reimbursed, `HELD`, the original failed refund reservation still active, and no alternative repayment.
- **QA21 ALT / DD-AFDVANK7:** visibly labelled **TEST ONLY**, £0 Stripe refund, £1.10 alternative repayment, cancelled payout and £0 transporter proceeds. The database still contains one alternative repayment and one corresponding financial audit event, with an explicit simulation note and the original simulated reference.
- The administrator's private-evidence link produced a completed browser download event. Its returned file path was unavailable in both the shared workspace and browser file access, so a fresh downloaded-byte/hash check is **inconclusive**. This does not replace the successful 21 October download evidence. A separate read-only database check confirmed the stored PDF remains 44,415 bytes and its computed SHA-256 still equals the original `69991625af954c80f978ec3b9932e88909cd10818545e80f2d20bbc09eef8d5e`.

Only the existing cards and evidence link were opened. No refund/status-reconciliation, alternative-recording, release, upload, notification-read or message action was submitted. These protected cases were inspected, not reused as mutation fixtures. No new money or email operation was performed.

Fresh Vercel reads confirmed `STRIPE_REFUNDS_ENABLED=false`, all 29 environment metadata entries unchanged from the native checkpoint (id/key/type/target/branch/update time), and the same production deployment `dpl_B4bCCxXTQT3EECVXJT6CF2cC6YUz`, commit `8b87d8c66bd9fcca3f7f4716366cd6ea9b86485c` and three aliases. This is not a fresh all-table/storage fingerprint comparison or a consistent cutover backup.

## Customer read-only follow-up

After the user completed the authentication handoff, fresh `/customer` page state confirmed **DriveDrop Test Customer**, role **Customer**. This closes the unconfirmed customer sign-in noted below. The checked preview deployment was `dpl_3eATyKQ1cKDMXAMDGaztFqR4Kct2`, commit `6e33d541f35be5b0d7e05e7f05f99287887d1bf1`.

The first dashboard observations stayed in a loading state. One reload and navigation to Your deliveries were followed by populated data: 2 quote requests, 4 active deliveries, 36 completed and 9 cancelled. The cause of the initial delay is not established; no application change was made. The Payments page subsequently loaded 52 records, and the customer quote form loaded its UK date/time and vehicle fields without a submission.

For existing test booking **DD-ETUGTSLY**, the payment page showed £330 paid, £0 refunded, the agreed total and a clear test-payment label. No separate commission/platform fee appeared in the visible selected breakdown. The actual receipt link downloaded a one-page, 213,002-byte PDF with SHA-256 `a00c73d5473473c94433957af63d32b284266496b56a933c742b8a2ff4eb47eb`. Extracted text confirmed the matching reference, £330 total, paid status and explicit **TEST PAYMENT RECORD** disclaimer, with no commission/platform-fee label. A focused database read confirmed the booking belongs to that customer and remains provider `TEST`, 33,000p paid, 0p refunded, `PAID`, payout `NOT_READY`, last updated 10 October. This is existing test evidence, not a new payment or proof of live Stripe checkout.

Using the same authenticated customer session, the existing administrator-only QA21 evidence URL displayed **Administrator access required**, and the customer receipt route for the other customer's QA21 booking displayed **Receipt not found**. These are observed browser denial bodies; no network-status instrumentation was used to assert their HTTP codes. The protected records were read-only access targets, not mutation fixtures.

No booking/quote/payment/refund, delivery confirmation, file upload, message or email was submitted. The downloaded receipt is internal verification material and is not copied into the public repository. These checks establish the exercised read-only customer screens and file boundaries; hosted checkout/3DS, financial submissions, delivery uploads, other role permissions and production-mode behavior remain separate gates.

## Authentication history and resume requirements

After saving the administrator results at `deb304518019d3eb191cf0cfaf687762d7b940da`, the administrator was signed out normally and the visible Customer Login link opened. The customer secure sign-in request returned `submitted`, but the login form remained visible without an error and a fresh same-origin page still showed Log in. Customer authentication is therefore **unconfirmed**, not a passed journey or a demonstrated credential failure. No second credential submission was attempted. Continue through the browser's authentication handoff; do not inspect credentials or fabricate a session.

The later customer follow-up above supersedes this historical sign-in blocker. Continue transporter and remaining role/private-file browser checks with dedicated fixtures and bounded actions. Secure sign-in handoffs must collect credentials without exposing them in chat or logs. Confirm a named recipient before sending any delivery-test email. Hosted scheduling/pending-work acceptance and the genuine Stripe insufficient-balance reversal/retry gate remain open. Keep production changes and live operations behind the later exact cutover approval.
