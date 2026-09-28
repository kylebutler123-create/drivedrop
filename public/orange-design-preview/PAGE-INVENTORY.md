# Page inventory

59 review pages/states; 31 existing application route files inspected. Expanded quote steps, dialogs, report condition fields and role-specific shared pages are additional UI states.

| Group | View | Preview hash | Reference |
|---|---|---|---|
| Public | Homepage | `#/home` | PA01 |
| Public | Get a Quote | `#/quote` | PA02 |
| Public | How it works | `#/how` | PA01 |
| Public | For customers | `#/customers` | PA01 |
| Public | For transporters | `#/transporters` | PA01 |
| Public | About DriveDrop | `#/about` | PA01 |
| Public | Help / Contact | `#/help` | PA06 |
| Public | Contact | `#/contact` | PA06 |
| Access | Customer Login | `#/login-customer` | PA03 |
| Access | Create Customer Account | `#/register-customer` | PA04 |
| Access | Transporter Login | `#/login-transporter` | PA05 |
| Access | Create Transporter Account | `#/register-transporter` | PA05 |
| Access | Admin Login | `#/login-admin` | AD01 |
| Access | Forgot password | `#/forgot` | PA03 |
| Access | Reset password | `#/reset` | PA03 |
| Customer | Customer Dashboard | `#/customer-home` | CU01 |
| Customer | Request vehicle transport | `#/customer-request` | PA02 |
| Customer | Quote Requests | `#/customer-requests` | CU02 |
| Customer | Compare Quotes | `#/customer-compare` | CU02 |
| Customer | Your Deliveries | `#/customer-deliveries` | CU03 |
| Customer | Delivery Details | `#/customer-tracking` | CU03 |
| Customer | Confirm Delivery | `#/customer-confirm` | CU03 |
| Customer | Completed Delivery | `#/customer-completed` | CU04 |
| Customer | Cancelled | `#/customer-cancelled` | CU04 |
| Transporter | Transporter Dashboard | `#/transporter-home` | TR01 |
| Transporter | Available Transport Jobs | `#/transporter-jobs` | TR02 |
| Transporter | My Submitted Quotes | `#/transporter-quotes` | TR03 |
| Transporter | Active Deliveries | `#/transporter-active` | TR04 |
| Transporter | Collection Report | `#/transporter-collection` | TR04 |
| Transporter | Delivery Report | `#/transporter-delivery` | TR04 |
| Transporter | Delivered | `#/transporter-completed` | TR04 |
| Transporter | Booked Proceeds | `#/transporter-proceeds` | TR05 |
| Transporter | Fines / Refunds | `#/transporter-adjustments` | TR05 |
| Transporter | Verification / Profile | `#/transporter-verification` | TR06 |
| Transporter | Insurance / Documents | `#/transporter-documents` | TR06 |
| Transporter | Edit Profile Photos | `#/transporter-profile` | TR06 |
| Transporter | Customer Reviews | `#/transporter-reviews` | TR06 |
| Transporter | Public Transporter Profile | `#/public-profile` | TR06 |
| Admin | Admin Dashboard | `#/admin-home` | AD01 |
| Admin | User Management | `#/admin-users` | AD01 |
| Admin | Verification Queue | `#/admin-verification` | AD02 |
| Admin | Verification Review | `#/admin-verification-detail` | AD02 |
| Admin | Dispute Management | `#/admin-disputes` | AD03 |
| Admin | Dispute Details | `#/admin-dispute-detail` | AD03 |
| Admin | Bookings / Deliveries | `#/admin-bookings` | AD01 |
| Admin | Payouts Management | `#/admin-payouts` | AD04 |
| Admin | Review Moderation | `#/admin-reviews` | AD03 |
| Admin | Review Disputes | `#/admin-review-disputes` | AD03 |
| Admin | Help & Support | `#/admin-help` | AD05 |
| Shared | Messages | `#/messages` | CU05 |
| Shared | Notifications | `#/notifications` | CU01 |
| Shared | Account Settings | `#/account` | CU06 |
| Shared | Printable Statement | `#/statement` | AD06 |
| Shared | Terms & Conditions | `#/terms` | AD06 |
| Shared | Privacy Policy | `#/privacy` | AD06 |
| Transporter | Test Payout Details | `#/transporter-payout-details` | TR05 |
| Transporter | Submitted Quote Details | `#/transporter-quote-detail` | TR03 |
| Customer | Review Selected Quote | `#/customer-booking-review` | CU02 |
| Transporter | Business Details | `#/transporter-business` | TR06 |

## Application route mapping

| Existing route | Preview views |
|---|---|
| `/about` | about |
| `/account` | account, transporter-profile, transporter-payout-details |
| `/admin` | admin-home, admin-users, admin-verification, admin-verification-detail, admin-disputes, admin-dispute-detail, admin-bookings, admin-reviews |
| `/admin/payouts` | admin-payouts |
| `/admin/review-disputes` | admin-review-disputes |
| `/bookings/[id]/statement` | statement (illustrative transporter statement) |
| `/contact` | contact |
| `/customer/manage-requests` | customer-requests, customer-booking-review |
| `/customer` | customer-home, customer-request, customer-compare, customer-deliveries, customer-confirm, customer-completed, customer-cancelled |
| `/for-customers` | customers |
| `/for-transporters` | transporters |
| `/forgot-password` | forgot |
| `/get-quotes` | quote |
| `/help` | help, admin-help |
| `/how-it-works` | how |
| `/login` | login-customer, login-transporter, login-admin |
| `/messages` | messages |
| `/notifications` | notifications |
| `/` | home |
| `/privacy` | privacy |
| `/register` | register-customer, register-transporter |
| `/reset-password` | reset |
| `/terms` | terms |
| `/transporter/delivered` | transporter-completed |
| `/transporter/manage-deliveries` | transporter-active, transporter-collection, transporter-delivery |
| `/transporter` | transporter-home, transporter-jobs |
| `/transporter/proceeds` | transporter-proceeds, transporter-adjustments |
| `/transporter/profile/[id]` | public-profile |
| `/transporter/quotes` | transporter-quotes, transporter-quote-detail |
| `/transporter/reviews` | transporter-reviews |
| `/transporter/verification` | transporter-verification, transporter-business, transporter-documents |
