-- Preview QA21 ALT only. Canonical Stripe read confirmed re_3UT2C5LAzgkvCvrI0RqwMRET
-- failed (expired_or_canceled_card), one refund, charge refunded=0, livemode=false.
-- This seeds the prerequisite app instruction; it does not claim to test refund submission.
-- Payment capture was real sandbox Checkout/worker execution. Transporter confirmation was simulated.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';
DO $test$
BEGIN
  PERFORM id FROM public."Booking" WHERE id='cmvibep670001jn08afdvank7' FOR UPDATE;
  IF NOT EXISTS (
    SELECT 1 FROM public."BookingPayment" p JOIN public."Booking" b ON b.id=p."bookingId"
    JOIN public."AvailabilityRequest" a ON a."bookingId"=b.id
    WHERE p.id='cmvibep670002jn088ghnin68' AND b."jobId"='dd_alt_20261021_e2e_job'
      AND a.id='dd_alt_20261021_e2e_request' AND a.status='BOOKED' AND a."paymentState"='CAPTURED'
      AND a."paymentEnvironment"='preview' AND a."authorisedAmountPence"=110
      AND p.provider='STRIPE' AND p."providerReference"='pi_3UT2C5LAzgkvCvrI0p5SMs1I'
      AND p.status='PAID' AND p."payoutStatus"='HELD' AND p."paidPence"=110
      AND p."refundedPence"=0 AND p."platformFeePence"=10 AND p."transporterProceedsPence"=100
      AND (a."paymentIntentId" IS NULL OR a."paymentIntentId"=p."providerReference")
      AND NOT EXISTS (SELECT 1 FROM public."StripeRefund" r WHERE r."paymentId"=p.id)
      AND NOT EXISTS (SELECT 1 FROM public."StripePayout" s WHERE s."paymentId"=p.id)
      AND NOT EXISTS (SELECT 1 FROM public."AlternativeRefund" x WHERE x."paymentId"=p.id)
  ) THEN RAISE EXCEPTION 'Disposable case differs from verified state'; END IF;
  UPDATE public."AvailabilityRequest" SET "paymentIntentId"='pi_3UT2C5LAzgkvCvrI0p5SMs1I',"updatedAt"=NOW()
    WHERE id='dd_alt_20261021_e2e_request';
  INSERT INTO public."StripeRefund"
  SELECT (jsonb_populate_record(NULL::public."StripeRefund",to_jsonb(r)||jsonb_build_object(
    'id','44deb701-fbe6-4064-9da9-6edffe1020ab','paymentId','cmvibep670002jn088ghnin68',
    'activePaymentId','cmvibep670002jn088ghnin68','environment','preview',
    'paymentIntentId','pi_3UT2C5LAzgkvCvrI0p5SMs1I','sourceChargeId','ch_3UT2C5LAzgkvCvrI0TqXZnfs',
    'paidPence',110,'amountPence',110,'priorRefundedPence',0,'priorPlatformFeePence',10,
    'priorProceedsPence',100,'priorDeductionPence',0,'priorPayoutStatus','NOT_READY',
    'platformFeePence',0,'transporterProceedsPence',0,'cancellationDeductionPence',0,
    'fineRestorePence',0,'payoutId',NULL,'stripeTransferId',NULL,'requiredReversedPence',0,
    'baselineReversedPence',0,'recoveryAmountPence',0,'status','FAILED','recoveryStatus','NOT_REQUIRED',
    'stripeRefundId','re_3UT2C5LAzgkvCvrI0RqwMRET','stripeReversalId',NULL,'ledgerAppliedAt',NULL,
    'firstAttemptAt',to_timestamp(1792599496),'recoveryFirstAttemptAt',NULL,'attemptCount',1,
    'leaseUntil',NULL,'leaseToken',NULL,'retryAfter',NULL,'failureCode','STRIPE_REFUND_FAILED',
    'recoveryFailureCode',NULL,'disputeId',NULL,'resolution',NULL,
    'resolutionNote','QA21 ALT test prerequisite seeded from canonical failed sandbox refund; no real repayment.',
    'createdAt',to_timestamp(1792599496),'updatedAt',NOW()))).*
  FROM public."StripeRefund" r JOIN public."User" u ON u.id=r."actorId"
  WHERE r.id='983a6c2d-474b-47bf-b564-8f10559cd308' AND u.role='ADMIN' AND u."accountStatus"='ACTIVE';
  IF NOT FOUND THEN RAISE EXCEPTION 'Active synthetic source administrator not found'; END IF;
END;
$test$;
SELECT r.id,r.status,r."failureCode",r."activePaymentId",r."amountPence",p.status AS payment_status,
  p."refundedPence",p."payoutStatus" FROM public."StripeRefund" r JOIN public."BookingPayment" p ON p.id=r."paymentId"
  WHERE r.id='44deb701-fbe6-4064-9da9-6edffe1020ab';
COMMIT;
