# Mobile completed and cancelled deliveries

Below 1024px, Active, Completed and Cancelled share the Your deliveries heading, proceeds panel and navigation. Buttons update the view and URL using Next.js-supported native history, without reloading or scrolling into the completed portal. Browser back/forward restores the selected tab. Existing completed booking deep links still open the requested card; desktop selection and scrolling remain intact.

The approved archive cards use the existing vehicle photo/fallback, navy photo overlay, customer initials and registration, state/date details and navy disclosure button. Completed cards keep the current payout calculation/label, evidence summary and orange printable statement link. Cancelled cards keep the original cancellation note and scheduled collection disclosure. No sample records or amounts are included in application source.

Completed details follow the approved Active-card layout: the shared two-column vehicle grid, original white Payout details rows and one closed Collection & delivery evidence disclosure containing both reports. The full compact summary remains visible while expanded, including the amount, payout status, proof summary and original statement button. Only the disclosure label changes. Fine/refund adjustments, customer confirmation, payout setup, release information, dispute/held explanations, photos, signatures and captured location links are retained. The standalone mobile history section is removed. Existing message/call, dispute submission, review-window and activity-read handlers remain in place. Stripe release wording remains distinct from bank arrival.

The new presentation is mobile-only. Desktop cards and controls remain mounted with their existing markup and styles. No API ownership rules, payout logic, payment writes, database schema or data queries changed.

Validation:
- Production build and existing payout-policy tests passed.
- Local browser fixtures cover same-page switching, history, direct links, payout filters, evidence/statement links, original dispute submission, cancellation expansion, 320–1023px layouts, missing-data fallbacks, empty/error/retry states and original desktop cards.
- Fixture requests for activity read state and dispute submission are intercepted locally. No live deliveries, disputes or payments are changed during verification.

## Completed expansion validation — 30 October 2026

- Application production build and isolated fixture build passed, using a local placeholder database URL; no live data writes.
- Existing payout-policy checks passed. The summary consumes the parent's computed payout status; it never calculates or releases funds.
- Browser checks passed for the approved layout, one visible amount and statement, shared evidence disclosure (mouse and keyboard), both photo/signature reports and captured location.
- Checked awaiting, ready, held, paid, blocked, 24-hour hold, failed, processing and cancelled payouts, fine deductions, partial/full refunds, absent payment and missing proof.
- Expanded layout fits 320, 390, 430, 768 and 1023px; desktop compact/expanded controls remain visible and the new mobile section remains hidden.
- Same-page tabs, back/forward, original messaging/dispute controls, cancelled cards and error/empty states passed the existing fixture checks. All fixture API mutations were intercepted; no browser runtime errors.

## Approved compact-summary restoration — 30 October 2026

The revised approval restores the compact top and original white Payout details section, while retaining the two-column vehicle grid and combined evidence dropdown. The separate navy payout and expanded statement panels are removed. Mobile completed cards use a consistent border width so marking a card read does not resize its contents.

Eight focused browser checks passed for unchanged summary content/dimensions, one statement/amount, original white payout rows, the combined evidence control, 320–1023px widths, payout warnings and filters, fine/refund adjustments and original desktop controls. Fixture mutations remained local; no browser runtime errors.
