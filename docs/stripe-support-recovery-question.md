# Stripe Support: transfer-reversal failure and retry

## Contact status — 21 October 2026

The approved question below was sent through the official `https://support.stripe.com/` support widget with **drivedrop sandbox (drivedrop)** selected. Stripe's AI assistant replied, and a human Connect technical specialist was requested. The widget offered chat or a callback, but no email option. Chat was selected and the page showed **Connecting you to a support agent**. At 17:27 UTC, no human response or case number had been confirmed.

**The genuine insufficient-balance reversal gate remains UNVERIFIED.** The AI response is not a specialist confirmation or a real Stripe failure/retry test. In particular, its statements about the platform balance being debited on a reversal need clarification; do not use that statement to alter funding, liability, reserves or the implementation.

This contact changes no Stripe setting, key permission, application source, environment variable, payment object or database row. No secret key, credential or customer information was sent. Refund activation remains off as last verified in the [readiness review](stripe-payment-readiness-review.md); this support-only step does not constitute another runtime or database check. Production and live payments were not accessed or changed.

## Read-only follow-up — 22 October 2026

The official Support page was reopened and showed the signed-in **drivedrop sandbox (drivedrop)** account. The Support widget displayed a fresh assistant greeting, without the previous escalation conversation, case number or human response. This does **not** establish that Stripe has not replied; the prior thread could not be recovered from the available view. No duplicate message was sent and no account, financial or permission setting was changed. The provider gate remains **UNVERIFIED** pending the actual specialist reply or a reviewed disposition.

The later [file-access preflight](production-payment-access-checkpoint.md) rechecked the same signed-in Support view on 22 October: it still displayed a fresh assistant greeting, with no recoverable prior thread, case number or human reply. No message was sent. This is an unavailable-thread observation, not a claim that Stripe has not replied.

## Exact initial message sent

Please route this to Stripe Connect technical support for confirmation of a sandbox testing limitation.

Our UK GBP marketplace uses separate charges and transfers in drivedrop sandbox. Its connected account has an Express dashboard and controller.losses.payments=application. A £1 reversal succeeded with £0 available balance and temporarily made the connected balance -£1. We want to verify the customer-refund-success / transfer-recovery-failure path without changing liability, reserves or payout permissions.

Is a balance_insufficient reversal failure reachable for this configuration? If so, what supported sandbox scenario or helper reliably produces it, and how should we fund and retry it? Please also confirm whether an insufficient-balance HTTP error is cached under the reversal idempotency key, and the supported retry procedure after funds become available. If there is no faithful sandbox reproduction for this setup, please confirm the expected behavior and test limitation. We have not treated a successful zero-balance reversal or a local SDK-error simulation as proof of the failure path.

This is a technical question only; please do not change account settings or initiate payments.

## Exact escalation request sent

Thank you. Please connect us to a human Stripe Connect technical support specialist, preferably by email, and include the original question. We need confirmation for this exact sandbox configuration and the reversal idempotency/retry behavior; please do not mark the testing limitation resolved from this AI response. This request is for technical guidance only, with no account changes or payment actions.

## Required disposition

Keep the gate open until Stripe supplies a supported reproduction/funding/retry procedure that can be reviewed and tested within the approved sandbox boundaries, or provides an explicit, configuration-specific confirmation of the limitation and expected retry behavior. A successful reversal at zero balance, the AI assistant's reply and local mock tests do not by themselves close this gate. Any further money operation, implementation change or production rollout remains separate work.

Stripe's [idempotent-request reference](https://docs.stripe.com/api/idempotent_requests), read with Stripe CLI 1.54.1 during the queue wait, says API v1 preserves the response once endpoint execution begins, while validation/concurrent-execution failures are not stored. It does not classify this specific reversal `balance_insufficient` outcome. That distinction is why the same-key retry question needs an explicit provider answer; no new-key retry or application change is justified by this general reference alone.
