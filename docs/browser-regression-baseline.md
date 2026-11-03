# Browser regression references

## Public pages — 3 November 2026

The public suite pins `ee60a1f9fc09148a84a0e53008ed76b3cca69b79`, the 1 November preview containing the approved mobile public pages, premium homepage and role-aware sign-in. Later admin-fine and payout-notification changes did not change these public pages. The 24 October public reference predates their redesign.

From 375 to 1023 CSS pixels the test follows **Get free quotes** to `/get-quotes` and checks the **Collection & delivery** step and both address fields. It compares full screenshots of the homepage and the quote form at all eight widths. The desktop homepage still has an inline quote form with its own expansion and value-retention checks.

The mobile design and its original verification are documented in [Mobile public pages](mobile-public-pages.md) and [Signed-in mobile public pages](mobile-signed-in-home.md). The previous failing run is [41671847598](https://github.com/kylebutler123-create/drivedrop/actions/runs/41671847598).

## Authenticated reference and 24 October review

Both suites originally pinned `b54e1f827b00ebe2b0ccd7720a595940b57387c7` after the 24 October review. The authenticated suite still uses this reference with the small, frozen proceeds CSS correction described below.

The previous reference, `215f74942949572ae40f242f3e284308a2f29286` (28 September), predates subsequent requested functionality. Comparing every later release with it asserted that none of those changes existed on mobile. That assertion is no longer an appropriate regression contract. This update does **not** claim the current UI is pixel-identical to September.

## Evidence reviewed

The old comparisons and errors remain in [account run 40129969709](https://github.com/kylebutler123-create/drivedrop/actions/runs/40129969709) and [public run 40129969665](https://github.com/kylebutler123-create/drivedrop/actions/runs/40129969665). The account artifact contains synthetic local fixtures, not hosted accounts. Before/after mobile images were reviewed alongside the current components and the approved feature history.

| Screen | Material change visible against September |
| --- | --- |
| Public homepage | Current reference sections, labelled sample statistics/reviews and footer signup link; the former transporter photograph banner is no longer rendered |
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

Each suite compares against its fixed reference and retains full screenshots. A future intentional design change requires a reviewed reference update with its rationale.

## Functional contracts

### Proceeds responsive correction

[Account run 40130985883](https://github.com/kylebutler123-create/drivedrop/actions/runs/40130985883) exposed real horizontal overflow: 431px of content in a 390px viewport and 922px at 761px. The full screenshots show desktop fine/refund totals duplicated alongside the mobile totals. The tablet also retained the six-column summary intended for wider screens.

The application correction hides the duplicate desktop totals below 1024px, permits long mobile amounts to wrap, and uses three summary columns from 761–1023px. Desktop styles and payment values are unchanged. The reference build applies the explicit, frozen `scripts/fixtures/proceeds-responsive-baseline.patch` to the pinned source so this intentional repair is represented in expected screenshots. This patch contains only those CSS rules; it must never be regenerated automatically from current source. Absolute no-overflow checks remain mandatory, and all five proceeds views remain in screenshot comparisons. Full before/after screenshots remain in the linked run and the repair run.

### Current interactions

- Select visible responsive controls and the current admin sidebar. Hidden legacy controls are not valid click targets.
- The current homepage has no `.approvedTransporterBanner`; its unused CSS is not evidence of rendered content. Check the visible sample-content labels and transporter signup link instead of asserting the retired photograph's height.
- Customer/transporter conversations expand below the selected inbox card; the admin conversation retains its adjacent layout.
- A quote request includes collection times. Selection authorises TEST payment and waits for transporter confirmation; confirmation captures once and creates one booking.
- Check customer and transporter prices separately, and verify the authoritative fee in the disposable local database, not a deliberately restricted customer API response.
- Newly confirmed delivery retains its natural 24-hour hold. The separate reviewed-dispute exception is exercised through actual customer/admin routes. No clock or confirmation timestamp is changed.
- Duplicate selection, confirmation and payout requests must not create duplicate financial records.

All financial workflow assertions use provider `TEST` and the guarded loopback database `drivedrop_browser_ci`. They do not exercise hosted Stripe recovery, bank transfers, external email delivery or production readiness.
