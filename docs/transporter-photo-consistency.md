# Transporter photo consistency

The mobile transporter header, Account overview and Personal details use the uploaded personal photo. A layout-owned provider keeps the same image mounted through app navigation. Successful personal-photo uploads preload the replacement before swapping; successful removal immediately restores initials. Failed saves leave the current photo in place. Business logos and truck photos do not update this shared portrait.

Customer delivery cards also show the transporter's personal photo in the existing contact circle. The bookings endpoint loads those URLs in one parameterized query using only transporter IDs from the customer's authorized bookings. Message responses and other roles do not receive the additional field. No storage paths, access rules or upload contracts changed.

Missing or broken images use name initials. Existing dimensions, logo, navigation icons, message vehicle photos and desktop presentation are preserved.

## Validation

- `node scripts/test-transporter-photos.cjs`: batch lookup, parameter binding, missing photos, role/message exclusion, signed-out rejection, phone/price preservation.
- `npm run build`: passed.
- Local browser fixture using the actual layout, provider, photo editor and mobile components with synthetic accounts/images: responsive widths 320, 390, 768 and 1023; same header image node across Jobs, My quotes, Deliveries, Messages and Account; Booked proceeds navigation; Account and Personal details circles; cropped upload and removal; failed upload/removal preserving the photo; broken-image fallback and recovery; desktop layout at 1440.
- Customer delivery contact portrait, missing/broken-image initials and unchanged Message/Call buttons; no browser page errors.

The browser fixture substitutes auth, storage and API responses; it does not write to real accounts.
