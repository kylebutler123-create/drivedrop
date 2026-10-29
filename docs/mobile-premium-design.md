# DriveDrop approved mobile design

Implements the approved three-screen transport app concept (customer home, transporter jobs, delivery detail) on the existing application. The mobile website and home-screen web app share the same components. The desktop breakpoint remains 1024px.

## Presentation

- Original desktop DriveDrop logo; navy `#071c43`, orange `#ff7114`, white navigation, cool grey backgrounds and the existing DriveDrop font.
- Photographic customer hero, overlapping collection/delivery form, real activity totals and upcoming bookings.
- Real booked-proceeds total, search, existing vehicle/transport/distance filters, synchronised sorting, vehicle-photo cards and orange quote actions.
- Delivery photo, route overview, actual status progression, collection window and existing contact/detail actions.
- White bottom navigation; account menu retains sign out, proceeds/payments, verification, history, reviews and help.
- `/app` launches the correct authenticated dashboard. `/manifest.webmanifest` and the original brand-derived icons support home-screen installation. No native store package or offline data cache is introduced.

## Functional boundaries

Existing quote, date negotiation, authorisation, payment, booking, evidence, dispute, cancellation and review handlers are reused. No payment rules, database schema, credentials or production configuration changed.

The booking response adds `mobileVehiclePhotoPath` solely for mobile photo rendering; its existing desktop photo behaviour is retained. Existing optional photo upload is exposed in the mobile request form. Empty or unavailable vehicle photos use an explicit placeholder, never an unrelated vehicle image.

The concept's sample names, balances, photos and counts are replaced with account data. The journey graphic is explicitly a **route overview**, not a geographic map, driving directions or live tracking. Profile links use the real transporter; sample ratings, verification badges and avatars are not fabricated. The concept's decorative favourite heart is omitted because DriveDrop has no existing saved-jobs action.

## Verification

- TypeScript check and Next.js production build passed using a nonconnecting local database placeholder; no database or payment tests were run.
- Local browser checks use an isolated source copy with synthetic authentication and intercepted API responses. This fixture is never committed or deployed.
- 28 initial checks passed: 320/390/430/768px layouts, long addresses, empty jobs, address hand-off to the existing request form, required-field validation, search/filters, quote and delivery expansion, contact URLs, cancellation access, desktop rendering and install assets. No runtime errors, horizontal overflow or write requests occurred.
- Follow-up checks passed for mobile photo upload, booking photo isolation, stale delivery links, sorting synchronisation and quote history. The desktop screenshot matches the previous approved source with identical fixtures (0 changed pixels); placing mobile navigation before the original header preserves its adjacent-sibling CSS selectors.
- Financial operations and production services were not exercised. Real-device installation and native store packaging remain separate from browser UI validation.

## Hero asset

`public/mobile-app/transport-hero.webp` was produced with the built-in image-generation tool using the approved design as reference. It is decorative brand photography, not a customer's vehicle photo.

Prompt: recreate only the left customer-screen photograph: a silver BMW 3 Series viewed from its rear-left three-quarter angle on a dark transporter truck; distant British waterfront skyline, cool blue-grey daylight, premium realistic automotive photography, upper sky space for white text. Preserve the reference angle, subject, atmosphere and visual weight. No phones, interface, logos, lettering or frames.
