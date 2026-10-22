# Bounded preview booking journey — QA22 E2E

Prepared 22 October 2026 from feature branch `0882893354071ec56afac5c095c8cb7b6a6b4aa4` and fresh read-only service checks. **Kye approved this exact sandbox scope on 22 October 2026. Account setup is awaiting secure manual signup; the financial run has not started.** No new customer, transporter, job, payment, upload or email was created by the preparation.

Approval/execution checkpoint: [QA22 run record](evidence/preview-payment-qa22-execution.json). On refreshed build `4d45e2e`, the browser's `browserAuth` guidance explicitly requires manual handoff for new account creation. The transporter form is prepared with its approved name/email and Transporter role; the password is blank and Create my account has not been submitted. The existing transporter was signed out normally, so session-row changes from that logout are expected. No existing credential or account profile was edited. At 22:05 UK time on 22 October the same-day job-creation window had closed. The next permitted job-creation start is **23 October 2026 at 08:05 UTC / 09:05 UK**, subject to the remaining same-day conditions below. This approval persists; do not ask again for the same financial/email scope after signup or the time window opens.

## Exact scope for approval

| Item | Proposed scope |
| --- | --- |
| Environment | Only `feature/ui-polish`, canonical preview alias, Supabase `yozbuuvebzxitoqrvyer`, Stripe sandbox `acct_1US4BzLAzgkvCvrI` with `livemode=false` |
| New participants | `DriveDrop QA22 E2E Customer` and `DriveDrop QA22 E2E Transporter`, created through normal registration; no existing participant is repurposed |
| Customer email | `delivered+drivedrop-qa22-e2e-customer@resend.dev` |
| Transporter email | `delivered+drivedrop-qa22-e2e-transporter@resend.dev` |
| Administrator | Existing authorized administrator, using normal secure sign-in; no new privileged account or injected session |
| Setup | One new sandbox Express account through the existing Connect flow; clearly marked synthetic DriveDrop verification uploads and administrator review; disable daily job emails only on the new transporter |
| Financial ceiling | One £10.00 transporter quote; one £11.00 customer authorization; one capture of that same £11.00; one £10.00 platform transfer after the natural 24-hour hold |
| Browser payment | Stripe's published successful 3DS test card `4000 0025 0000 3155`; no real card or bank data |
| Email scope | Five expected application lifecycle emails to the two test addresses above, plus only a necessary automatic withdrawal/expiry notice if this same test is aborted; no new email to the owner's mailbox or another existing user |
| Files | Generated, plainly labelled PNG placeholders for vehicle, collection, delivery, insurance and licence uploads; synthetic signatures in the evidence forms |
| Retention | Keep this run's financial records, provider objects, test files and audit evidence labelled synthetic. Do not delete or recycle them |

The quote endpoint requires at least 1,000p. The checked Vercel metadata contains no commission/deposit override; current source defaults produce 1,100p total, 100p commission and 1,000p proceeds. Recheck the displayed amounts before submitting Checkout. Customer and transporter screens must continue to hide commission breakdowns.

The transporter receives a Stripe balance transfer. This scope does not manually create a bank payout, alter payout schedules/liability, top up a balance, refund/reverse a payment, or run an insufficient-balance experiment. Provider-managed sandbox bank-payout behavior must be observed and reported separately if it occurs. Preview refunds remain off. Production, main, keys, schema and configuration are outside this scope.

## Account and email findings

The existing sandbox transporter has a cached READY Connect account but no DriveDrop verification. Existing approved/insured transporters have no Connect row. No existing test transporter therefore meets both requirements. Both proposed email addresses are unused. The owner's supplied mailbox belongs to the existing ADMIN account; it will not be reassigned to a customer.

The new transporter must upload the two explicit test placeholders through the normal verification UI, submit them, and have their **sandbox-only** status recorded in the administrator review note. These files are not identity documents or insurance and must never be used for a real transporter. Complete Connect using Stripe's supported test onboarding controls. Stop if the UI requires real credentials, identity or bank information. Account readiness must be refreshed canonically before accepting a quote/release; the existing account's cached status is not evidence for the new account.

The previous single email probe was delivered to the owner's Junk folder and its home-page button worked. It was sent through Resend's unpublished template Test email action, not the deployed application's send path. This run will test that missing app path. Resend's labelled `delivered@resend.dev` addresses simulate delivery; their events will not establish human inbox placement or resolve the Junk finding.

Expected happy-path app messages:

| Trigger | Recipient | Expected count | CTA |
| --- | --- | --- | --- |
| Fresh quote | New customer | 1 | `/customer` |
| Authorization becomes ready for transporter | New transporter | 1 | `/transporter?view=quotes` |
| Capture / booking confirmed | New customer | 1 | `/customer?view=bookings` |
| Capture / booking confirmed | New transporter | 1 | `/transporter?view=deliveries` |
| Delivery evidence submitted | New customer | 1 | `/customer` |

Registration, verification approval, collection evidence, customer confirmation and the Stripe release path do not themselves send an app email in the reviewed source. They do create the applicable in-app records/notices. Do not count these as delivered email. Inspect Resend records for the two test addresses, actual CTA origin/path and duplicate sends. The best-effort sender does not expose durable delivery acknowledgements in the booking transaction; an app success response is insufficient.

Preparation found and corrected a customer booking-confirmation link: at `0882893` its email CTA opened Quotes while the in-app notice opened Bookings. Both now open `/customer?view=bookings`, with email label **View booking**. The transporter delivery link and uncaptured confirmation-request link are retained. The existing concurrency/replay test now checks these destinations as well. This is a source/local-test result; the actual sent booking email still needs this hosted run.

## Prevent test-job digest mail

Four existing transporters currently meet the basic approved/current-insurance digest criteria. Their settings must remain unchanged. No `JobDigestRun` exists at this check, and the only database cron is the minute recovery poll. Vercel's repository cron entries run on production deployments, not previews, but this is not permission to assume every future/manual dispatcher is absent.

Use the current source's date filters to contain the new job:

1. Finish account setup first. Create the job **after 08:05 UTC**, on a day with at least three hours remaining before UK midnight.
2. Collection date must be that same UK calendar day, with its window at least 90 minutes ahead and ending before midnight. Use the existing original date; no proposed future collection date.
3. Before the next 08:00 UTC cutoff, this job is outside the completed digest creation window. At/after that cutoff, its collection date is in the past and the shared open-request filter excludes it, even if the browser run was interrupted. A booked/completed job is also excluded by status.
4. Do not call the digest endpoint. If the test stops before a booking exists, use the customer's normal **Cancel request** action on this job, preserving history. Reconcile any authorized payment before claiming cancellation complete. Do not cancel a captured booking or create a cancellation fine to clean up the test.

Record the actual UTC/UK dates and run the date-filter preflight before posting. If those conditions cannot be met, postpone job creation; do not switch to a future-day job, edit other recipients' preferences or improvise a bulk email pause.

## Execution and evidence

1. Refresh branch/deployment, sandbox identity, refunds-off state, fixture names and the two protected records. Register the two fresh accounts and complete the setup above. Keep credentials in the approved secure workflow, outside Git, chat and evidence captures. If ordinary secure sign-in is unavailable, stop for the necessary handoff; do not synthesize auth sessions.
2. Customer creates the labelled `QA22 E2E` job with the prepared vehicle image. Transporter submits exactly £10 using the normal quote form. Customer selects it, checks £11, completes Stripe's 3DS test challenge, and returns to the booking screen. Record a canonical GBP manual-capture PaymentIntent with `livemode=false`, correct ownership/environment metadata and `requires_capture` before transporter confirmation. No booking/payment-captured event should be fabricated to reach this state.
3. Transporter confirms through the UI. Capture must affect the same intent exactly once and produce one booking, one payment-captured ledger event and one confirmation notice per participant. A returned URL or HTTP 202 does not prove capture. Correlate Stripe, app state, webhook/recovery evidence and emails.
4. Upload one collection image plus a synthetic release signature, then one delivery image plus a synthetic recipient signature through the forms. Use names/notes stating `QA22 E2E TEST ONLY`; do not assert a real vehicle movement or real geolocation. Check intended-party downloads and unauthenticated/wrong-owner denials on these new files. Keep existing private-file evidence as historical evidence rather than repeating every settled negative test.
5. Customer confirms delivery once. Record the actual timestamp, deadline exactly 24 hours later, visible hold and no release instruction/transfer. Do not backdate timestamps, seed delivered status, or resolve a fabricated dispute to skip the hold.
6. After the natural deadline, refresh source, flags, provider/source amount, Connect capability status, disputes, deductions and identity. Administrator releases only this payment once. Confirm one durable payout instruction, one £10 transfer to this run's new account, one payout ledger event and final accounting. No automatic release is scheduled by this document.
7. Preserve the new records and evidence. Recheck refunds off, the original £110 held reservation, QA21 ALT's immutable audit/hash, and production aliases. State exact limits and any failure before advancing another boundary.

For pending-work recovery, record the real instruction and durable worker completion if the normal flow leaves pending work. The three recent scheduler runs were successful but checked zero instructions. They prove an idle worker, not recovery of a new pending financial operation. If webhooks/foreground handling complete this run before the scheduler, leave the new hosted pending-work exercise open. Do not insert fake pending state or use a new response-loss hook without a separately reviewed bounded test. Retain the already passed native and historical network-failure evidence with their stated limits.

Stop on the first unexpected recipient, incorrect amount/mode, inaccessible evidence, identity mismatch, duplicate accounting, or broken browser transition. Diagnose and fix on the feature branch before continuing. Ambiguous operations are reconciled under the existing durable instruction/idempotency key, never resubmitted as a new payment.

## Preparation evidence and remaining gates

See [preflight evidence](evidence/preview-payment-journey-preflight.json) and [fixture manifest](fixtures/preview-payment-qa22/fixtures.json). Generate upload placeholders with `node scripts/generate-preview-payment-fixtures.cjs --output <private-local-directory>`; this script performs only local file writes.

The £110 case remains PAID, 0p reimbursed, HELD with its original failed reservation. QA21 ALT retains one 110p alternative repayment, one corresponding `REFUND_CREATED` accounting event, cancelled payout and the original 44,415-byte evidence/hash. Its `BookingPayment.refundedPence=110` represents the combined reimbursement field; Stripe refunded 0p.

This run will not close the genuine Stripe insufficient-balance reversal/retry gate, production scheduler/alert/operator decisions, production-target journeys, actual inbox placement with final production links, or the fresh consistent backup/fallback/cutover review. The original £110 and immutable QA21 cases must never be reused.

References checked on 22 October: [Resend labelled test recipients](https://resend.com/docs/dashboard/emails/send-test-emails), [Stripe test cards](https://docs.stripe.com/testing?locale=en-GB), [Vercel cron deployment scope](https://vercel.com/docs/cron-jobs/quickstart). No Stripe SDK/API upgrade is part of this work.
