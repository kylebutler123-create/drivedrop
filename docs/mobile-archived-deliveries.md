# Mobile completed and cancelled deliveries

Below 1024px, Active, Completed and Cancelled share the Your deliveries heading, proceeds panel and navigation. Buttons update the view and URL using Next.js-supported native history, without reloading or scrolling into the completed portal. Browser back/forward restores the selected tab. Existing completed booking deep links still open the requested card; desktop selection and scrolling remain intact.

The approved archive cards use the existing vehicle photo/fallback, navy photo overlay, customer initials and registration, state/date details and navy disclosure button. Completed cards keep the current payout calculation/label, evidence summary and orange printable statement link. Cancelled cards keep the original cancellation note and scheduled collection disclosure. No sample records or amounts are included in application source.

Completed details retain vehicle information, customer confirmation, payout setup, fine/refund adjustments, release information, dispute/held explanations, delivery history, collection/delivery reports, photos, signatures and captured location links. Identity, route, net amount and payout status remain in the summary instead of repeating in the expanded details. Existing message/call, dispute submission, review-window and activity-read handlers remain in place. Stripe release wording remains distinct from bank arrival.

The new presentation is mobile-only. Desktop cards and controls remain mounted with their existing markup and styles. No API ownership rules, payout logic, payment writes, database schema or data queries changed.

Validation:
- Production build and existing payout-policy tests passed.
- Local browser fixtures cover same-page switching, history, direct links, payout filters, evidence/statement links, original dispute submission, cancellation expansion, 320–1023px layouts, missing-data fallbacks, empty/error/retry states and original desktop cards.
- Fixture requests for activity read state and dispute submission are intercepted locally. No live deliveries, disputes or payments are changed during verification.
