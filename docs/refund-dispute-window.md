# Booking refunds and the delivery review window

The normal 24-hour clock starts when the customer confirms receipt of the vehicle. Capturing the booking payment or marking the vehicle delivered does not start it. If there is no active dispute at the deadline, an otherwise eligible payment becomes ready for **manual admin release**. It does not automatically transfer, and arrival in the transporter's bank is a later step.

An active dispute keeps the payout held until admin resolves it. For example, if the customer files at hour 23, admin can decide a week later. Once the filing window has closed, a new refund must come from that customer's still-open case, filed before the deadline. A generic hold, a transporter complaint, or a closed case does not provide this exception. Admin can issue a full refund and cancel the payout, approve a partial refund and remaining proceeds, or approve release. An explicitly adjudicated release can still be approved before the normal 24 hours expire.

Once an admin starts the transporter payout, neither the payout record nor the dispute screen can initiate a booking refund. The server enforces this even on a stale request. An existing Stripe refund can still be reconciled, including a later status change or recovery of an already-issued refund. An unsent legacy instruction cannot create a new Stripe refund after payout. Card issuer disputes still follow their provider process.

Stripe documents a [90-day UK limit on manual payouts from a connected balance to a bank](https://docs.stripe.com/connect/manual-payouts). DriveDrop delays the [separate transfer to the connected account](https://docs.stripe.com/connect/separate-charges-and-transfers). The payout limit is not a verified deadline for that earlier step. There is no automatic dispute-release timer in DriveDrop.

The [previous Stripe recovery review](stripe-payment-readiness-review.md) remains the record for historical refunds. The actual provider insufficient-balance reversal scenario was not verified by changing this policy.
