# Browser regression reference — 24 October 2026

The browser suites now pin `b54e1f827b00ebe2b0ccd7720a595940b57387c7`, the existing preview immediately before this test repair. The repair changes test code and fixtures, not application layouts or payment rules.

The previous reference, `215f74942949572ae40f242f3e284308a2f29286` (28 September), predates subsequent requested functionality. Comparing every later release with it asserted that none of those changes existed on mobile. That assertion is no longer an appropriate regression contract. This update does **not** claim the current UI is pixel-identical to September.

## Evidence reviewed

The old comparisons and errors remain in [account run 40129969709](https://github.com/kylebutler123-create/drivedrop/actions/runs/40129969709) and [public run 40129969665](https://github.com/kylebutler123-create/drivedrop/actions/runs/40129969665). The account artifact contains synthetic local fixtures, not hosted accounts. Before/after mobile images were reviewed alongside the current components and the approved feature history.

| Screen | Material change visible against September |
| --- | --- |
| Customer dashboard/request | Calendar and mandatory collection time window; explicit running-condition choice |
| Customer quote requests | Current quote indicator and compact card presentation |
| Customer deliveries | Delivery progress labels and collection-date presentation |
| Transporter verification | Updated document controls and expiry presentation |
| Transporter account | Stripe payout setup, email preferences and revised verification content |
| Admin dashboard/verification | Current action counts and verification filters |
| Admin disputes | Revised compact disputes, payment breakdown and review actions |
| Admin payouts | Review-window, processing and recovery statuses |
| Admin messages/notifications | Role-appropriate heading/copy and revised notification presentation |
| Customer receipt/transporter statement | Explicit UK date/time formatting, deployed and verified before this repair |

Future source changes must still pass comparisons against the pinned October reference. Screenshot thresholds have not been increased, failing pages have not been excluded, and no fields have been newly masked. Existing full screenshots remain artifacts. A future intentional design change requires a reviewed reference update with its rationale; a failed comparison alone is not a reason to advance it.

## Functional contracts

- Select visible responsive controls and the current admin sidebar. Hidden legacy controls are not valid click targets.
- Customer/transporter conversations expand below the selected inbox card; the admin conversation retains its adjacent layout.
- A quote request includes collection times. Selection authorises TEST payment and waits for transporter confirmation; confirmation captures once and creates one booking.
- Check customer and transporter prices separately, and verify the authoritative fee in the disposable local database, not a deliberately restricted customer API response.
- Newly confirmed delivery retains its natural 24-hour hold. The separate reviewed-dispute exception is exercised through actual customer/admin routes. No clock or confirmation timestamp is changed.
- Duplicate selection, confirmation and payout requests must not create duplicate financial records.

All financial workflow assertions use provider `TEST` and the guarded loopback database `drivedrop_browser_ci`. They do not exercise hosted Stripe recovery, bank transfers, external email delivery or production readiness.
