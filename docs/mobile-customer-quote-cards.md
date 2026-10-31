# Mobile customer quote request cards

Applies below 1024px on the customer Quote requests page. The existing desktop cards remain in place.

- The compact card shows the vehicle photo or fallback, quote count, request reference, route, requested collection window, lowest unexpired pending quote and compare action.
- Expanding retains the same vehicle summary. A native disclosure contains the original request fields and existing vehicle-photo upload control. Offers show transporter identity, verification, rating, collection schedule, message, customer total, profile link and selection control.
- Selection uses the existing `book` availability check and confirmation dialog. Existing confirmation requests, expired quotes and unresolved date negotiations disable selection. Date acceptance, rejection and counter-proposal use the existing date action component; customer-facing prices are retained.
- Cancellation uses the existing confirmation and request action component. Closing returns focus to the compare button. Desktop and payment APIs are unchanged.

Validation: full Next.js production build; browser checks at 320, 390, 768 and 1023px; desktop layout at 1440px; no-quotes, expired, active confirmation, long text and missing/broken photo states; disclosure, upload/removal, profile destinations, repeated selection, selection error, agreed and countered dates, cancellation success/error and counter updates. Browser requests used synthetic fixtures and intercepted APIs; no payment submission was made.

`test-customer-simple-quotes.cjs` passes. The existing `test-repeat-quote-selection.cjs` harness stops at an undefined `assertNewCheckoutAllowed` fixture dependency; its source and the backend it loads were not changed. Repeated selection and active-confirmation guards were also verified through the browser fixture.
