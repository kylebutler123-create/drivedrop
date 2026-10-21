# Stripe refund preparation — 21 October 2026

## Actual refund connection loss verified; refunds off

The user approved a fresh **£1.10 sandbox payment and full refund**, interruption of the refund response, recovery verification, shutdown and disposable-data cleanup. The test completed for **QA21 NET / DD-CAKZ0WUQ** in `acct_1US4BzLAzgkvCvrI`, `livemode=false`, on Preview / `feature/ui-polish`. Stripe confirms exactly one successful 110p refund. DriveDrop recovered automatically, applied the refund ledger once, resolved the dispute and cancelled the 100p transporter proceeds. [Actual administrator result](evidence/stripe-network-refund-recovered.jpg).

Temporary commit `43f369fe72b8a840f12e1f0e4525d317b55581b3` introduced a native HTTPS client hook, restricted to this exact payment, amount, endpoint, branch, environment and existing enabled flag, with a 22 October expiry. It destroyed the incoming response and request after successful Stripe headers and before reading the body. It retained normal TLS validation and the existing restricted credentials. No proxy, public endpoint, secret export, new environment variable or permission change was used. A real local socket test, TypeScript, refund/Connect suites and the full 82-route build passed before deployment.

| Observed boundary | Actual deployed evidence |
| --- | --- |
| Initial Stripe refund response | At **01:16:47.365 UTC**, HTTP 200, request `req_ys49kBlrSzmLRl`, replay false, body incomplete, buffered body 0 bytes; request and response destroyed |
| SDK connection-closed retry | At **01:16:47.976 UTC**, HTTP 200, request `req_AnBIcCqC4kmJy2`, `Idempotent-Replayed: true`, same idempotency-key SHA-256 digest, body incomplete/0 bytes; both destroyed again |
| Application deferral | At **01:16:49.277 UTC**, `Stripe refund reconciliation deferred`, code `RETRY_PENDING`, instruction `1105df09-5ea7-469b-b61b-d9c98126c234` |
| Automatic recovery | Succeeded refund `re_3USo3iLAzgkvCvrI01F165VV`; ledger applied at **01:16:56.193 UTC**, attempt count 2, reservation/lease cleared, recovery NOT_REQUIRED |
| Accounting and later scans | Exactly one 110p REFUND_CREATED event, one refund notification per synthetic party, REFUNDED / payout CANCELLED, 110p refunded and zero fee/proceeds/deduction. Later read after 01:19 preserved the ledger timestamp, attempt count and totals; the canonical list still contains one refund. |

This establishes an actual interrupted refund response and a repeated Stripe POST using the same idempotency key. Recovery finished before the next 01:17 minute run, consistent with webhook reconciliation; no request-specific success log identifies the winning webhook. It does not establish a lost **transfer-reversal** POST response or an insufficient-balance reversal failure. The earlier reconstructed reversal-recovery evidence remains separately described below.

Test setup used a disposable job/quote/request and app dispute, with only that fixture's transporter confirmation/CAPTURING state simulated in the database. Hosted Checkout performed real sandbox authorisation and the existing scheduler captured the payment and created its booking/payment and capture audit. No user authentication session, verification permission, original record or storage object was changed. This is a refund/network-recovery test, not a pass of the end-user booking or transporter-onboarding flow. PaymentIntent `pi_3USo3iLAzgkvCvrI0KnrIBpP` and charge `ch_3USo3iLAzgkvCvrI0UllXyB0` are fully refunded; no transfer was created.

**Refunds are OFF and the hook is removed.** Removal commit `126381c9d1f1d36cbaaf3d02d16c324861441d48` restores the exact pre-test repository tree `79f2e26c3ddd5263bcf32958f009978fe3762542`. Ordinary preview `dpl_7SqgmLqVncaTgv6ThFSUTrtbZsrg`, `drivedrop-mg7cyfsyu-future-9f39.vercel.app`, is READY with only the feature alias; health returned 200 / `126381c9d1f1` at 01:20 UTC. Authenticated administrator GET returned false on all 21 disputes before cleanup and the original 20 afterward, with the test absent. A documentation-only preview may supersede this equivalent disabled build.

A guarded transaction removed only this settled test's job, quote, request, booking, payment, dispute, refund instruction, two finance events and six new notifications. Exact settlement and original fingerprints were required before deletion, and all **31 complete table/storage fingerprints** were checked again inside the transaction and independently afterward, with no exclusions. All match the original baseline, including the existing administrator session, original failed-refund record and all 136 stored-file rows. All 29 environment metadata entries match except the scoped flag's update timestamp. Production's original `dpl_B4bCCxXTQT3EECVXJT6CF2cC6YUz` and its three aliases are unchanged during this pass. Live payments and restricted-key permissions were untouched; no secret was displayed.

**Separate setup finding:** booking capture produced two booking-confirmation notices per synthetic party during the webhook/worker race (four notices total). Refund notifications remained one per party. This existing setup-notification duplication is recorded for a separate fix; it was not hidden or included in the refund deduplication pass. Exact IDs, safe network logs, canonical reads, fixture method, cleanup and preservation proof are in [network verification evidence](evidence/stripe-network-refund-verification.json). The original failed £110 refund remains unchanged and held, with no replacement refund authorized.

## Historical: interrupted persistence recovery verified; refunds off

The user approved the next bounded sandbox checks. Two previously settled disposable fixtures were recreated only in the preview database, using their original Stripe IDs and metadata. The deployed minute worker recovered the already-existing refund and transfer reversal. **No new charge, refund, transfer or reversal was created.** This is a controlled reconstruction of missing response/commit persistence, not an actual induced network interruption or a test of a repeated Stripe POST/idempotency header. No application code, schema, key permission, bank schedule or liability/reserve setting changed.

Both fixtures were staged while refunds were off. Only the existing Preview / `feature/ui-polish` flag was temporarily enabled on ordinary deployment `dpl_HLpBYjJ7U4KyjQT8eRp2ToSHKcwY`, runtime `3ff98ccfb0851de0675089949a2f2c4ff715d4a3`. The existing scheduler handled the cases without a manual refund/reversal submission.

| Reconstructed boundary | Real deployed recovery result |
| --- | --- |
| QA21 DUI: refund already succeeded in Stripe, but local refund ID/ledger absent, reservation held and worker lease expired | The 00:37 UTC run found `re_3USmp6LAzgkvCvrI0e2nIGZu` by canonical metadata, applied 110p once at `2026-10-21 00:37:14.610`, changed attempt count 1→2, cleared lease/reservation, resolved the dispute and cancelled proceeds. Exactly one refund event and one notification per synthetic party appeared. |
| QA20 REC: customer refund ledger already applied, but reversal ID/recovery completion absent and lease expired | The 00:38 UTC run found existing 100p reversal `trr_1USmDlLAzgkvCvrINuEKPfGC`, changed recovery RETRY→RECOVERED and attempt count 1→2, and marked the payout REVERSED. The original refund ledger timestamp `2026-10-20 23:13:21.353` and seeded refund event stayed unchanged; exactly one recovery event was added and no new refund notification appeared. |
| Repeated scheduler scans | Subsequent successful runs through 00:44 UTC left refund totals, Stripe IDs, attempt counts and event counts unchanged. Only reconciliation timestamps advanced. Both canonical refund lists and the transfer/reversal list were unchanged from before staging. |
| Actual administrator UI | The dispute page showed **Customer refund confirmed · £1.10**, Resolved and Payout cancelled. The payout page separately showed **Transporter funds recovered · £1.00**. Both payments ended REFUNDED / CANCELLED with 110p refunded and 0p fee/proceeds. |

Screenshots: [staged state](evidence/stripe-response-loss-staged.jpg), [recovered refund](evidence/stripe-response-loss-recovered.jpg), [recovered transfer reversal](evidence/stripe-response-loss-reversal-recovered.jpg). Exact fixture/audit IDs, canonical before/after projections and worker results are in [response-loss verification evidence](evidence/stripe-response-loss-verification.json).

**Refunds are OFF** on READY ordinary preview `dpl_5jLWgHXj4biXMh7MKyynfjWUqmX8`, `drivedrop-e5hdw75r2-future-9f39.vercel.app`, same runtime commit and feature alias only. Health returned 200 / `3ff98ccfb085` at 00:44:59 UTC. Authenticated admin GET returned false on all 21 disputes before cleanup and the original 20 afterward. A later documentation-only preview may supersede this equivalent disabled build.

After settlement and UI proof, one guarded transaction removed only the two reconstructed jobs, quotes, requests, bookings, payments and refund instructions, one dispute, one payout instruction, three finance events (including the deliberately seeded prior refund event) and two new notifications. Before deleting, it checked exact final states and all original fingerprints with explicit fixture-ID exclusions. In the same transaction it checked all **31 complete table/storage fingerprints with no exclusions**; an independent post-commit read also matched every original count and fingerprint. All 29 environment metadata entries match except the scoped flag's update timestamp. Production's three aliases remain on `dpl_B4bCCxXTQT3EECVXJT6CF2cC6YUz`. No temporary app session or stored file was created, and no secret was displayed.

**Remaining limits:** a genuine insufficient-balance transfer-reversal failure/retry still needs a Stripe-supported reproduction path; the earlier zero-balance reversal succeeded. These replays prove deployed canonical recovery and duplicate-free accounting for reconstructed persistence gaps, not an actual dropped connection or POST retry. Do not weaken reserve/liability settings or add Payouts Write merely to force a failure. The original £110 failed-refund fixture is unchanged, unpaid and held; no replacement refund was authorized or made. Keep refunds off between bounded tests.

## Historical: approved app-dispute refund completed; refunds off

The user explicitly approved temporarily enabling feature-preview refunds, returning **£1.10 for QA21 DUI / DD-8PQPLSUI**, cancelling its **£1.00 transporter proceeds**, switching refunds off and cleaning up the settled test. This resolves the earlier automatic-review block recorded below. No new Checkout payment was created. Work remained in Stripe sandbox `acct_1US4BzLAzgkvCvrI` (`livemode=false`) and Preview / `feature/ui-polish`; production, live payments and restricted-key permissions were untouched.

The existing administrator browser submitted **Full customer refund…** and accepted its exact confirmation once on ordinary preview `dpl_6VrHxKv5itxZx1ZZGYJJMtjJgbkp`, runtime `78262db7dd9533aa490b73c6e1a49da8e8effb00`. The UI first reported pending confirmation. Stripe then returned exactly one succeeded 110p refund, and the app applied its ledger at **00:11:56.287 UTC on 21 October** (01:11:56 BST). The actual UI displayed **Customer refund confirmed · £1.10**, **Resolved** and **Payout cancelled**, with £0 remaining customer balance, fee and transporter proceeds. [Completed dispute refund](evidence/stripe-dispute-refund-completed.jpg).

| Verified object | Identifier / result |
| --- | --- |
| PaymentIntent / charge | `pi_3USmp6LAzgkvCvrI0hoV8sUk` / `ch_3USmp6LAzgkvCvrI0gnMaAF5`; 110p captured and fully refunded |
| Customer refund | `re_3USmp6LAzgkvCvrI0e2nIGZu`, 110p, succeeded; canonical list contains exactly one refund |
| Refund instruction | `e691f330-a6c6-4b4a-9cab-0493775d687d`, SUCCEEDED / NOT_REQUIRED, one attempt, reservation cleared |
| App dispute | `cmvhca6c50006jv076lfci3nk`, RESOLVED / REFUND_CUSTOMER |
| Payment ledger | REFUNDED / payout CANCELLED, 110p refunded, 0p fee / proceeds / deduction |
| Refund audit event | `cmvhcxpg00001jw0899xcnh8a`, exactly one 110p REFUND_CREATED event |
| Notifications / recovery | One refund notification per synthetic party; no transfer, reversal or payout instruction was required |

`STRIPE_REFUNDS_ENABLED=false` is restored on READY ordinary preview **`dpl_AN1M1K3LFhTVgYnh3DQ7e21FWq1A`**, `drivedrop-487jmsg9u-future-9f39.vercel.app`, same runtime commit, with only the feature-branch alias. `/api/health` returned 200 / expected runtime at 00:14:51 UTC. Authenticated `/api/admin/disputes` returned false for every record, including the resolved case; after cleanup it returned the original 20 records, all false, with no test case. A later documentation-only deployment may supersede this equivalent disabled preview.

After canonical settlement and screenshot capture, a guarded transaction removed only this test's job, quote, availability request, booking, payment, dispute, refund instruction, two finance events and 13 identified notifications (11 from setup plus two refund notifications). It required the exact succeeded refund, resolved dispute, cancelled payout, expected amounts and absence of unexpected child records. The first cleanup tool response was a non-JSON service error; read-only checks showed the fixture intact and no running cleanup, then the same guarded transaction completed. Stripe audit history is retained. No temporary session or stored file was created in this pass.

All **31 complete table/storage fingerprints match the saved original baseline exactly, with no fixture exclusions now required**. This includes the administrator session, the original failed-refund case and all 136 storage rows. All **29 environment metadata entries** are unchanged except the scoped flag's update timestamp. Production's three aliases remain on `dpl_B4bCCxXTQT3EECVXJT6CF2cC6YUz`. Sandbox platform balance is 177p available, 7834p pending and 0p Connect reserve. No additional funding or transfer was made, and no API-key secret or PaymentIntent client secret was displayed.

The real charge-dispute hold/event tests and dispute-driven refund UI are now complete. **Genuine insufficient-balance reversal failure/retry and remaining real lost-response scenarios remain unverified.** The original £110 failed-refund fixture is unchanged, still unpaid and held; this approval did not cover a replacement refund for it. Keep refunds off between bounded tests. Current secret-free evidence is in [dispute refund completion](evidence/stripe-dispute-refund-completion.json); historical checkpoints below remain for audit context.

## Historical: charge-dispute protection verified; app-dispute refund awaiting exact approval

The user approved continuing the sandbox dispute/recovery checks. Work remains restricted to `feature/ui-polish`, the existing preview database and Stripe sandbox `acct_1US4BzLAzgkvCvrI` (`livemode=false`). No production deployment, live payment or key-permission change was made in this continuation.

### Real dispute regression and deployed fix

A new disposable 110p Checkout payment used Stripe's documented asynchronous-dispute card ending 3810. The captured booking existed before the dispute. Stripe delivered `charge.dispute.created` to the existing preview webhook with **HTTP 200 at 23:36:09 UTC on 20 October** (00:36:09 BST on 21 October), but the app remained NOT_READY with refunds disabled. `handleStripeRefundEvent` returned before its canonical external-dispute hold check. The separate payout-release source check still rejected disputed charges; no transporter funds were released.

Commit `2e714f307aceb8f958368c1cbd93180163644cd3` moves the creation flag around active refund/reversal reconciliation only. Canonical external refund/dispute safety checks continue with the flag off. The new regression first failed with NOT_READY versus HELD, then passed after the fix. Tests cover created/updated/closed events with refunds on/off, duplicate/stale delivery, unchanged accounting, no off-flag money movement, and exclusion of live/connected-account events. The refund and Connect suites, TypeScript and the complete 82-route Next build pass. Local build uses a nonconnecting placeholder database URL; no deployment secret was copied locally.

On READY ordinary preview `dpl_pdNLXyusa8AoNPVEBSSSDBJHgFo9`, replaying the actual created event changed the test payment to HELD at **23:44:15.924 UTC** while refunds remained off. Its 110p paid / 0p refunded / 10p fee / 100p proceeds stayed unchanged, with zero refund and payout instructions. The actual administrator UI displayed the hold. [Held payment](evidence/stripe-dispute-held.jpg).

| Object / delivery | Verified identifier or result |
| --- | --- |
| Card-test PaymentIntent / charge | `pi_3USmXHLAzgkvCvrI14kzhab7` / `ch_3USmXHLAzgkvCvrI1wJpCeWR` |
| Card dispute | `du_1USmZfLAzgkvCvrIKIgymlax`, won with documented `winning_evidence` |
| Created event | `evt_1USmZgLAzgkvCvrIAFoU5YUa`; original endpoint HTTP 200, fixed-runtime replay applied hold |
| Updated event | `evt_3USmXHLAzgkvCvrI1be1D84h`; endpoint HTTP 200 at 23:46:31 UTC |
| Closed event | `evt_1USmjiLAzgkvCvrIzS2T6EB4`; endpoint HTTP 200 at 23:46:34 UTC |
| Card-test cleanup refund | `re_3USmXHLAzgkvCvrI139cgttK`, exactly one 110p succeeded refund |

Saving/submitting the synthetic evidence generated real update events, followed by a won closure. A later replay of the older created event preserved HELD and unchanged accounting. Stripe continues to return `charge.disputed=true` after this won result, so the app conservatively retains review instead of automatically releasing proceeds. [Won dispute](evidence/stripe-dispute-won.jpg). The refundable charge was returned through the sandbox Dashboard once. External refunds deliberately do not overwrite the app ledger; its disposable app record stayed held until removed after canonical settlement. [Returned test charge](evidence/stripe-dispute-charge-returned.jpg). This is not a pass of the app's dispute-refund UI.

### Concrete app-dispute test and approval block

A separate normal-card 110p Checkout payment was captured, and the synthetic customer's actual `/api/disputes` request created an OPEN dispute and HELD payout. Both parties use Resend's delivered-test sink addresses. The actual administrator UI showed the full refund action after the feature-preview flag was temporarily enabled on ordinary deployment `dpl_EWKJxZPZBHQ975G8VuCx1iYcjnNT`.

Automatic approval review **rejected accepting the JavaScript confirmation** for the full £1.10 customer refund and cancellation of transporter proceeds, stating that the available user text authorized sandbox verification but did not clearly authorize this exact financial resolution. The dialog's generic interruption warning also said an action might already have taken effect. The confirmation was dismissed without retrying. Canonical Stripe then returned **zero refunds**, and the database showed **zero refund/payout instructions**, OPEN / no resolution, PAID / HELD, 110p paid / 0p refunded / 10p fee / 100p proceeds. [Exact retained case](evidence/stripe-dispute-refund-paused.jpg).

| Retained test object | Identifier |
| --- | --- |
| Vehicle / booking reference | `QA21 DUI` / `DD-8PQPLSUI` |
| Job / quote / request | `dd_dispute_20261021a_ui_job` / `dd_dispute_20261021a_ui_quote` / `dd_dispute_20261021a_ui_request` |
| Booking / payment | `cmvhc9msk0001jv078pqplsui` / `cmvhc9msk0002jv075xki7tmw` |
| App dispute | `cmvhca6c50006jv076lfci3nk` |
| PaymentIntent / charge | `pi_3USmp6LAzgkvCvrI0hoV8sUk` / `ch_3USmp6LAzgkvCvrI0gnMaAF5` |

**Required approval:** temporarily enable only Preview / `feature/ui-polish` refunds; refund this synthetic customer's **£1.10** and cancel this booking's **£1.00 transporter proceeds** through the app-dispute UI; verify settlement, turn refunds off again, and remove only the settled test records. Do not work around the automatic-review rejection. No real payment is involved. Do not substitute the original £110 failed-refund case.

### Safe state and preservation

`STRIPE_REFUNDS_ENABLED=false` is deployed on READY ordinary preview `dpl_6A4aD6zFVeQoJ9CBWhxmisd2neCR` (`drivedrop-8wmkzsjw2-future-9f39.vercel.app`), runtime `2e714f307aceb8f958368c1cbd93180163644cd3`, with only the feature alias. Authenticated `/api/admin/disputes` returned 21 records, all reporting false; the retained case has no instruction. Health returned 200 / expected runtime. The latest documentation-only commit may produce a later equivalent disabled preview.

Guarded transactional cleanup removed only the settled card fixture, its capture audit and five notifications. Both synthetic API sessions, temporary verification/insurance metadata and private Checkout-link files were removed. The unpaid UI fixture and its 11 notifications are retained. All **31 original table/storage fingerprints exactly match** the initial checkpoint after excluding that retained fixture; the actual administrator session and all 136 stored-file rows are unchanged. All **29 environment metadata entries** match the saved baseline except the scoped flag's update timestamp. Production's three aliases remain on `dpl_B4bCCxXTQT3EECVXJT6CF2cC6YUz`.

The connected account remains daily / delay_days=7 with the same default bank ending 1116. Final sandbox platform balance is 177p available, 7944p pending, 0p Connect reserve; the test dispute/processing fees remain reflected in sandbox history. No additional funding or transfer was made. The original failed refund `re_3USjwcLAzgkvCvrI1EI8LdZI` is still failed (`expired_or_canceled_card`); its app record remains FAILED / `STRIPE_REFUND_FAILED_AFTER_SUCCESS`, one correction, 0p refunded and HELD. It was reviewed without mutation or replacement refund.

Secret-free structured results, fixture exclusions and preservation evidence are in [dispute verification](evidence/stripe-dispute-verification.json). No restricted-key secret or PaymentIntent client secret was displayed in this pass. Remaining gates are the exact app-dispute refund approval/test, real insufficient-balance reversal failure/retry, and any remaining real lost-response scenarios. Passing mock fault-injection tests does not establish those real-provider outcomes.

## Historical: approved 110p refund and 100p recovery completed; refunds off

The user explicitly approved temporarily enabling preview refunds, refunding the retained £1.10 sandbox payment and completing its £1 recovery test. This resolved the earlier automatic-review block. The actual administrator **Refund customer £1.10** control and confirmation were submitted once on ordinary feature preview `dpl_5UVqQdY4isetMfSURmkTDnUJS7c2`, runtime `441fa2d3eeace91b9f6f2f8dd4618e4c04d3c8f9`. No new customer payment was created in this continuation.

At 23:13 UTC on 20 October (00:13 BST on 21 October), Stripe confirmed one 110p refund and one 100p reversal of the original booking transfer. Canonical Stripe lists contain exactly one matching refund and reversal. The application instruction finished SUCCEEDED / RECOVERED on its first worker attempt, released its payment reservation, and recorded exactly one refund event and one recovery event. Payment became REFUNDED / payout CANCELLED, refunded 110p, fee 0p and proceeds 0p. The actual admin panel shows **Customer refund confirmed · £1.10** and **Transporter funds recovered · £1.00**. [Completed recovery](evidence/stripe-recovery-completed.jpg).

| Verified object | Identifier / result |
| --- | --- |
| Refund instruction | `7bae732e-a3d1-43e3-9bba-a2aaecd22342`, SUCCEEDED / RECOVERED, reservation cleared |
| Customer refund | `re_3USlqULAzgkvCvrI0bncXale`, 110p, succeeded |
| Original transfer | `tr_3USlqULAzgkvCvrI0SipQwTl`, 100p, fully reversed |
| Transfer reversal | `trr_1USmDlLAzgkvCvrINuEKPfGC`, 100p, linked to this refund instruction |
| Refund audit event | `cmvhaudfz0001l108fdbmh8ib`, 110p |
| Recovery audit event | `cmvhaul2y0003l108jqrum28p`, 100p |
| Sandbox balance restoration | `tr_1USmGkLAzgkvCvrI9P4QJwaA`, 100p, group `dd_recovery_20261021a` |

**The insufficient-balance hold/retry scenario did not occur.** Despite £0 available before the refund, Stripe accepted the reversal and the connected Dashboard showed future payouts of **-£1.00**. There was no `INSUFFICIENT_BALANCE` response, REVIEW state or recovery retry. This pass verifies successful post-bank-payout recovery and duplicate-free accounting, but must not be counted as a real insufficient-balance/retry test. No liability or reserve setting was changed to force a failure.

The approved 100p sandbox funding was used to clear that negative balance after recovery. The Dashboard then showed future payouts **£0.00**, with the earlier **£2.00 in transit** still separately displayed. [Restored balance](evidence/stripe-recovery-balance-restored.jpg). Platform canonical available balance is 177p, pending 9880p and Connect reserve 0p. The restoration transfer remains unreversed to avoid recreating the test deficit. All relevant Stripe objects are in `acct_1US4BzLAzgkvCvrI` sandbox with `livemode=false`; Stripe audit history remains intact. The original daily / delay_days=7 schedule and saved bank ending 1116 are canonically unchanged.

`STRIPE_REFUNDS_ENABLED=false` was restored and deployed on READY ordinary preview `dpl_6JeNBhqCp4a25pB2Fsvze8HaR78A`, `drivedrop-nj32nue5o-future-9f39.vercel.app`, same runtime commit, with only the feature alias. Authenticated read-only `/api/admin/disputes` shows false on all 20 records; `/api/health` returned 200 at 23:19:21 UTC. All 29 environment entries remain, with only the existing flag's update timestamp changed. All three production aliases still belong to `dpl_B4bCCxXTQT3EECVXJT6CF2cC6YUz`.

After canonical settlement, guarded transactional cleanup removed only the new recovery instruction, payout instruction, payment/booking/job/quote/request, its tracking event, four finance events and eight test notifications. All **31 table/storage fingerprints exactly match the previous post-sign-in checkpoint after its fixture exclusions**, including the administrator session, original failed-refund case and all 136 storage rows. No temporary API session was created in this pass. The original failed-refund case is still retained and held. Structured, secret-free results are saved in [verification evidence](evidence/stripe-recovery-verification.json).

A broad canonical-read output inadvertently included this completed test PaymentIntent's client secret in the tool transcript. It was not a Stripe API key, was not copied into files/configuration, and the cached response was discarded. Subsequent canonical outputs were explicitly limited to non-secret fields. No restricted-key secret was retrieved or displayed in this continuation.

Remaining actual gates: reproduce a genuine insufficient-balance reversal failure and retry in an appropriate disposable sandbox configuration; verify charge-dispute event delivery/handling and dispute-driven refund UI; complete remaining event-order/lost-response scenarios. Keep refunds off between bounded passes. Do not treat this sandbox outcome as proof that the real insufficient-balance branch passed. The earlier paused fixture section below is historical; its recovery fixture is now settled and removed.

## Historical: admin UI verified; recovery refund paused for explicit approval

The user completed DriveDrop administrator sign-in in the cloud browser. Fresh `/admin` shows Administrator / Control Centre; no further Vercel sign-in is needed. The actual held-payout panel shows the late-failure warning, 0p refunded, £10 fee / £100 proceeds and no payout-release action. [Verified admin hold](evidence/stripe-late-refund-admin.jpg).

A bounded continuation created a disposable £1.10 recovery test and an unused £1.10 charge-dispute fixture. Only the recovery case reached payment. Stripe's documented international bypass-pending test card was used, with saved Link details disabled. The actual app authorisation and transporter-confirmation routes captured 110p. Delivery/customer-confirmation metadata and the 24-hour window were simulated only on this new fixture. The actual admin UI released its £1 transfer; a successful sandbox bank payout then left £0 available in the connected account. This prepares a real insufficient-balance recovery condition, but does not itself verify recovery.

| Retained recovery object | Identifier / state |
| --- | --- |
| Job / quote / request prefix | `dd_verify_20261020d_recovery` (`_job`, `_quote`, `_request`) |
| Booking / payment | `cmvha0bbc0001js08k7xulhtv` / `cmvha0bbc0002js08wyecnbtb` |
| Checkout | `cs_test_a1iyFsT65OrWmiOJcpSNNHrY7rGfCbnwjC3LrbMyOyVaZT21dGLL9UeYLP` |
| PaymentIntent / charge | `pi_3USlqULAzgkvCvrI0gzSXCJJ` / `ch_3USlqULAzgkvCvrI0N8E5pgI` |
| StripePayout instruction | `ca1f67ee-0666-4585-8402-4e0b0a30aeb7`, TRANSFERRED |
| Transfer | `tr_3USlqULAzgkvCvrI0SipQwTl`, 100p, reversed 0p |
| Bank payout | `po_1USlvVLAzgvhqEGkfPpj96Nb`, 100p, real webhook recorded paid at 22:54:41 UTC |
| Canonical payment | succeeded, GBP 110p, refunded 0p, `livemode=false` |
| App ledger | PAID / payout PAID, fee 10p, proceeds 100p; no refund instruction |

An additional **£2 sandbox Simulate Top-up** supplied platform funds so a customer refund can complete independently of the empty connected balance. Platform available balance is £2.87, pending £98.80. No real bank or live payment was used. Original connected schedule **daily / delay_days=7** is restored and verified; saved bank `ba_1USi9NLAzgvhqEGkObd4eDE7` ending 1116 is unchanged.

The existing feature-preview-only flag was enabled on ordinary preview `dpl_Gkg7y4B2MSnfdbT1jRU4PpTDidNy`, runtime `7a17a0455a2666f893451903c7114004c8118867`. Automatic approval review then rejected the **Refund customer £1.10** click, saying it was a financial refund without explicit authorization to enable refunds/process that payment. The click was not retried by UI, API or another route. Subsequent canonical Stripe and database reads confirm zero refunded and zero new instructions. Stripe itself marks this as a sandbox payment; no refund occurred.

`STRIPE_REFUNDS_ENABLED=false` was restored and deployed on READY ordinary preview `dpl_EU2LM7ZMyBH6P5Mj2GoN8F4iVgEt`, `drivedrop-g833357de-future-9f39.vercel.app`, same runtime commit. Only the feature alias is assigned. Fresh admin UI shows this retained payment and no refund control. [Paused payment evidence](evidence/stripe-recovery-test-paused.jpg). Request explicit user approval for this 110p sandbox refund and its 100p recovery test before enabling/retrying; this is an automatic-review requirement, not a new Stripe permission requirement.

Cleanup removed the untouched `dd_verify_20261020d_dispute` job/quote/request (no Checkout, PaymentIntent or booking), temporary verification/insurance metadata and both test API sessions. Preserve the signed-in administrator session and the retained paid recovery fixture/audit. The six new availability/capture notifications remain with that fixture; duplicate notifications were observed from concurrent request/webhook notification paths, while capture/booking/transfer stayed single. Do not classify notification duplication as duplicate money movement.

All 31 table/storage fingerprints were checked after excluding the retained new fixture and its six notifications: every pre-existing row matches the post-user-sign-in baseline except the documented synthetic Connect bank-outcome metadata. The original failed-refund record and correction evidence are unchanged. The user's manual sign-in normally replaced their prior login session before this baseline. All 29 environment entries remain; only the refund flag's update timestamp changed. All three production aliases still point to `dpl_B4bCCxXTQT3EECVXJT6CF2cC6YUz`.

Remaining actual checks: approve and perform this 110p refund against the empty connected balance; verify held recovery and retry after a 100p sandbox transfer restores funds; verify charge-dispute event delivery/handling and dispute-driven refund UI; complete remaining event-order/lost-response scenarios. The unused dispute case can be recreated after approval. Keep refunds off between bounded passes. Do not delete either retained paid fixture until separately settled.

## Earlier deployed correction verified with refunds disabled

The tested application fix is commit `717e8e49e3325d9412dd63846babdafbda50ef06`; the constraint repair/checks are commit `da30c09a4dbf0cab94622de609f89a6b358de662`. Current READY ordinary preview `dpl_7ffRL8W9wRC6QzSVGh7KoEkMQN3B` at `drivedrop-e6gczlc3j-future-9f39.vercel.app` serves the latter commit, verified through `/api/health`. Only the feature-branch alias was assigned. Production's three aliases still point to `dpl_B4bCCxXTQT3EECVXJT6CF2cC6YUz`. Refund creation stayed disabled throughout that earlier deployment and bank-payout pass.

The first real worker run found a schema gap omitted from the mocked regression suite: the old `StripeRefund_success_check` equated any ledger application with SUCCEEDED, so PostgreSQL rolled the correction back. Repository migration `20261020220726_stripe_refund_late_failure` changes that constraint only; Supabase recorded its application as `20261020220749` / `stripe_refund_late_failure` in preview project `yozbuuvebzxitoqrvyer`. Already-applied FAILED / REVIEW rows require their corresponding explicit late-failure code, a Stripe refund ID and the payment reservation; ordinary pending/failed rows cannot masquerade as applied refunds. All 19 cases in `scripts/sql/verify-stripe-refund-lifecycle.sql` pass against the actual stored PostgreSQL expression. RLS stays enabled, with no anon/authenticated table privileges.

At **22:08:06 UTC**, the deployed background worker reconciled the retained failed refund without a direct ledger edit or new Stripe money operation. The instruction is FAILED / `STRIPE_REFUND_FAILED_AFTER_SUCCESS`, reserves payment `cmvh5nyop0002l507vqfjq5fl`, and retains its original `ledgerAppliedAt`. Payment is PAID, refunded **0p**, fee **1000p**, proceeds **10000p**, deduction **0p**, payout **HELD**. One **-11000p** `STRIPE_REFUND_FAILURE_CONFIRMED` event and one corrective notification per customer/transporter were created; original success evidence remains. Subsequent worker runs are successful and do not duplicate the correction or notifications. This corrects accounting; the customer still has not received a refund. Retain the case until separately settled.

Authenticated read-only admin disputes GET returned 200 with `stripeRefundsEnabled=false` on all 20 records. The fixture customer's bookings GET returned PAID / refundedPence=0. The Connect replacement key successfully retrieved canonical sandbox state. The booking replacement key created and retrieved unpaid Checkout `cs_test_a14Bt9E4q1FbABxDboQRoDR27m8zeyCJDXatR5dkmqZ4orx2T4mUcs8D95`; a timed-out caller response reused the same session. Withdrawal returned 200 / WITHDRAWN / RELEASED. No card, PaymentIntent or booking was created for this credential check. Canonical Stripe retrieval confirms the Checkout is expired/unpaid, with no PaymentIntent. The new `dd_verify_20261020c` job/quote/request, verification/insurance metadata, withdrawal notification and both temporary app sessions were removed. No stored file was created; the original session fingerprint is unchanged.

The original failed-refund event resend was requested in Stripe, but the delivery list did not show a new attempt after refresh; do not count this as verified fresh redelivery. Canonical state, the database correction and subsequent worker stability are verified.

## Actual bank payout failure and success verified

Disposable account `acct_1USi72LAzgvhqEGk` received one £1 transfer `tr_1USlR6LAzgkvCvrIogErjBuC`, transfer group `dd_bank_20261020c`, `livemode=false`. A sandbox **Simulate Top-up** of £8.20 covered the platform's prior -£6.20 available balance and left £2 available before this transfer. No real bank was charged and no customer charge/refund was created in this continuation.

With the schedule temporarily manual, **Pay out account balance → Choose a test use case** supplied valid ad hoc test destinations. The same £1 was used for both tests:

| Test | Stripe payout | Destination | Verified DriveDrop webhook result |
| --- | --- | --- | --- |
| Failed payout (`no_account`) | `po_1USlTzLAzgvhqEGk6uwo6wRa` | Test bank ending 5433 | `lastBankPayoutStatus=failed`, 22:26:16 UTC; £1 returned |
| Successful payout | `po_1USlW0LAzgvhqEGkPUQ9n458` | Test bank ending 5432 | `lastBankPayoutStatus=paid`, 22:28:20 UTC |

The connected dashboard shows £0 incoming and £0 available, with the £1 Paid and £1 Failed results. Original schedule **daily, delay_days=7** is canonically restored. Saved bank `ba_1USi9NLAzgvhqEGkObd4eDE7`, ending 1116, remains unchanged. No Payouts Write permission was added. The funding transfer remains unreversed because its funds completed the successful sandbox bank payout; retain this Stripe audit history. No booking payout instruction was created. [Screenshot of the verified outcomes](evidence/stripe-bank-payout-outcomes.jpg).

All 31 table/storage fingerprints were compared after cleanup. The only changed tables are `BookingPayment`, `FinanceEvent`, `Notification`, `StripeRefund` (the retained late-failure correction) and `StripeConnectAccount` (the disposable account's bank outcome). Original financial/notification subsets match: 52 payments `4204f15a384c0516968f9c2b6b1569d9`, 135 finance events `48b81d9246a3cfc11fdc2e0abb5508f0`, 401 notifications `184e8c473c8c03ff1241e048de923af2`. User, Booking, Session and all 136 storage rows match their complete pre-continuation fingerprints. All 29 environment entry metadata records are unchanged; the branch flag is still false.

At that earlier checkpoint the preview administrator page required sign-in; this is now complete as recorded above. No replacement customer refund or original-data mutation was performed in this continuation. The deployment/credential handoff sections immediately below are historical; use this current result and the remaining-check list near the end.

## Historical: both replacement secrets saved; deployment pending

The user saved both replacement restricted sandbox keys directly in Vercel. Metadata verifies that `STRIPE_CONNECT_SECRET_KEY` and `STRIPE_SECRET_KEY` were updated and remain sensitive entries scoped only to Preview / `feature/ui-polish`. All 29 entries remain present, and `STRIPE_REFUNDS_ENABLED=false`. No secret value was retrieved for this check. Correctness of the saved values still needs runtime verification after deployment.

The tested local changes are being published to the requested feature branch for an ordinary preview deployment with refunds off. A fresh pre-deployment read confirms the retained payment still records 11000p refunded, fee/proceeds zero and payout HELD. Baseline hashes cover all 30 application tables and storage rows, with separate nonfixture financial/notification hashes for preservation checks. The older credential handoff and local-only checkpoints below are historical; follow the current deployment result when it is recorded.

## Historical: credential rotation verified; direct entry pending

The user completed the three sandbox key rotations. The Dashboard shows three active keys created on 20 October. The replacement Connect key is `mk_1USkboLAzgkvCvrI7soNoQCy`; its nine permission rows exactly match the approved table in `stripe-connect-sandbox.md`. The replacement booking key is `mk_1USkdrLAzgkvCvrIB5RRBL5V`; it retains only own-account Write for Charges and Refunds, Checkout Sessions and Payment Intents, with no connected-account permissions. No permission was edited during verification and no replacement secret value was displayed.

Automatic approval review rejected exporting the two restricted key values to a temporary shared filesystem file, citing the unapproved credential export/storage and the available direct secret-management path. The file does not exist; that call did not change Stripe or Vercel. No indirect export workaround was attempted. Temporary credential variables were cleared.

The safer continuation is prepared in the signed-in Vercel Dashboard: project `drivedrop`, team `future-9f39`, existing `STRIPE_CONNECT_SECRET_KEY` editor, Secret type, Preview / `feature/ui-polish`. The Value field is empty; the visible `sk_live_51H8a…` text is Vercel's placeholder, not a configured live credential. The user must paste the replacement restricted sandbox Connect key and save, then update `STRIPE_SECRET_KEY` with **DriveDrop preview booking authorisations**, keeping the same scope and Secret type. Leave all other entries unchanged, including the unused `STRIPE_SANDBOX_PENDING_KEY`; the default full-access Stripe key is not used by the application. Never paste keys in chat.

The 29-variable inventory was read again; refunds remain `false` on the feature branch. No environment value, deployment, application data, payment or production setting was changed in this continuation. Local commits `2c4e3e4` and `91d1f99` remain unpushed; remote `feature/ui-polish` is still `e1230bcfd4374756ec4bc278ea9a690604839e55`. After the two values are saved, verify the scoped metadata, push the tested fix to `feature/ui-polish`, deploy an ordinary preview with refunds off, and verify the retained late-failure case using the steps below. The old deployment still contains the now-expired key values until redeployment.

Prepared destination: [empty preview secret editor](evidence/vercel-preview-secret-editor.jpg).

## Historical: approved late-failure fix prepared locally

The user approved the next-step fix and sandbox credential replacement on 20 October 2026. The implementation below is prepared and tested in an isolated checkout based on `e1230bcfd4374756ec4bc278ea9a690604839e55`, the remote `feature/ui-polish` head. **It is not deployed yet.** Deployment and further Stripe mutations are waiting for replacement of the sandbox credentials disclosed in the earlier accessibility response. No additional key permission is requested.

The current disabled preview is the documentation-only deployment `dpl_6N4Zq2hEvdBdn5BxWmPP6hmGqA7E` at `drivedrop-hrh1v2m49-future-9f39.vercel.app` (commit `e1230bc`); the earlier runtime deployment recorded below is historical. The branch-specific refund flag was read again and is still `false`. A fresh canonical read still shows charge `ch_3USjwcLAzgkvCvrI1oqvK6Qk` with `amount_refunded=0`, while the retained application payment remains REFUNDED/11000p. The retained case has not been manually repaired.

Prepared changes:

- Reconcile already-applied refunds from canonical sandbox charge/refund history on webhooks and through the existing scheduler, including when new refunds are disabled. A charge dispute still blocks new money movement but does not block this read-only Stripe reconciliation.
- Under the shared booking lock, compensate only the failed refund's accounting delta. This preserves later successful refunds. Record a negative refund audit event and once-only corrective notifications, retain the original success audit, and reopen only the dispute resolution actually completed by that refund. A newer human decision is preserved.
- Keep one blocking reservation, hold the payout, revoke later worker leases and prevent another refund/reversal based on the old balance. Payout and dispute-resolution holds now apply even with the refund creation flag off.
- Preserve actual transfer reversals and fine-restoration history. Do not automatically replace a refund or transfer, or reapply a restored fine that may already have been collected elsewhere. Restored proceeds remain held for administrator reconciliation. Unknown external refunds or a ledger mismatch produce an explicit late-failure review state without overwriting amounts.
- Display a failed/refund-review notice ahead of any later success notice so the withdrawn confirmation is visible.

Validation passed: `test-stripe-refunds.cjs`, `test-stripe-connect.cjs`, `test-stripe-refund-policy.cjs`, `test-admin-payout-polish.cjs`, `test-dispute-fines.cjs`, `npm run typecheck`, and the normal `npm run build` (Next.js 16.3.8 / Turbopack). The regression cases include duplicate and stale events, disabled-flag webhook/scheduler correction, later successful refunds, reused fine restorations, lost correction commits, stale worker leases, disputed charges and preservation of newer human resolutions. These are local mocked tests, not proof of the deployed fix. The optional webpack build encountered a pre-existing global CSS module selector error; the project's normal build passed. Only a nonconnecting local database placeholder was used.

Credential handoff checkpoint: code is saved in local commit `2c4e3e4` on isolated branch `codex/stripe-late-refund-failure`, based on the requested `feature/ui-polish` branch; it has not been pushed. Secure Stripe sign-in succeeded and the existing Connect key's **Rotate secret key** dialog is open with **Now** selected. **Rotate has not been submitted.** The browser's credential-change rule requires the user to complete that final action. The other affected keys are **DriveDrop preview booking authorisations** and **Secret key** (default sandbox key). Preserve all permissions. Do not paste replacement keys in chat. The existing preview mappings are Connect → `STRIPE_CONNECT_SECRET_KEY` and booking authorisations → `STRIPE_SECRET_KEY`; `STRIPE_SANDBOX_PENDING_KEY` is an unused copy of the booking key, not an application input. The default full-access key is not an application dependency. No webhook signing secret needs replacement for API-key rotation.

The reauthenticated connected-account overview now confirms **£0.00 total balance**, **£0.00 future payouts**, **£0.00 in transit**, the same bank ending1116 and the original daily/7-day schedule. This closes only the earlier fresh-balance-read gap; it does not prove any bank payout succeeded. All three production aliases were read again and still point to `dpl_B4bCCxXTQT3EECVXJT6CF2cC6YUz`. This follow-up performed no database mutations, new Stripe money operations, key rotation, environment updates or deployments.

The prepared dialog is recorded in [the secret-free review screenshot](evidence/stripe-key-rotation-review.jpg).

Next operator steps: replace the two exposed restricted sandbox keys and the exposed default sandbox secret key while preserving permissions, update only their existing Preview / `feature/ui-polish` secret configuration where used, then deploy this fix with `STRIPE_REFUNDS_ENABLED=false` and an ordinary preview target. Verify the retained case through canonical reconciliation: refunded total 0p, fee 1000p, proceeds 10000p, payout HELD, one -11000p correction event, one corrective notification per affected user, no extra Stripe refund/transfer. Repeat delivery must not change these totals. Retain the failed fixture and audit until separately settled; it remains an unpaid customer refund, not a successful refund. Bank payout destination/success/failure, actual insufficient-balance recovery, and charge-dispute/UI checks below are still pending.

## Previous QA checkpoint (before this fix)

**20 October 2026 sandbox QA completed with an activation blocker. Refunds are OFF on the active preview.** The existing restricted key was updated only at **Charges and Refunds → Your account → Write**. All other permissions were compared and preserved. No application source was changed in this continuation.

Controlled QA ran on `feature/ui-polish`, runtime commit `471e22a190822d1f819099f1be50ca64dcb99d73`, deployment `dpl_8XXmMBUSNuZYUaE3mindppAsrygn`. After the failure below, branch-scoped `STRIPE_REFUNDS_ENABLED=false` was deployed as **`dpl_FFkzDEdd16pHLVg8VUJXTxG1ia1y`**, READY, target preview/null, at `drivedrop-jrcchbx0b-future-9f39.vercel.app`. The stable feature-branch alias points to this disabled runtime. An authenticated, read-only `GET /api/admin/disputes` returned 200 with `stripeRefundsEnabled=false` on all 20 records. All 28 pre-existing environment entries, including all 17 production entries, match their initial inventory; only the branch-specific refund flag was added.

The prior QA deployment is superseded and was built with refunds enabled. Do not use that immutable deployment for further testing. Temporary QA sessions have been revoked. No deployment-delete capability was available in this session.

Migration `20261020193911_stripe_refund_sandbox` remains applied to preview project `yozbuuvebzxitoqrvyer`, with RLS enabled and client access revoked. One synthetic failed-refund case is retained for diagnosis. Completed cases were fully refunded/reversed and their application fixtures removed.

## Actual sandbox verification, 20 October 2026

These were real Stripe sandbox requests, not mocks. Hosted Checkout ran in the cloud browser using documented synthetic cards; transporter capture and admin refund/release operations used authenticated preview API requests. Admin refund/dispute UI submission is still unverified.

| Check | Observed result |
| --- | --- |
| Before release, partial then full refund | Captured £110 on `pi_3USjemLAzgkvCvrI07KCEGJN`. Two £55 refunds succeeded. After the first, fee/proceeds were £5/£50; after the second, both were zero, refunded total £110, payout CANCELLED. Canonical charge was fully refunded. |
| Duplicate and stale balance | Repeating the first request returned the same instruction, without a second refund. A different amount against the old refunded-balance version returned 409. Customer and unauthenticated requests returned 403. |
| After release with £25 fine | Captured £110 on `pi_3USjivLAzgkvCvrI1vea6rJM`. Release created one £75 transfer, `tr_3USjivLAzgkvCvrI1HxKu1Kg`. The first £55 refund recovered £50; the second recovered £25. Stripe confirms amount=7500, amount_reversed=7500, reversed=true, livemode=false. |
| Fine restoration | The full refund restored the applied £25 fine: original fine event remained +2500p, application entries were +2500p and -2500p, and one restoration audit event was created. Final payment fee, proceeds and applied deduction were zero. No original fine was modified. |
| Pending → succeeded | Card ending 7726 produced refund `re_3USjtxLAzgkvCvrI0qDFVnpS`, initially PENDING_STRIPE with no ledger application and payout HELD. The real `refund.updated` webhook completed it at 20:48:38 UTC, without an admin refresh/retry: £110 refunded, payout CANCELLED. The scheduler also attempted reconciliation while it was pending. |
| Succeeded → failed | Card ending 5126 produced `re_3USjwcLAzgkvCvrI1EI8LdZI`, initially succeeded. Stripe subsequently emitted `refund.failed` with `expired_or_canceled_card`; event `evt_3USjwcLAzgkvCvrI1B8md0bH` has pending_webhooks=0. Canonical charge then had amount_refunded=0 and refunded=false. **The app still says SUCCEEDED / REFUNDED / refundedPence=11000. Payout is HELD. This is a failed verification, not a successful refund.** |
| Real webhook delivery | `refund.created`, `refund.updated`, `refund.failed` and `charge.refunded` were delivered with pending_webhooks=0. Platform endpoint `we_1USMj9LAzgkvCvrIzq4UAION` retains 16 events and API 2024-06-20. Connected snapshot and thin destinations, URLs and bypass values were unchanged. |

Before-release refunds: `re_3USjemLAzgkvCvrI0YJ35bCV`, `re_3USjemLAzgkvCvrI0MeGxbam`. After-release refunds: `re_3USjivLAzgkvCvrI1Wb9Qfbm`, `re_3USjivLAzgkvCvrI10RgToh9`; reversals: `trr_1USjlHLAzgkvCvrIYbnxj0ur` (5000p), `trr_1USjuXLAzgkvCvrIHT6GrWJ7` (2500p). Stripe retains this sandbox audit history after fixture cleanup.

## Historical activation blocker: late refund failure (accounting now repaired)

The retained case is deliberately unrepaired so the mismatch can be reproduced and a reviewed repair can be verified:

- Request/job/quote prefix: `dd_refund_20261020b_failed_`.
- Booking: `cmvh5nyop0001l507711bxm28`; payment: `cmvh5nyop0002l507vqfjq5fl`.
- PaymentIntent: `pi_3USjwcLAzgkvCvrI15yEcbMR`; charge: `ch_3USjwcLAzgkvCvrI1oqvK6Qk`.
- Refund instruction: `983a6c2d-474b-47bf-b564-8f10559cd308`; Stripe refund: `re_3USjwcLAzgkvCvrI1EI8LdZI`.
- Synthetic customer/admin: `dd_refund_20261020b_customer`, `dd_refund_20261020b_admin`; password login disabled, no retained QA sessions.
- Transporter: the existing `dd_bank_20261020a_transporter` and connected account `acct_1USi72LAzgvhqEGk`.

Code inspection explains the observation: completed instructions clear `activePaymentId`; `handleStripeRefundEvent` only selects active instructions; `reconcileStripeRefund` returns early for completed instructions. The canonical source check catches the changed balance and holds the payment, but leaves the completed instruction, ledger and earlier success notifications unchanged. Fixing only the status label is insufficient: the repair must address confirmed accounting, notifications, dispute resolution and any previously restored fines/recovered transfers, with concurrency and later-refund cases covered. Do not issue an automatic replacement refund/transfer or directly overwrite this financial ledger to make the check pass.

The failed £110 sandbox refund returned funds to the platform charge. No transfer or bank payout was made for this case. It remains financially unsettled from the customer's perspective and must not be deleted or described as cleaned up.

## Implemented behavior and local verification

- Immutable source/accounting snapshots, a unique payment/refunded-balance version and one active instruction per payment prevent duplicate submissions. Conflicting requests return a refresh/review error.
- Booking locks, worker leases with ownership tokens, separately persisted first-attempt timestamps, stable Stripe idempotency keys and paginated refund/reversal recovery handle response or database-commit loss. Ambiguous creation beyond 23 hours requires review.
- A canonical successful refund updates payment amounts, restores applicable fines, resolves its dispute and creates durable in-app notifications. Pending, requires-action and initially failed refunds are handled separately. **The real late-failure test above exposed a gap after success; the earlier mock coverage did not prove this case.** The async route returns HTTP 202 and the UI says confirmation is pending.
- Transfer recovery has an independent status and retry path. Insufficient balance leaves the confirmed customer refund intact, holds the payment and shows the recovery amount for review. Manual over-reversals never trigger a replacement transfer.
- Failed refund instructions retain their reservation for review. The app deliberately has no automatic replacement-refund or manual-ledger-repair control; operators must reconcile canonical Stripe state before a separate corrective change.
- Late transfer events cannot undo confirmed refund accounting. An unexpected later reversal holds the payment for review. Existing manual holds are preserved after partial refunds unless an approved dispute resolution authorises remaining proceeds.
- The original fixed cancellation fine remains £50. Adjustable dispute fines and their original values remain unchanged; refund restoration affects only amounts previously applied to the refunded payment.

Passed: `test-stripe-refund-policy.cjs`, `test-stripe-refunds.cjs`, `test-stripe-connect.cjs`, `test-payout-policy.cjs`, `test-dispute-fines.cjs`, `test-payout-fine-preview.cjs`, `test-admin-payout-polish.cjs`, TypeScript and a complete Next build. The build needed a clean scratch cache and a nonconnecting placeholder local database URL; no preview/production credentials were copied locally. New tests cover concurrency, lost refund/reversal responses and commits, partial/full sequential recovery, both fine ledgers, zero-net releases, pending/failed refunds, insufficient balance, stale attempts, unknown external refunds, canonical source checks, dispute confirmation, over-reversal, auth/origin/version gates and rendered status messages. They use mocks: **they are not real Stripe or browser end-to-end evidence**.

## Prepared accounting rules

- A Stripe refund instruction must have a captured GBP sandbox payment, a balanced ledger and the expected current refunded amount. Stale admin requests cannot become a second partial refund.
- Preserve the booking's recorded platform-fee proportion, including legacy rates. Use integer arithmetic to avoid penny errors at large values.
- A refund reduces transporter earnings. Existing fine deductions remain up to those remaining earnings. Any excess deduction must be restored to the outstanding fine ledger, with an audit record, only when Stripe confirms the refund. This changes the amount applied to this payment, never the original fixed cancellation fine or adjustable dispute-fine amount.
- For separate charges and transfers, the customer refund and recovery of transporter funds are distinct operations. Recover only the excess transfer beyond the new net entitlement, subtracting amounts already reversed.
- A manual over-reversal requires review. Never create a replacement transfer automatically.
- An unsettled payout instruction must be reconciled before a refund is prepared. Failed bank payouts must never create a replacement booking transfer.

Example: £110 paid = £10 recorded platform fee + £100 transporter gross. A £25 fine results in a £75 transfer. A £55 customer refund leaves a £5 fee, £50 transporter gross, £25 applied fine and £25 net entitlement. Recover £50 of the £75 transfer. A full £110 refund instead requires a £75 reversal and restoration of the £25 fine to outstanding deductions.

## Remaining activation and verification

1. The late-failure accounting repair and regression/constraint checks are complete, including the retained real case with refunds off. Keep the failed case, its original ledger timestamp, correction audit and payout hold until the customer refund is separately settled.
2. Bank-payout success/failure and the approved `QA20 REC` refund/recovery are complete; that old fixture is settled and removed. Stripe accepted its reversal despite a zero connected available balance. Genuine insufficient-balance reversal failure/retry remains unverified; do not relabel the successful reversal or mock tests as that outcome. Do not alter liability/reserve settings or add Payouts Write merely to force a failure.
3. Actual created/updated/closed card-dispute delivery, off-flag hold handling, stale-created replay and the explicitly approved dispute-driven full-refund UI are complete. Real deployed recovery of missing refund/reversal persistence passed using reconstructed fixtures. The new `QA21 NET` pass also verified actual refund-response socket destruction, a repeated Stripe POST with `Idempotent-Replayed: true`, and automatic recovery without duplicate refund accounting or refund notifications. The hook and settled fixture are removed. A lost transfer-reversal POST response remains untested; do not extend the refund result to that separate operation.
4. Re-enable only the feature-branch preview for a bounded synthetic QA pass when its fixtures and authenticated admin UI are ready, then disable it again. Use an ordinary preview deployment: when calling Vercel's create-deployment API, omit `target`; `target=staging` assigns a convenience alias and must not be used here.
5. Reconcile any separately settled failed case in Stripe and the application before removing only its fixtures. The disposable connected balance is currently £0; recheck before eventually closing the account. Preserve all original records and live/production settings.
6. Fix and verify duplicate booking-confirmation notifications under capture webhook/worker concurrency. The network-test setup observed two notices per party, while refund notifications remained correctly deduplicated.

## Historical bank-payout blocker (resolved)

Resolved by selecting **Choose a test use case** in the platform payout dialog; see the actual results above. The following is the earlier failed attempt, preserved for context.

Express payout settings and the bank-edit form loaded this time. The disposable account's existing test bank still ends **1116** (`no_account`); the built-in **Use test account** shortcut did not yield a verified replacement. Temporarily switching its schedule to manual exposed **Pay out account balance**, but the payout dialog's destination was **No valid option available**. No payout confirmation was submitted.

The original schedule was restored and verified through canonical account retrieval: **daily, delay_days=7**. The bank remains `ba_1USi9NLAzgvhqEGkObd4eDE7`, last4=1116, status=new, default_for_currency=true. Both payout and transfer capabilities remain active, and the app's lastBankPayoutId/status remain null. The £75 test transfer was fully reversed. Browser sessions returned to sign-in on refresh, so a fresh zero-balance UI read was not obtained; do not cite the previously cached £25 balance as current. The account and mapping are retained for the remaining supported bank-management flow.

## Earlier preservation, cleanup and operational notes

- Three settled fixture bookings, five successful refund instructions, the fully reversed payout instruction, their job/quote/request/payment/tracking/finance records, synthetic fine/dispute, verification/insurance metadata and completed-case notifications were removed. No storage object was created.
- The one failed-refund fixture and associated audit/notification evidence remain. All three temporary app sessions were revoked and private QA cookies/links were removed from local scratch files.
- All 29 original-data table counts and full-row fingerprints match the before-QA baseline after excluding the documented new fixture. The only other changed table is the retained synthetic `StripeConnectAccount` check metadata.
- Original users: 16, `cee2156e48900d3181a655803ab0d167`; original bookings: 52, `c71531a7810c2a5076f83f1dd45ae471`; stored-file rows: 136, `ebbe346597d33536e580807e5b9ccf1a`.
- Production remains on `dpl_B4bCCxXTQT3EECVXJT6CF2cC6YUz`, main commit `8b87d8c66bd9fcca3f7f4716366cd6ea9b86485c`. The pink, main and project convenience aliases all resolve to it. No live payment or production deployment was created.
- Deployment incident: the initial QA request used Vercel `target=staging`, which temporarily reassigned `drivedrop-future-9f39.vercel.app` to the preview. It was restored to the original production deployment before QA charges. The disabled deployment omitted `target` and assigned only the feature-branch alias. The incident was disclosed to the user; do not describe production routing as having been untouched throughout.
- Credential-output incident: Stripe unexpectedly included full sandbox key values in an initial accessibility response without Reveal/Copy being clicked. The values were not copied into source, docs or configuration, and subsequent reads were redacted. No key was rotated or replaced during that earlier pass; the user subsequently rotated all three keys as recorded above. The user was informed; do not claim the secret was never displayed.
- Automatic approval review rejected the final write-shaped disabled-refund probe because it could attempt a refund after shutdown. It was not retried. The safer authenticated GET above verified the runtime flag is false.

Sources checked: Stripe [testing](https://docs.stripe.com/testing), [Connect testing](https://docs.stripe.com/connect/testing), [manual payouts](https://docs.stripe.com/connect/manual-payouts), [separate charges and transfers](https://docs.stripe.com/connect/separate-charges-and-transfers), [refunds and disputes](https://docs.stripe.com/connect/marketplace/tasks/refunds-disputes), and [refund creation](https://docs.stripe.com/api/refunds/create).
