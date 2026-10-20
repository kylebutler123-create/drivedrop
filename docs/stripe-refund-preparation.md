# Stripe refund preparation — 20 October 2026

## Deployed correction verified with refunds disabled

The tested application fix is commit `717e8e49e3325d9412dd63846babdafbda50ef06`; the constraint repair/checks are commit `da30c09a4dbf0cab94622de609f89a6b358de662`. Current READY ordinary preview `dpl_7ffRL8W9wRC6QzSVGh7KoEkMQN3B` at `drivedrop-e6gczlc3j-future-9f39.vercel.app` serves the latter commit, verified through `/api/health`. Only the feature-branch alias was assigned. Production's three aliases still point to `dpl_B4bCCxXTQT3EECVXJT6CF2cC6YUz`. Refund creation stayed disabled throughout this continuation.

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

The preview administrator page requires sign-in before the remaining actual admin UI checks. No replacement customer refund or original-data mutation was performed in this continuation. The deployment/credential handoff sections immediately below are historical; use this current result and the remaining-check list near the end.

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
2. Bank-payout success/failure are complete. Actual insufficient-balance transfer recovery and recovery after funding still need verification. These account-level bank tests do not prove that customer-refund workflow. Do not add Payouts Write merely for QA.
3. Verify actual `charge.dispute.created`, `charge.dispute.updated` and `charge.dispute.closed` delivery/handling, dispute-driven refund UI, and remaining event-order/lost-response recovery scenarios. Delivered refund events do not establish these checks. The cloud preview currently requires an administrator sign-in for actual UI submissions.
4. Re-enable only the feature-branch preview for a bounded synthetic QA pass when its fixtures and authenticated admin UI are ready, then disable it again. Use an ordinary preview deployment: when calling Vercel's create-deployment API, omit `target`; `target=staging` assigns a convenience alias and must not be used here.
5. Reconcile any separately settled failed case in Stripe and the application before removing only its fixtures. The disposable connected balance is currently £0; recheck before eventually closing the account. Preserve all original records and live/production settings.

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
