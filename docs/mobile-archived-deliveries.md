# Mobile completed and cancelled deliveries

Below 1024px, Active, Completed and Cancelled share the Your deliveries heading, proceeds panel and navigation. Buttons update the view and URL using Next.js-supported native history, without reloading or scrolling into the completed portal. Browser back/forward restores the selected tab. Existing completed booking deep links still open the requested card; desktop selection and scrolling remain intact.

The approved archive cards use the existing vehicle photo/fallback, navy photo overlay, customer initials and registration, state/date details and navy disclosure button. Completed cards keep the current payout calculation/label, evidence summary and orange printable statement link. Cancelled cards keep the original cancellation note and scheduled collection disclosure. No sample records or amounts are included in application source.

Completed details follow the approved Active-card layout: the shared two-column vehicle grid, a navy Payout panel, customer confirmation, an orange printable-statement panel and one closed Collection & delivery evidence disclosure containing both reports. Fine/refund adjustments, release information, setup warnings, dispute/held explanations, photos, signatures and captured location links are retained. The standalone mobile history section is removed. Identity and route remain in the summary; when expanded, payout amount/status and statement move into the expanded area so each appears only once. Existing message/call, dispute submission, review-window and activity-read handlers remain in place. Stripe release wording remains distinct from bank arrival.

The new presentation is mobile-only. Desktop cards and controls remain mounted with their existing markup and styles. No API ownership rules, payout logic, payment writes, database schema or data queries changed.

Validation:
- Production build and existing payout-policy tests passed.
- Local browser fixtures cover same-page switching, history, direct links, payout filters, evidence/statement links, original dispute submission, cancellation expansion, 320–1023px layouts, missing-data fallbacks, empty/error/retry states and original desktop cards.
- Fixture requests for activity read state and dispute submission are intercepted locally. No live deliveries, disputes or payments are changed during verification.

## Completed expansion validation — 30 October 2026

- Application production build and isolated fixture build passed, using a local placeholder database URL; no live data writes.
- Existing payout-policy checks passed. The panel consumes the parent's computed payout status; it never calculates or releases funds.
- Browser checks passed for the approved layout, one visible amount and statement, shared evidence disclosure (mouse and keyboard), both photo/signature reports and captured location.
- Checked awaiting, ready, held, paid, blocked, 24-hour hold, failed, processing and cancelled payouts, fine deductions, partial/full refunds, absent payment and missing proof.
- Expanded layout fits 320, 390, 430, 768 and 1023px; desktop compact/expanded controls remain visible and the new mobile section remains hidden.
- Same-page tabs, back/forward, original messaging/dispute controls, cancelled cards and error/empty states passed the existing fixture checks. All fixture API mutations were intercepted; no browser runtime errors.
