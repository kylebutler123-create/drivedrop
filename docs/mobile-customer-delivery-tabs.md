# Customer mobile delivery tabs

Customer Active, Completed and Cancelled now use the same segmented buttons and shared CSS as transporter deliveries below 1024px. The heading stays “Your deliveries” across all three views.

The buttons update React state and the URL with Next.js-supported native history instead of navigating to a new document. Completed and Cancelled use the already-loaded bookings. Returning to Active refreshes the existing booking data in the background without clearing cards; a slow or failed request does not prevent switching tabs. Back/forward restores the selected view, and selecting the current tab does not add another history entry.

Newly mounted customer booking cards start collapsed, matching their existing expander's default and preventing an expanded-content flash before enhancement. The mobile Active view no longer scrolls past its status buttons on entry. Existing booking deep links, desktop controls, card actions, payment logic and API permissions are retained.

Validation uses the actual customer and transporter pages with synthetic bookings and locally intercepted API requests. It covers document preservation and request counts, back/forward, selected-tab idempotence, keyboard activation, delayed and failed refreshes, direct links, focused bookings, empty states, card expansion and desktop controls. Computed button styles are compared between both accounts at 320, 390, 768 and 1023px. No live customer, delivery or payment records are changed.
