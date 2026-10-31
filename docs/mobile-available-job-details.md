# Mobile Available jobs details

The approved expanded card keeps the existing compact vehicle summary at the top. Below it, only the registration and quote form are added. The repeated vehicle heading, route, collection date/window, vehicle type, transport type and condition are hidden below 1024px for jobs without the transporter's own quote.

The registration falls back to `Not provided`. A plain `Your quote` heading replaces the nested mobile summary control, with sentence-case labels and the approved submit-button weight. The existing price, alternative collection date/window, expiry, message, validation, notices and submission handler remain intact. Closing and reopening the card preserves its draft.

Rules are limited to unquoted mobile Available jobs cards. Existing quote cards and desktop styling are retained; no API, storage or payment behavior changed.

Validation: `npm run build` and `git diff --check` passed. Browser checks used actual components with local synthetic API responses. They covered unique visible job details; all controls at 320, 390, 768 and 1023px; missing registration; long addresses; non-running/enclosed information; price validation; both date pickers and submitted values; draft preservation; failed submission, retry and busy states; successful submission and card removal. No browser runtime errors occurred. Pixel comparisons were identical for the compact mobile card and compact/expanded desktop cards at 1440px. No real quote was sent.
