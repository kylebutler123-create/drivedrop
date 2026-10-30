# Mobile Booked proceeds

The app and mobile site share `/transporter/proceeds`. The approved navy, orange and white design is applied below 1024px. `ProceedsDesktop` and its styles remain unchanged; the mobile main is hidden at desktop widths.

- Account → Payments & preferences starts with Booked proceeds (coins icon, “View earnings & payout breakdown”), linking to `/transporter/proceeds`. The former top banner is removed from Available jobs, My quotes and all Your deliveries tabs. Customer Account and desktop navigation retain their existing controls.
- A navy total panel links back to all proceeds. Four status tiles and a separate fines/refunds card retain the existing filters and totals before fines.
- Year selection is a native expandable list, including archived years. The custom date form keeps its GET submission and server validation. PDF and CSV links keep their existing authenticated endpoints and selected period.
- Delivery cards show existing vehicle photos (with the shared missing/failed-photo fallback), customer/registration/reference, complete collection and delivery addresses, status badges, deductions, net proceeds and dates. Each amount/status appears once. Printable statements remain available only for delivered bookings.
- The app header and white bottom navigation are shared with the other app pages; Account is highlighted for this route.
- No financial calculations, record ownership checks, data queries, payout rules, database schema, export generation or statement routes changed. The dates use a compact UK presentation. Actual booking data supplies every value; the design preview's example amounts are not included in the application.

Validation: production build; `node scripts/test-transporter-proceeds.cjs` (owner/role checks, real calculation helpers, payout and adjustment filters, dates, archives, exports and statements); local browser checks using synthetic records for responsive layout and the existing read-only export endpoints. No live financial records were changed.
