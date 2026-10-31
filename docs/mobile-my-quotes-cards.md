# Mobile My quotes cards

The approved mobile layout keeps the existing vehicle summary and adds a clear quote amount with a response-status pill. The primary toggle reads `View quote details` / `Close quote details`. Equal-width outlined `Edit quote` and `Cancel quote` buttons sit together below it.

Expanded details use aligned customer, registration, quote-sent and expiry rows, followed by a separate message box. Dates and times use Europe/London. Missing registration, message and expiry have explicit fallbacks. A proposed collection date and time window appear when present; customer counter-proposals retain their action-needed status and existing date-negotiation controls.

The new presentation is limited to embedded My quotes cards below 1024px. Available jobs, quote history and desktop cards retain their presentation. Existing update, cancellation, confirmation and date-negotiation handlers are reused; no API or payment behavior changes.

Validation: production build and `git diff --check` passed. Browser checks on actual components with synthetic API responses covered 320, 390, 768 and 1023px layouts; expansion; editing from compact and expanded cards; discarded edits; failed saves and retries; cancellation dismissal, failure and successful removal; busy states; missing information; long customer names; proposed collection windows and counter-date acceptance. No browser runtime errors occurred and no real quotes were changed. Compact and expanded desktop screenshots at 1440px were pixel-identical to their baselines.
