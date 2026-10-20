-- A refund can fail after Stripe first confirmed it. Keep ledgerAppliedAt as
-- evidence of the original application; only the two explicit held late-failure
-- states may retain it without remaining SUCCEEDED. This changes no row data.
ALTER TABLE public."StripeRefund"
  DROP CONSTRAINT "StripeRefund_success_check",
  ADD CONSTRAINT "StripeRefund_success_check" CHECK (
    (
      "ledgerAppliedAt" IS NULL
      AND "status" <> 'SUCCEEDED'
      AND COALESCE("failureCode", '') NOT IN (
        'STRIPE_REFUND_FAILED_AFTER_SUCCESS', 'LATE_REFUND_FAILURE_REVIEW'
      )
    ) OR (
      "ledgerAppliedAt" IS NOT NULL
      AND "stripeRefundId" IS NOT NULL
      AND (
        ("status" = 'SUCCEEDED' AND COALESCE("failureCode", '') NOT IN (
          'STRIPE_REFUND_FAILED_AFTER_SUCCESS', 'LATE_REFUND_FAILURE_REVIEW'
        ))
        OR (
          "activePaymentId" IS NOT NULL AND "activePaymentId" = "paymentId"
          AND (
            ("status" = 'FAILED' AND COALESCE("failureCode", '') = 'STRIPE_REFUND_FAILED_AFTER_SUCCESS')
            OR ("status" = 'REVIEW' AND COALESCE("failureCode", '') = 'LATE_REFUND_FAILURE_REVIEW')
          )
        )
      )
    )
  );
