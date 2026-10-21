# Stripe Connect sandbox implementation

## Latest: production comparison and rollout plan prepared

The approved 21 October read-only comparison is complete. Prepared production lacks the four later payment/audit tables and two payout statuses; storage configuration already matches. The [comparison](production-readiness-comparison.md) and [rollout plan](production-payment-rollout-plan.md) identify the production payment guards, isolated recovery worker/scheduler, scoped credentials, email behavior and final browser/role checks still needed. Nothing was migrated or activated.

All 32 preview and 28 prepared-production table/storage fingerprints match within this review, as do the 29 environment metadata entries and original production deployment/aliases. `STRIPE_REFUNDS_ENABLED=false` is freshly verified. The £110 failed-refund case and immutable simulated QA21 ALT audit remain preserved. Genuine insufficient-balance reversal failure/retry is still UNVERIFIED; Stripe Support was not rechecked in this database review. [Exact comparison evidence](evidence/production-readiness-comparison.json).

## Previous: Stripe Support contacted about the remaining recovery gate

On 21 October, the approved technical question was sent through Stripe's official support widget with **drivedrop sandbox** selected. The AI assistant replied; a human Connect specialist was requested and chat escalation entered the support queue. The genuine insufficient-balance failure/retry gate remains **UNVERIFIED**. See [the sent question and contact status](stripe-support-recovery-question.md) before repeating a test or assuming Stripe has confirmed the limitation.

This support-only step made no payment, database, application, environment, permission or account-setting change. Refunds remain off as last verified; no new runtime/data check is claimed. Production and live payments were not accessed or changed.

## Previous: recovery investigation and payment-readiness review

The 21 October review found no documented supported way to force a genuine insufficient-balance transfer-reversal failure under the unchanged Express / application-liability setup. The account configuration was read again, and official Stripe guidance is consistent with the earlier successful zero-balance reversal. **This gate remains unverified; do not repeat that successful experiment or substitute a payout/top-up failure as proof.** A precise Stripe Support question was prepared in this review and sent in the later support step above.

The local refund test now uses the actual Stripe SDK error class and verifies repeated failure, held review, no scheduled money retry for REVIEW, one recovery after a simulated success, unchanged customer refund/notices and safe-window expiry. Refund/Connect/policy tests pass. No application source, Stripe object, database row, setting, key permission or production deployment was changed. Refunds remain off. Thirty original business/storage fingerprints match; the single active administrator session changed between checkpoints and is explicitly disclosed rather than counted as unchanged.

See the [payment-readiness review](stripe-payment-readiness-review.md) for the evidence matrix, live-activation work still required, retention rules and fresh operational checks. The result is readiness for continued controlled preview testing, not approval to launch live payments. [Exact evidence](evidence/stripe-payment-readiness-review.json).

## Previous: committed alternative-refund sandbox test passed

On **21 October 2026 at 16:26 UTC**, the actual administrator form recorded the separate **QA21 ALT / DD-AFDVANK7** scenario once. This was a clearly labelled **£1.10 simulated alternative repayment**, not a real bank payment or evidence of real funds received. The result shows **Stripe refunded £0.00 / alternative repayment £1.10**, payment REFUNDED, payout CANCELLED and zero fee/proceeds. One immutable repayment audit, one accounting event and one in-app notice per synthetic party were committed. The private PDF downloaded successfully and its SHA-256 matched the uploaded file. [Completed browser result](evidence/stripe-alternative-refund-e2e-completed.jpg) · [Review step](evidence/stripe-alternative-refund-e2e-review.jpg) · [Exact verification](evidence/stripe-alternative-refund-e2e-verification.json).

Hosted Stripe sandbox Checkout and the existing worker actually authorised/captured 110p. A real sandbox refund then failed asynchronously with `expired_or_canceled_card`; the final independent Stripe read still shows exactly one failed refund and zero successfully refunded. Transporter confirmation and the app's failed-instruction prerequisite were seeded, so this verifies the new recording flow rather than the complete customer/transporter booking flow. No application code, credential, permission or setting changed during this pass.

**Refunds stayed OFF throughout.** All 31 original table/storage counts and fingerprints still match after excluding only this new scenario's rows. The original **£110 case remains PAID / £0 refunded / HELD and reserved**. Production deployment/aliases, the preview flag's timestamp and live payments are unchanged. The 13 new QA21 ALT rows are deliberately retained because the successful alternative-refund audit is immutable; do not disable guards or delete its supporting evidence for cleanup. Genuine insufficient-balance reversal failure/retry remains a separate open gate under the existing account configuration.

The verified application is still `2a670bf58ccb5eddc10a4a3a369612ebe6f1bcea`, ordinary preview `dpl_6QX2RG7W88UKSNVuGyWW4RQsgwbF`, feature alias only. Later documentation-only commits may supersede this equivalent application build. See [implementation and test boundaries](stripe-alternative-refund-recording.md).

## Previous: approved alternative-refund recording implementation

The approved **Record alternative refund** workflow now has a preview-only implementation: read-only canonical preflight, two-step evidence/confirmation form, immutable private audit and evidence, duplicate checks, separate Stripe/external totals and atomic full-settlement accounting. The additive schema is applied only to preview. Eleven actual PostgreSQL rollback checks and 19 lifecycle cases pass; all 31 original-data fingerprints still match. See [implementation and boundaries](stripe-alternative-refund-recording.md).

**No alternative repayment has been recorded.** The retained £110 failed case, its reservation and payout hold remain unchanged; `STRIPE_REFUNDS_ENABLED=false`, live payments and production remain untouched. A separately bounded disposable scenario is still needed to verify a committed end-to-end simulated repayment. Genuine insufficient-balance reversal failure/retry also remains open.

Verified ordinary preview `dpl_6QX2RG7W88UKSNVuGyWW4RQsgwbF` is READY on application commit `2a670bf58ccb5eddc10a4a3a369612ebe6f1bcea`, with only the feature alias. The real administrator form passed canonical Stripe preflight: failed refund, £0 refunded and no transporter transfer. Reference/evidence remain empty, confirmation unchecked and submission disabled. All 31 fingerprints were checked again afterward. Production remains `dpl_B4bCCxXTQT3EECVXJT6CF2cC6YUz` with its original three aliases; the false refund flag and its timestamp are unchanged. [Form proof](evidence/stripe-alternative-refund-form.jpg) · [Exact verification](evidence/stripe-alternative-refund-verification.json). Later documentation-only commits may supersede this equivalent application build.

## Historical read-only review: failed £110 fixture

On 21 October at 02:10 UTC, canonical Stripe and preview records confirmed the retained £110 payment uses the deliberate asynchronous refund-failure card ending **5126**. Exactly one refund is failed, successful refunded total is £0 in both systems, and the original instruction, ledger/correction audit, notices and payout hold are preserved. All 31 full original-data fingerprints match. Refunds remain off; no financial, settings or database mutation was performed.

No supported successful retry or different-card refund was established for this charge. At that review, the app had no completion path for recording independently confirmed alternative repayment. The next product step was to review the proposed administrator flow; the fixture remains unsettled and must stay retained. See [failed-refund recovery plan](stripe-failed-refund-recovery-plan.md) and [fresh evidence](evidence/stripe-failed-refund-review.json). Genuine insufficient-balance reversal failure/retry remains separately unverified.

## Status

**21 October 2026, current checkpoint:** Booking-confirmation duplication is fixed in `60351a922963c7207fed61f3d5170a929dd80c16`. A database claim per request/status/recipient admits one notice and one best-effort email attempt across webhook/worker races. The regression fails with four notices against the old source and passes with two after the fix. The real **QA21 REV / DD-XSMTG5ZY** capture produced one booking notice per synthetic party.

The approved pass also verified an **actual lost transfer-reversal response**. Hosted Checkout and the worker captured **£1.10**; the authenticated administrator released **£1.00** and submitted its full refund/recovery. The temporary hook destroyed both HTTP 200 reversal responses before reading their bodies. Stripe's second response was an idempotent replay. DriveDrop retained the confirmed customer refund and recovery hold, then its **01:51 UTC** worker recovered the existing reversal: exactly one refund, one reversal, one ledger event for each and one refund notice per party. [Administrator proof](evidence/stripe-reversal-network-recovered.jpg) · [Exact evidence](evidence/stripe-reversal-network-verification.json).

**Refunds are OFF; the temporary hook is removed and the notification fix remains.** READY ordinary preview `dpl_F3RPyzKUqd141LEeurZmLozT1ur6`, runtime `568922ede70231c37b6a22a5c6eb9feb8b7c1c61`, has only the feature alias. Health and authenticated admin GET verify the disabled runtime. Guarded cleanup removed only 17 settled fixture rows and restored the test's two Connect read-check timestamps; all **31 complete table/storage fingerprints match the baseline with no exclusions**, including the administrator session and original failed-refund case. All 29 environment entries match except the scoped flag timestamp. Production's original deployment and three aliases, live payments and key permissions are unchanged during this pass. A later documentation-only preview may supersede this equivalent disabled build.

The disposable booking's transporter confirmation and delivery/review-window state were simulated; capture, transfer, refund, socket loss and scheduled recovery used real sandbox operations. Email remains best effort, with no delivery guarantee/outbox added. **Remaining:** a supported genuine insufficient-balance reversal failure/retry reproduction under the existing liability/reserve configuration. The connected account assigns negative-balance responsibility to the application, and the earlier zero-balance reversal succeeded. The original failed £110 refund is still held; no replacement was authorized. Keep refunds off between bounded tests. Details and limitations: [refund preparation](stripe-refund-preparation.md).

### Previous actual refund connection-loss checkpoint (historical; superseded)

**21 October 2026, current checkpoint:** The explicitly approved **QA21 NET / DD-CAKZ0WUQ** test verified an actual lost refund response. A narrowly scoped temporary native HTTPS hook destroyed both successful Stripe responses before reading their bodies. The second response carried `Idempotent-Replayed: true` and the same key digest. DriveDrop logged RETRY_PENDING, then recovered automatically: exactly one successful **£1.10** refund, one refund ledger entry and one refund notification per synthetic party. The dispute resolved and the **£1.00 transporter proceeds** were cancelled. [Administrator proof](evidence/stripe-network-refund-recovered.jpg).

**Refunds are OFF and the temporary hook is removed.** READY ordinary preview `dpl_7SqgmLqVncaTgv6ThFSUTrtbZsrg`, runtime `126381c9d1f1d36cbaaf3d02d16c324861441d48`, restores the exact pre-test application tree and has only the feature alias. Health and authenticated admin GET verify the disabled runtime. Guarded cleanup removed only the new settled fixture and six identified notifications. All **31 full table/storage fingerprints match the original baseline**, with no exclusions; all 29 environment metadata entries match except the scoped flag timestamp. Production's original deployment and three aliases, live payments, key permissions and original failed £110 refund are unchanged during this pass. No temporary authentication session, stored file or secret export was created. A later documentation-only preview may supersede this equivalent disabled build.

The £1.10 Checkout authorisation, worker capture and administrator refund used real sandbox Stripe operations. Only disposable booking setup/transporter-confirmation state and the app dispute were seeded; this was not an end-user booking-flow test. Automatic recovery finished before the next minute run, consistent with webhook handling. **Remaining:** genuine insufficient-balance reversal failure/retry, an actual lost reversal-POST response, and a separate fix for duplicated booking-confirmation notices observed during setup (two per party; refund notices were one per party). Keep refunds off between bounded tests. Details: [refund preparation](stripe-refund-preparation.md) and [network evidence](evidence/stripe-network-refund-verification.json).

### Previous interrupted-persistence checkpoint (historical; superseded)

**21 October 2026, current checkpoint:** The deployed worker recovered two controlled reconstructions of interrupted persistence: a missing £1.10 refund result/ledger and a missing £1.00 transfer-reversal result. It found the original canonical Stripe objects, cleared expired leases/reservations and recorded each required ledger event once. Later scans preserved the same totals and object counts. No new charge, refund, transfer or reversal was created. The actual UI showed the confirmed customer refund and recovered transporter funds. [Refund proof](evidence/stripe-response-loss-recovered.jpg) · [Reversal proof](evidence/stripe-response-loss-reversal-recovered.jpg).

**Refunds are OFF.** READY ordinary preview `dpl_5jLWgHXj4biXMh7MKyynfjWUqmX8`, runtime `3ff98ccfb0851de0675089949a2f2c4ff715d4a3`, has only the feature alias. Health and authenticated admin GET verify this disabled build. Both temporary reconstructions and their two new notifications were removed under transaction guards. All **31 full table/storage fingerprints match the original baseline**, including the existing administrator session, failed-refund record and 136 stored-file rows. All 29 environment metadata entries are unchanged except the scoped flag timestamp; production's original deployment and three aliases, live payments and key permissions are untouched. No application code or schema changed and no secret was displayed. A later documentation-only preview may supersede this equivalent disabled build.

This verifies real deployed canonical recovery from reconstructed missing persistence. It does **not** establish an actual network interruption or repeated Stripe POST/idempotency-header test. Genuine insufficient-balance reversal failure/retry remains unverified: the earlier reversal at zero available balance succeeded, and no reserve/liability setting or Payouts Write permission was changed to force a failure. The original £110 failed refund remains unpaid and held. Exact results and remaining checks are in [stripe-refund-preparation.md](stripe-refund-preparation.md) and [response-loss evidence](evidence/stripe-response-loss-verification.json).

### Previous completed dispute refund checkpoint (historical; superseded)

**21 October 2026, current checkpoint:** The explicitly approved **QA21 DUI / DD-8PQPLSUI** dispute refund completed through the actual administrator UI. Stripe confirms exactly one successful **£1.10** refund, `re_3USmp6LAzgkvCvrI0e2nIGZu`. DriveDrop resolved the dispute, cancelled the **£1.00 transporter proceeds**, cleared its refund reservation and recorded one refund event plus one notification per synthetic party. The UI shows the customer fully refunded and £0 fee/proceeds. [Completed dispute refund](evidence/stripe-dispute-refund-completed.jpg).

**Refunds are OFF.** READY ordinary preview `dpl_AN1M1K3LFhTVgYnh3DQ7e21FWq1A`, runtime `78262db7dd9533aa490b73c6e1a49da8e8effb00`, has only the feature alias. Authenticated admin GET verifies false on all original 20 disputes after cleanup. All 29 environment entries are preserved; only the existing flag's update timestamp changed. A later documentation-only deployment may serve the same disabled application code.

The settled test and its 13 identified notifications were removed with transaction guards after canonical settlement. All **31 complete table/storage fingerprints exactly match** the saved original baseline, including the signed-in administrator session and 136 stored-file rows; no fixture exclusion is now needed. Production's original deployment and three aliases, live payments and key permissions are untouched. No secret was displayed. The original £110 failed-refund fixture remains unpaid and held.

Real charge-dispute events/holds and the dispute-driven refund UI have now passed. Genuine insufficient-balance reversal failure/retry and remaining real lost-response scenarios remain unverified; refunds stay off. Exact results and remaining checks are in [stripe-refund-preparation.md](stripe-refund-preparation.md) and [completion evidence](evidence/stripe-dispute-refund-completion.json).

### Previous charge-dispute checkpoint (historical; superseded)

**21 October 2026, current checkpoint:** Real `charge.dispute.created`, `charge.dispute.updated` and `charge.dispute.closed` deliveries are verified. A real sandbox event exposed a missing payout hold when refunds were disabled. Fix `2e714f307aceb8f958368c1cbd93180163644cd3` keeps canonical safety checks active while creation remains off. Replaying the event changed only the disposable payment's payout status to HELD; update, closure and stale-created replay preserved the hold without creating a refund, transfer or ledger adjustment. [Held payment](evidence/stripe-dispute-held.jpg).

**Refunds are OFF.** Ordinary preview `dpl_6A4aD6zFVeQoJ9CBWhxmisd2neCR`, runtime `2e714f307aceb8f958368c1cbd93180163644cd3`, is READY with only the feature alias. Authenticated admin GET confirms the false flag. All 29 environment entries are preserved; only the existing scoped flag's update timestamp changed. Production remains on its original deployment and three aliases.

The disposable card dispute was won using Stripe's documented test evidence, then its £1.10 charge was fully refunded once through the sandbox Dashboard. Its settled app fixture and five notifications were removed. The separate **QA21 DUI** app-dispute test remains OPEN / payout HELD with £1.10 captured, £0 refunded and no refund/payout instruction. Automatic approval review rejected accepting its full-refund confirmation because the available authorization did not explicitly cover that exact financial resolution. The confirmation was dismissed; do not retry through another API. [Retained case](evidence/stripe-dispute-refund-paused.jpg).

To finish that UI test, obtain explicit approval to temporarily enable only feature-preview refunds, return **£1.10** to the synthetic customer for **QA21 DUI / DD-8PQPLSUI**, cancel its **£1.00** transporter proceeds, then switch refunds off and remove only the settled fixture. No real money is involved. Both temporary API sessions and temporary verification metadata are removed. All **31 table/storage fingerprints match** the baseline after excluding this retained fixture and its 11 notifications. The original failed-refund case is unchanged and still held. Actual insufficient-balance reversal failure/retry remains unverified; the earlier successful reversal cannot establish that gate. Exact IDs, evidence and remaining checks are in [stripe-refund-preparation.md](stripe-refund-preparation.md).

### Previous completed recovery checkpoint (historical; superseded)

**21 October 2026, current checkpoint:** The explicitly approved £1.10 sandbox refund and £1 recovery completed through the actual administrator UI. Stripe confirms exactly one successful 110p refund and one 100p reversal of the original booking transfer. The app finished SUCCEEDED / RECOVERED, cleared its reservation, and shows the payment fully refunded with payout cancelled and zero fee/proceeds. [Admin result](evidence/stripe-recovery-completed.jpg).

**Refunds are OFF.** READY ordinary preview `dpl_6JeNBhqCp4a25pB2Fsvze8HaR78A`, runtime `441fa2d3eeace91b9f6f2f8dd4618e4c04d3c8f9`, has only the feature alias. Authenticated admin GET confirms the false flag. Only the existing Preview / `feature/ui-polish` flag was toggled; all other environment metadata and the production deployment/aliases are unchanged.

The expected insufficient-balance hold did **not** occur: Stripe allowed the reversal and the connected balance became -£1. The approved £1 sandbox funding restored it to £0 future payouts; the earlier £2 in transit remains separate. This verifies successful recovery, but leaves the genuine insufficient-balance/retry gate unverified. The daily / 7-day schedule and saved bank ending 1116 are unchanged. [Restored balance](evidence/stripe-recovery-balance-restored.jpg).

The settled recovery fixture and its eight notifications were removed with transaction guards. All 31 table/storage fingerprints exactly match the previous checkpoint after its fixture exclusions; the signed-in administrator session, original failed-refund record and all original preview data are preserved. See [stripe-refund-preparation.md](stripe-refund-preparation.md) for exact Stripe/audit IDs, remaining charge-dispute and retry gates, and the earlier operational notes. Restricted-key permissions remain the approved table below. The original failed-refund case remains held and unsettled.

### Previous paused checkpoint (historical; superseded)

**20 October 2026, current checkpoint:** Administrator sign-in is complete. The actual admin payout page verifies the repaired late-refund-failure notice, £110 captured / £0 refunded, £10 fee / £100 proceeds, and the retained payout hold. [Admin evidence](evidence/stripe-late-refund-admin.jpg). Both replacement restricted keys work; their permissions remain the approved nine/three rows below.

**Refunds are OFF again.** READY ordinary preview `dpl_EU2LM7ZMyBH6P5Mj2GoN8F4iVgEt`, runtime `7a17a0455a2666f893451903c7114004c8118867`, has only the feature-branch alias. The flag was briefly enabled for a bounded synthetic pass, then disabled after automatic approval review rejected clicking **Refund customer £1.10** because it required explicit approval for enabling refunds and processing that payment. No refund request was submitted; canonical Stripe confirms `livemode=false`, 110p captured and 0p refunded, with zero new refund instructions. Do not retry through another API or bypass the review.

The new disposable recovery fixture `QA20 REC` is retained: one £1.10 sandbox payment, one £1 booking transfer and one successful £1 sandbox bank payout, leaving £0 available in the connected account. An additional £2 simulated platform top-up leaves £2.87 available for the eventual refund/recovery test. This is the concrete insufficient-balance test awaiting approval; it has not passed yet. [Paused test payment](evidence/stripe-recovery-test-paused.jpg). The unused charge-dispute fixture, temporary verification metadata and both temporary test sessions were removed. The user's administrator browser session is preserved.

The original daily / 7-day payout schedule is canonically restored and the saved bank ending 1116 is unchanged. Original preview data and storage fingerprints match after excluding this new retained fixture; only the disposable Connect account's bank-outcome metadata changed. All 29 environment entries remain, with only the scoped refund flag's update timestamp changed. Production's original deployment and three aliases are unchanged in this continuation.

Earlier verified results remain valid: both bank-payout failure and success passed with real webhooks; the late-failure worker repaired its retained case exactly once; all 19 database lifecycle checks passed. The original failed-refund fixture is still unpaid and remains held. See [stripe-refund-preparation.md](stripe-refund-preparation.md) for exact identifiers, the approval block, cleanup and remaining charge-dispute/UI checks. The checkpoints below are historical.

### Prior sandbox QA checkpoint (historical; superseded)


**Latest verification — 20 October 2026:** The approved restricted-key permission is saved: **Charges and Refunds → Your account → Write**. The other eight configured permission rows and every connected-account scope remain unchanged. Actual before/after-transfer partial/full refunds, £75 transfer recovery, £25 applied-fine restoration, duplicate/stale-request protection and pending-to-success webhook reconciliation passed. **A later `refund.failed` leaves the app's successful refund ledger unchanged while holding the payout. This blocks activation.**

Refunds are now **OFF** (`STRIPE_REFUNDS_ENABLED=false`, Preview / `feature/ui-polish`) on READY deployment `dpl_FFkzDEdd16pHLVg8VUJXTxG1ia1y`, `drivedrop-jrcchbx0b-future-9f39.vercel.app`, runtime commit `471e22a190822d1f819099f1be50ca64dcb99d73`. Authenticated read-only `/api/admin/disputes` returns 200 and false for the refund flag. No application source changed. See [stripe-refund-preparation.md](stripe-refund-preparation.md) for actual Stripe IDs, the retained failing case, cleanup and remaining checks.

All settled QA fixtures were removed after their charges were fully refunded and the transfer fully reversed. One failed-refund fixture is retained; no temporary QA sessions remain. All 29 original-data table counts/fingerprints match, plus the original 16 users, 52 bookings and 136 stored-file fingerprints below. The retained disposable Connect account's check metadata is the only pre-existing synthetic row that changed.

Bank payout testing remains blocked by **No valid option available** in Stripe's payout destination field. No bank payout was submitted. The disposable account still has test bank ending1116, and its original daily/7-day schedule is restored and canonically verified. A fresh balance UI read was blocked by session expiry; the full £75 transfer reversal is canonically verified.

Two disclosed operational incidents are recorded in the refund document: Stripe unexpectedly included sandbox key values in one accessibility response, and the initial Vercel staging deployment temporarily moved a production convenience alias. No keys were copied into source/configuration or rotated; later reads were redacted. The alias was restored before QA charges. All production aliases now resolve to the original deployment, all existing environment entries match the baseline, and no live payment or production deployment was created.

### Verified restricted-key permissions

Key name: `DriveDrop preview Connect payouts`; current replacement object ID: `mk_1USkboLAzgkvCvrI7soNoQCy` (original `mk_1USOOgLAzgkvCvrIOAF4iATu` was rotated); sandbox: `acct_1US4BzLAzgkvCvrI`. The saved permission summary was reopened after saving. This table records permission labels only, never the secret key.

| Resource | Your account | Connected accounts |
| --- | --- | --- |
| Account Links | Write | None |
| Accounts | Read | None |
| Accounts v2 | Read | Read |
| Charges and Refunds | **Write (only change)** | None |
| Login Links | Write | None |
| Payment Intents | Read | None |
| Payouts | None | Read |
| Recipient Configuration | Write | Write |
| Transfers | Write | None |

### Earlier checkpoints (historical; superseded by the current status above)

**Verified preview deployment:** `dpl_GHFtnNbMEYLS13F4pNgqdypNYXCG` is READY at `drivedrop-g9j6uh2ej-future-9f39.vercel.app`, target preview/null, branch `feature/ui-polish`, runtime commit `9698c5f82fd83bf239b41e14013187174d5ade27`. The stable preview `/api/health` returns 200/ok and unauthenticated `/api/admin/disputes` returns 403. No error/fatal runtime logs were found for this deployment in the checked window. The project environment-variable inventory confirms no `STRIPE_REFUNDS_ENABLED` entry. The original data fingerprints match; the new refund table and all payout instructions remain empty. These are deployment/gate checks, not authenticated UI or real-money-flow verification.

**Latest continuation — durable refunds implemented, activation off:** `src/lib/stripe-refunds.ts` now connects the tested refund policy to durable instructions, admin routes, dispute confirmation, fine restoration, separate transfer recovery, webhooks and the background scheduler. Preview migration `20261020193911_stripe_refund_sandbox` is applied with RLS and no client access. The table contains zero records. Local concurrency/failure/accounting/API/UI tests and a complete Next build pass; actual Stripe refund/bank-payout QA remains unverified. `STRIPE_REFUNDS_ENABLED` is absent/off, and Stripe key permissions have not changed. The platform webhook now includes seven refund/charge-dispute events in addition to the existing nine; its URL, bypass and API version are unchanged. See `docs/stripe-refund-preparation.md` for exact remaining gates.

The fresh browser recovery attempt also timed out after five minutes, before documentation/UI state was returned. No additional browser retry, sign-in, temporary app session or money operation was attempted. The retained zero-funded fixture below is unchanged, as are the saved original-user/booking/file fingerprints. The earlier "preparation only" paragraph below is historical and superseded by this entry.

**20 October continuation:** A new disposable transporter (`dd_bank_20261020a_transporter`) and connected account (`acct_1USi72LAzgvhqEGk`, DB row `2793ede9-0abe-4c29-bc2a-4befbf27ace9`) completed hosted onboarding. Stripe's documented GBP failure bank (sort code `108800`, account `11111116`, `no_account`) was accepted. The real thin webhook set the preview row to `READY` at 18:53:21 UTC before any status refresh. No booking, customer charge, transfer or bank payout was created in this continuation. Express showed a zero balance, but its **Update payout settings** panel returned **Sorry, something went wrong**. The platform dashboard returned to sign-in; after secure password/authenticator submission, two browser-service calls timed out after approximately five minutes each. The post-authentication state is unknown. Stop browser retries in this session; do not describe this as a Stripe outage or bot-detection block.

The new zero-funded test transporter and its Connect mapping are retained for resuming bank-payout QA without repeating onboarding. Its temporary app session was revoked and local private links/credentials removed. All 16 original users, 52 bookings and 136 stored-file rows still have the fingerprints recorded below. There are zero payout instructions and zero fixture bookings/sessions. Production, runtime deployment and Stripe key permissions are unchanged. Refund calculation/validation groundwork is prepared and tested in `src/lib/stripe-refund-policy.ts`; it is **not connected to routes or deployed as a financial feature**. See `docs/stripe-refund-preparation.md` for remaining implementation and verification.

### Verified runtime from 19 October

Implementation and credentials are configured on `feature/ui-polish`. Both platform liability acknowledgement and the synthetic transporter's Connected Account Agreement were explicitly approved and completed on 19 October 2026. `STRIPE_CONNECT_ENABLED=true` is active on preview deployment `dpl_5NCsJiReEkcd2jFYwmdUdD9cogFA` (runtime commit `ce0b614cc39452a0d96c92f43865c75a7e71f91d`, preview target only). Real sandbox onboarding, Express access, captured-payment release, fine deduction, duplicate protection, automatic recovery and transfer reversal passed. Bank-payout success/failure testing remains incomplete: Stripe Express failed twice to load the existing GBP test-bank edit form.

Existing sandbox customer Checkout remains active. The additive migration `20261019213129_stripe_connect_sandbox` is applied to shared preview database `yozbuuvebzxitoqrvyer`. Client-role access is denied and RLS is enabled. All 16 original users, 52 bookings and 136 stored-file rows retain their exact pre-change fingerprints. The £75 test transfer was fully reversed, the £110 customer test charge fully refunded, and the zero-balance synthetic Stripe account closed. All temporary app fixtures, Connect records and sessions were removed; Stripe audit history remains in the sandbox.

The user selected Stripe-hosted onboarding with the Express dashboard on 19 October 2026. Production and live money remain disabled. Do not merge or deploy production as part of this work.

## Confirmed configuration

- Accounts v2 (`/v2/core/accounts`), no legacy account type.
- Transporters: UK recipient accounts requesting Stripe balance transfers; payout capability is checked separately. Merchant/card-payment capability is not requested.
- Dashboard: Express, accessed through authenticated, short-lived login links.
- Onboarding: Stripe-hosted, collecting eventual and future requirements. Return is not proof of verification; canonical v2 capability checks decide readiness.
- Fee collection and negative balance liability: DriveDrop (`application`).
- Charge pattern: separate charges and transfers. The existing platform Checkout capture stays in place; a source-charge-linked transfer follows delivery, confirmation, the 24-hour window (or explicit dispute-resolution override), and admin release.

## Fees and funds flow

The existing pricing is unchanged: by default a 10% markup on the transporter's quote. A £100 quote produces a £110 customer charge, a £10 recorded DriveDrop fee, and £100 transporter proceeds before any valid fine deduction. Stripe processing/Connect charges reduce DriveDrop's margin; £10 is not guaranteed profit. Check the current UK rates at https://stripe.com/gb/pricing and https://stripe.com/gb/connect/pricing before live launch, especially for small bookings.

A £25 eligible fine reduces that example's transfer to £75. Fine accounting retains its existing completion-order policy. Adjustable admin dispute fines remain distinct from the fixed £50 active-delivery cancellation fine.

`application_fee_amount` is not used with separate charges and transfers. The platform retains the recorded fee by transferring the remaining transporter proceeds.

## Negative balance liability

DriveDrop is responsible for connected-account negative balances in this configuration. Stripe debits platform charges/refunds/disputes to DriveDrop; recovering transferred funds requires an explicit transfer reversal. An Express dashboard does not let a transporter manage platform-charge refunds or disputes. Stripe-backed post-booking refunds, dispute recovery and reversal failure handling remain the next phase and are a live-launch blocker.

### Platform liability acknowledgement completed

The first real account-creation request failed with HTTP 400, `account_creation_losses_collector_unavailable` (Stripe request `req_v2xuP4yoyjLDa6AXw`). This was resolved by the explicitly approved **Refunds and chargebacks liability acknowledgement** in the sandbox Platform profile. Stripe shows **Completed 19 October 2026**.

The review form describes responsibility for refunds, chargebacks and fines; checking sellers against restricted-business/product rules; seller payment/risk support; and losses from seller fraud and connected-account negative balances. It also says Radar Pro is enabled and displays **£0.08 per screened transaction and £3.75 per connected account**, with plan changes available in Settings. The form does not specify a billing interval for the connected-account price; do not infer one.

The user approved this acknowledgement and its disclosed pricing before it was submitted. Do not silently change loss liability, charge pattern or dashboard experience. Live launch needs a separate review of liability, pricing and refund/reversal recovery.

### Hosted-onboarding agreement completed

The temporary transporter `dd_connect_20261019b_transporter` mapped to account `acct_1USOoTLAzgOujhnB` and DB row `89cb4cef-ba6a-4f63-a525-f55ebc48c37b`. Hosted onboarding used Stripe's built-in test phone/code and test bank shortcuts, a synthetic identity with the documented successful-verification DOB/address values, and a sandbox-only service description. No real identity or bank information was used.

Automatic approval review initially rejected **Agree and submit** because the earlier platform approval did not cover this separate agreement. The user then explicitly approved the Connected Account Agreement, certification of the supplied test details and autodialed-text-message consent. The approved submission succeeded at approximately 22:26 UTC. Stripe reported both capabilities active; a real thin webhook updated the preview row to `READY` at 22:27:22 UTC before any app status refresh. The authenticated status endpoint subsequently returned `ready=true`, `requirementsDue=false`.

## Risk management

DriveDrop keeps control of release timing and dispute handling. The payout engine checks the canonical captured charge, amount, refunds, currency, sandbox mode, environment, booking ownership and account capabilities. It rejects a disputed or externally changed charge before a new transfer. Existing manual transfer reversals are reconciled into a held record; they never trigger a replacement transfer.

## Transporter experience

Account shows a Stripe payout setup card when the feature is enabled. Onboarding and bank details stay at Stripe; DriveDrop stores account identifiers, capability/status flags and an immutable creation request name/email snapshot. Links are returned only to the authenticated active transporter and are not emailed, logged or persisted.

The account card prompts for outstanding requirements and shows the latest account-level bank-payout status. A bank payout can combine several bookings, so it never serves as proof that a particular booking reached the bank. The admin screen distinguishes processing, release to Stripe and a payout needing attention. The existing `PAID` ledger value means platform release; Stripe rows explicitly label that as release to the Stripe balance.

For a later in-app account experience, Stripe recommends `notification_banner`, `account_onboarding` and `account_management`, with `payouts` for balance/payout views. The confirmed hosted flow currently uses a DriveDrop status/remediation prompt and Express for these activities. Platform-charge payment/dispute detail remains limited in connected-account components.

## Durable processing

- One `StripeConnectAccount` per user/environment, with stable account-creation idempotency and immutable creation inputs.
- One `StripePayout` per booking payment, with an immutable recipient, source charge, gross amount, reserved fine, net transfer and idempotency key.
- Commit the release instruction before calling Stripe. Reserve fines once under a transporter-level lock; failed attempts retain the same reservation until reconciled.
- Re-check booking/dispute eligibility under the shared booking lock at transfer creation. This serializes the release with application dispute/refund writes.
- Retrieve existing transfers by stored ID or unique transfer group before creation. Recover API timeouts and database-commit loss without another transfer.
- No new attempt after 23 hours unless an existing matching transfer is found; ambiguous old operations need review rather than relying on an expired Stripe idempotency key.
- Zero-net proceeds produce a settled fine-offset record without a zero-value Stripe transfer.
- A two-minute lease prevents overlapping workers. The existing preview scheduler handles one queued payout per run after customer-authorisation recovery. Requests are acknowledged with 202 before background work; accepted does not mean transferred.
- `PENDING` and `RETRY` releases are recovered automatically. Blocked/ambiguous operations require admin review/retry. Bank payout failure never recreates a booking transfer.
- Both new tables have RLS and no public/anon/authenticated privileges. Their amount/environment constraints and foreign keys retain financial records.

## Webhook integration

Signed events trigger canonical account, transfer and bank-payout retrieval; duplicate and out-of-order events cannot establish readiness or send a second transfer.

Configured in the approved sandbox:

1. Existing platform webhook `we_1USMj9LAzgkvCvrIzq4UAION`, `/api/stripe/webhook`, API `2024-06-20`: retained all six Checkout/PaymentIntent events and added `transfer.created`, `transfer.updated`, `transfer.reversed`.
2. Connected-account snapshot destination `we_1USOU7LAzgkvCvrIGrZUbMzB`, `/api/stripe/connect/webhook`, API `2026-09-30.endive`: `payout.created`, `payout.updated`, `payout.paid`, `payout.failed`, `payout.canceled`, with connected-account events enabled.
3. Accounts v2 thin-event destination `ed_test_61VbmRecTPCFvX0Rl16VbS9L66E94D44RaGMWQTQuVse`, `/api/stripe/connect/events`: `v2.core.account[requirements].updated`, `v2.core.account[future_requirements].updated`, `v2.core.account[configuration.recipient].capability_status_updated`, `v2.core.account.closed`; `events_from=["@self","@accounts"]`.

All three destinations are enabled. The two Connect handlers return 503 if the feature flag is false. Existing customer-payment events remain enabled and their handler is independent of the Connect feature flag.

Keep Vercel protection enabled. The approved automation bypass may be used on these preview webhook URLs; the entire URL is secret. Do not put the bypass value, API keys, signing secrets or account/login links in source or chat.

## Activation and credential scope

Only `acct_1US4BzLAzgkvCvrI` (drivedrop sandbox) is allowed. `STRIPE_CONNECT_ENABLED=true` is required; production remains blocked regardless of configuration. The SDK is pinned to Stripe Node 23.0.0 / API `2026-09-30.endive`; the existing customer-payment integration stays on its verified API version.

The **separate restricted sandbox key** `DriveDrop preview Connect payouts` (`mk_1USOOgLAzgkvCvrIOAF4iATu`) is created and its sandbox identity was verified. Its permissions cover only the operations used by this implementation:

- Read current platform account and PaymentIntents; write own-account Charges and Refunds (approved and verified 20 October).
- Create/read Accounts v2 recipient accounts; create Accounts v2 account links and Express login links.
- Create/read Transfers (including retrieval of reversals through their transfer).
- Read connected-account Payouts; no bank-payout creation permission is needed by the application.

The key was created through the approved Stripe Dashboard flow. The existing Checkout key was not widened. The new key is stored as sensitive `STRIPE_CONNECT_SECRET_KEY`, Preview / `feature/ui-polish` in project `prj_8BO4s7P2sffGKR4czg6nHOZqg4Ze`.

The snapshot and thin signing secrets are stored as sensitive `STRIPE_CONNECT_WEBHOOK_SECRET` and `STRIPE_CONNECT_EVENTS_SECRET` in the same branch scope. The code requires both webhook secrets and the existing recovery secret before making Connect API calls. These credentials are server-only. The feature flag was enabled last and remains enabled on the verified preview deployment. The existing customer-payment key, production configuration and UI design were not changed during this QA pass.

## Verification

Local tests with mocked Stripe/DB boundaries cover release rules, concurrent requests, one fine reservation, source-charge matching, network/response/commit loss, zero-net fines, new disputes, stale ambiguous attempts, account ownership/capabilities, live/environment/amount mismatches, reversal handling, admin authorization, 202 semantics and stale bank-event handling. Existing payout-policy, adjustable-dispute-fine and payment-recovery checks also passed. The final lock fix passed `test-stripe-connect.cjs`, `test-dispute-fines.cjs`, TypeScript and the Vercel production build. Mocks did not reveal the PostgreSQL result-type issue described below.

Nine deployed security probes passed: unsigned snapshot/thin rejection; signed snapshot/thin acceptance and duplicate acceptance; live-mode snapshot rejection; wrong-origin onboarding rejection; and rejection of a transporter calling the admin release endpoint. These synthetic signed probes alone do not prove Stripe event delivery.

### Actual sandbox flow, 19 October 2026

| Check | Evidence |
| --- | --- |
| Restricted-account release gate | Before onboarding submission, authenticated admin release returned 400: transporter must complete Stripe verification; no release instruction was created. |
| Hosted onboarding and real account event | Approved submission completed; canonical Stripe capabilities became active and the thin webhook independently set preview status to READY. |
| Customer payment | App quote selection created request `cmvfttcht0001l808vuq6oldb`. Hosted Checkout authorised £110 using Stripe's documented international test card that bypasses the pending balance. The actual transporter-confirm endpoint captured intent `pi_3USP4JLAzgkvCvrI0yXGZdWM`. |
| Release prerequisites | Only the synthetic booking was advanced to delivered/customer-confirmed beyond 24 hours. A £25 eligible dispute-fine ledger fixture was seeded. This pass tests reservation/deduction, not the already-tested dispute-fine input UI. |
| Correct release | Instruction `e0e4e44e-96db-4b79-909d-5d9a09496c89`: gross 10000p, fine 2500p, transfer 7500p. Stripe transfer `tr_3USP4JLAzgkvCvrI0KqInlQw` targets the synthetic account and source charge `ch_3USP4JLAzgkvCvrI08hgIgjL`; GBP and livemode=false verified. |
| Repeated/concurrent release | Two concurrent admin requests returned the same instruction with PAID status. Stripe returned exactly one transfer; the database held one fine application and one payout-completed event. |
| Lost database completion | Only this fixture's completion fields/event were reset while its external transfer and immutable fine reservation remained. The automatic cron run at 22:42:01 UTC recovered the same transfer, checked=1/failed=0. One transfer, fine application and completion event remained. |
| Express dashboard | App-created login link worked with Stripe's built-in test-code shortcut. Express visibly showed £75 earnings and £75 available balance. |
| Transfer reversal and real platform webhook | Full reversal `trr_1USPNDLAzgkvCvrIs385tUZ5` returned 7500p. The actual Stripe webhook changed the instruction to REVERSED and payment release to HELD. Another admin release stayed HELD on the same instruction. |
| Refund and cleanup | Refund `re_3USP4JLAzgkvCvrI0McOI7ga` succeeded for 11000p; canonical charge showed fully refunded. The connected-account dashboard showed £0 balance and £0 in transit before deletion; Accounts v2 then returned closed=true. All temporary application records and sessions were removed. |

The first real release attempts completed every Stripe read with HTTP 200 but failed before writing the payout instruction. PostgreSQL's advisory-lock function returns `void`, which Prisma cannot deserialize through `$queryRaw`. Casting that result to `text` preserved the transaction lock and fixed release on the deployed preview. Safe error-code logging was added to preparation failures; raw queries, parameters, payment details and Stripe error bodies are not logged.

### Earlier bank-payout verification checkpoint

Stripe Express returned **We couldn't load your account information** on both attempts to edit the existing GBP test bank. No bank details were changed and no bank payout was created. Real `payout.paid`/`payout.failed` delivery, canonical connected-account payout reads using the restricted key, and account-level remediation after a bank failure remain unverified. Keep this explicit limitation separate from the verified platform-to-transporter transfer. Do not treat the synthetic signed snapshot probe or Express's estimated payout date as a successful bank payout.

Once Stripe's test-bank management works, use a new disposable fixture to finish successful and failed bank-payout tests. Stripe-backed application refunds/disputes and reversal-failure recovery also remain a separate live-launch blocker; the manual QA reversal and refund above do not implement those product flows.

### Preservation and final state of the 19 October pass

- Original users: 16, fingerprint `cee2156e48900d3181a655803ab0d167`.
- Original bookings: 52, fingerprint `c71531a7810c2a5076f83f1dd45ae471`.
- Stored-file rows: 136, fingerprint `ebbe346597d33536e580807e5b9ccf1a`.
- Preview Connect-account rows, payout instructions and fixture sessions: zero after cleanup.
- All temporary users, verification/insurance metadata, job/quote/request/booking/payment, finance events and six synthetic notifications were removed. No storage files were created.
- Private QA credentials, cookies and onboarding/checkout/Express URLs were removed from temporary files. No live funds or production changes occurred.

## Rollback

Before any activation, the feature flag can remain absent/false. After activity begins, first stop new releases and reconcile pending operations with working credentials; only then disable the new destinations and key. Do not delete payout/account records with outstanding instructions, revoke the customer Checkout key, pause the customer-payment timer, or remove existing application data.
