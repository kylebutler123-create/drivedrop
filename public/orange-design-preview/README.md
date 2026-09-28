# DriveDrop — Orange design review

Built for Kye from the 28 September 2026 approved orange-pin PDF and readable guide. This is a standalone desktop design preview containing 59 pages/states. It is not the production application.

Open `index.html` or the hosted `/orange-design-preview/index.html` path. Use the page selector and arrows to browse all states. The Reference button opens the corresponding supplied board. On a phone, Fit screen scales the desktop composition; Actual size allows horizontal inspection. These controls are not website UI.

## Visual source of truth

`app.js`, `supplementary-pages.js`, `review-interactions.js`, `style.css`, `legal-content.js`, `assets/*` contain the exact markup, static wording, CSS, fonts and image files displayed. Transfer these assets and visual declarations to existing DriveDrop components after approval; do not reinterpret screenshots. Static images, CSS and text should match the approved preview at the same viewport. Live account records and values must replace illustrative fixture data.

All photographs are new. No old DriveDrop photographs or old green logo are included. The six new photos were generated with the built-in image tool using the approved boards as references. Their clean compositions closely follow the references; they are reconstructions, not recovered hidden photo layers. The orange-pin SVG is a newly drawn, outlined-vector interpretation. Nimbus Sans is bundled to make typography reproducible; the reference's original font was not supplied. Assets are inventoried and hashed in `ASSETS.sha256`.

Reference boards are JPEG-encoded copies of images embedded in the supplied PDF, at their original 1448×1086 dimensions. They are comparison aids, never used as webpage backgrounds containing baked-in UI. The unchanged PDF remains separately supplied by the user.

## Page-specific design decisions

- PA01: white header, orange-pin brand, new London carrier hero, overlapping two-tab quote card with vehicle-only compact view and an expandable journey/account section, three process steps and navy footer.
- PA02: four visual quote steps with a persistent summary. Preserve all existing quote fields: collection, delivery, date, vehicle type, running condition, make, model, registration, transport type and customer create/login choice. This preview submits nothing.
- PA03–PA05: form on the left, newly recreated photo on the right. Customer phone field and password visibility retained. No unsupported Remember me checkbox added.
- CU01/CU06: navy sidebar; other customer detail/comparison/message pages use the white horizontal header, as drawn.
- CU03: real-status-compatible timeline and journey details. The reference's continuous GPS map is not represented as an existing feature; actual submitted location evidence belongs here during implementation.
- CU04: delivery summary, evidence area and review form. Example vehicle pictures are layout fixtures, not genuine proof of delivery.
- TR01–TR06: horizontal transporter header, new driver hero, vehicle-photo job cards, quote table, delivery controls, proceeds overview and profile/verification cards.
- AD01–AD06: full navy admin rail, action centre, verification review, dispute details, payout states and help/legal/statement treatment.
- Unsupported reference claims such as 2,000 customers, guaranteed secure/timely payments, live chat and new compliance checks are not adopted as live facts. Where needed, supported customer information occupies those areas.
- Unpictured operational states inherit this visual system, preserving their existing fields/actions. They are separately reachable in the page selector.

## Existing functionality mapping for implementation

| Screens | Existing owner | Preserve |
|---|---|---|
| Homepage / quote / customer request | `HomeQuoteRequestPanel`, `QuoteRequestWorkspace`, `/get-quotes`, `/customer` | All inputs, draft persistence, date selection, vehicle/transport compatibility; customer creation or login plus quote creation through existing handlers. |
| Login / register / recovery | `/login`, `/register`, `/forgot-password`, `/reset-password` | Existing auth, role checks, customer phone, recovery checks and errors. |
| Requests / comparison / bookings / completed / cancelled | `/customer`, `/customer/manage-requests` | Quote/date proposals, acceptance/payment rules, status activity, cancellation, confirmation, disputes, review eligibility and call/message rules. |
| Jobs / submitted quotes / active / collection / delivery | `/transporter`, `/transporter/quotes`, `/transporter/manage-deliveries` | Supported filters, quote fields, date proposals, £50 cancellation rule, reports, photos, signatures, optional location and correct compact/expanded actions. |
| Proceeds / delivered / adjustments / statement | `/transporter/proceeds`, `/transporter/delivered`, `/bookings/[id]/statement` | Server totals, Booked/In progress/Ready/Held/Paid/Fines/Refunds, delivery-date sorting and party-specific financial values. The preview chart is illustrative, not a new financial calculation. |
| Verification / business / documents / profile / reviews | `/transporter/verification`, `/account`, `/transporter/profile/[id]`, `/transporter/reviews` | Current driving licence and insurance requirements, 4 MB limits, expiry and review statuses, image crop, review response/dispute rules. |
| Admin | `/admin`, `/admin/payouts`, `/admin/review-disputes` | Existing permissions, searches, counters, verification decisions, dispute/fine/refund/release actions, moderation and audit data. No new bulk payment integration. |
| Shared | `/messages`, `/notifications`, `/account` | Conversation and unread state, composer, deletion, account/email/password changes and closure checks. |
| Legal | `/terms`, `/privacy` | Complete existing legal text, not the partial board text. |

## Interactive preview boundaries

Working: page navigation, reference boards, desktop fit/actual-size, quote steps and draft retention during navigation, calendar selection, compatibility warning, account create/login toggle, Show/Hide password, example job filtering, message search/conversation selection, local-only message bubbles, rating selection, dialogs and statement printing. Account and financial buttons explain that the real action belongs to existing DriveDrop handlers. No API requests, accounts, quotes, messages or payments are submitted.

## Approval and implementation

Review this concrete preview and its newly reconstructed assets. After approval, apply visual markup/styles/assets to existing React components and preserve their data and action owners. Compare screenshots against this exact source with identical fixtures at 1024, 1280, 1440 and 1920 pixels. Test all affected real workflows using isolated test records. Current mobile layouts must be unchanged. Keep work on `feature/ui-polish` and Vercel Preview; no production merge without approval.

## Validation

`node verify-preview.mjs` renders every state in a minimal DOM and checks local asset paths and navigation targets. Browser review checks real rendering and selected local interactions. This does not claim live-backend end-to-end verification.
