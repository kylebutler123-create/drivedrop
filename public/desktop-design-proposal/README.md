# DriveDrop desktop design source

This is the implementation source for a **design proposal**, not a replacement application. Open `index.html` in a browser or the preview URL to navigate 50 screens and states. The page selector is a design review control and disappears when **Hide page menu** is selected. No account, quote, payment or message is submitted by this preview.

## Exact visual source

| File | Transfer rule after approval |
| --- | --- |
| `style.css` | Reuse its tokens, CSS declarations, dimensions and responsive rules in the real page components. Do not approximate them from screenshots. |
| `app.js` | Use the actual HTML structure, headings, static copy and button labels as the visual contract. Replace preview-only data and click handlers with the existing React components and API handlers. |
| `legal-content.js` | Exact section copy and date extracted from existing `terms/page.tsx` and `privacy/page.tsx`; leave the real legal page source in place. |
| `assets/*` | Copy these very same files and filenames. Their SHA-256 hashes in `ASSETS.sha256` identify the versions shown. The logo is an outlined vector. |
| `index.html` | Only the design navigation and prototype bootstrapping. Do not ship the review selector in the customer site. |

Live account names, vehicle details, quotes, financial values, statuses, dates and messages necessarily come from the database. Every illustrative value in this preview is labelled as sample or example. Reusing the visual code gives identical static wording, images, colours, dimensions and layouts; authenticated screenshots must be compared using the same fixture data to verify that match. No static design can promise identical live numbers for different users.

## Route and functionality mapping

| Design screen(s) | Existing DriveDrop route or component | Preserve when implementing |
| --- | --- | --- |
| Homepage | `/`, `HomeQuoteRequestPanel` | Quote card expansion, create/login switch, draft, calendar, compatibility warning, lower sections and navigation. |
| How / customers / transporters / about / help / contact | `/how-it-works`, `/for-customers`, `/for-transporters`, `/about`, `/help`, `/contact` | Existing supported destinations, wording and contact channels. No fabricated public phone, live chat, performance or review claims. |
| Get quotes | `/get-quotes`, `QuoteRequestWorkspace`, `HomeQuoteRequestPanel` | Collection, delivery, collection date, transport type, vehicle type, make, model, registration, running condition, create account or login, phone for new customers, compatible enclosed transport, one submit handler. |
| Customer / transporter / admin login | `/login` | Email, password, Show/Hide, Forgot password, role switch and server-authorized destination. Admin is a preview state of the shared login, not a new admin role selector. |
| Customer / transporter registration | `/register` | Name/business, email, customer phone, password, role and existing account path. |
| Forgot / reset | `/forgot-password`, `/reset-password` | Email-token flow, password checks and notices. |
| Customer overview and request | `/customer` | Existing customer dashboard data and request form. Do not duplicate forms or fetches. |
| Requests / comparison | `/customer`, `/customer/manage-requests` | New-activity marks, quote/date proposal review, message, accept/Preview payment, cancellation. |
| Active / awaiting confirmation / completed / cancelled | `/customer` | Status, call transporter where available, delivery evidence, confirmation, dispute and refund rules. |
| Transporter overview / available jobs | `/transporter` | Real jobs, filter, compatibility, already-quoted indicator, quote/date proposal and messages. |
| Submitted quotes / active deliveries / reports | `/transporter/quotes`, `/transporter/manage-deliveries`, `/transporter` | Quote cancellation, status updates, complete collection/delivery, photos, signatures, optional saved location, call/message and £50 cancellation rule. |
| Delivered / proceeds / adjustments | `/transporter/delivered`, `/transporter/proceeds` | Delivery-date sort, awaiting customer / ready / paid, held and blocked categories, fines/refunds, actual server totals. |
| Verification / documents / profile / reviews / public profile | `/transporter/verification`, `/account`, `/transporter/reviews`, `/transporter/profile/[id]` | Business details, 4 MB PDF/JPG/PNG uploads, insurance expiry, review states, image crop, public replies and disputes. |
| Admin Control Centre / users / verification / disputes / bookings / payouts / moderation | `/admin`, `/admin/payouts`, `/admin/review-disputes` | Existing role permissions, search/filter state, real counters, document decisions, dispute actions, financial rules and audit data. |
| Messages / notifications / account | `/messages`, `/notifications`, `/account` | Unread activity, conversation order/search/delete, composer, email/password change and account closure. |
| Statement / terms / privacy | `/bookings/[id]/statement`, `/terms`, `/privacy` | Actual booking data, print, complete legal wording and existing date. |

## Approval-to-implementation gate

1. Review every screen in the selector at 1440 CSS px, especially all role states and forms. The preview is desktop-first; existing mobile pages stay unchanged when this design is implemented.
2. Implement one shared shell and shared tokens, then adapt the existing route components. Copy the static markup/CSS/assets from this package. Reuse real data-owning components and handlers; never create fake buttons or a second submitting form.
3. Capture matching 1024, 1280, 1440 and 1920 px screenshots of design and implementation with identical synthetic fixture data. Correct meaningful differences in image crop, typography, spacing, page height and visible fields before accepting each page.
4. Verify 390, 430, 760, 761, 844, 932 and 1023 px stay unchanged from the current mobile/tablet baseline. Test customer quote creation, login/registration, quote acceptance, collection/delivery evidence, verification, messages, admin actions and payout states in isolated data.
5. Keep implementation on `feature/ui-polish` preview until separate production approval.

## Preview interaction boundaries

Navigation, filter appearance, account create/login switch and compatibility warning are interactive. Buttons that would write data show a design-preview notice. They must be connected to the **existing** production handlers only during implementation. Dynamic records in this file are illustrative and cannot be used as real marketplace claims.
