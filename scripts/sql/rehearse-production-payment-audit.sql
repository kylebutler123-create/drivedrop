-- LOCAL REHEARSAL ONLY, called by scripts/rehearse-production-database.cjs.
-- Fresh synthetic IDs, no hosted/retained fixture dependency. Every row rolls back.
BEGIN;
INSERT INTO public."User" (id,email,name,role,"passwordHash") VALUES
 ('local-admin','admin@example.invalid','Synthetic Admin','ADMIN','unused'),
 ('local-customer','customer@example.invalid','Synthetic Customer','CUSTOMER','unused'),
 ('local-transporter','transporter@example.invalid','Synthetic Transporter','TRANSPORTER','unused');
INSERT INTO public."TransportJob" (id,"customerId",collection,delivery,"vehicleMake","vehicleModel","collectionDate")
 VALUES ('local-job','local-customer','Synthetic A','Synthetic B','Test','Test',CURRENT_TIMESTAMP);
INSERT INTO public."Quote" (id,"jobId","transporterId","pricePence") VALUES ('local-quote','local-job','local-transporter',10000);
INSERT INTO public."Booking" (id,"jobId","quoteId","customerId","transporterId","agreedPricePence")
 VALUES ('local-booking','local-job','local-quote','local-customer','local-transporter',10000);
INSERT INTO public."BookingPayment" (id,"bookingId","transportValuePence","depositPence","platformFeePence","transporterProceedsPence","remainingBalancePence","paidPence",status,"payoutStatus",provider,"providerReference")
 VALUES ('local-payment','local-booking',10000,11000,1000,10000,0,11000,'PAID','HELD','STRIPE','pi_local_fixture');
INSERT INTO public."StripeRefund" (id,"paymentId","activePaymentId",environment,"paymentIntentId","sourceChargeId","paidPence","amountPence","priorRefundedPence","priorPlatformFeePence","priorProceedsPence","priorDeductionPence","priorPayoutStatus","platformFeePence","transporterProceedsPence","cancellationDeductionPence","fineRestorePence","requiredReversedPence","baselineReversedPence","recoveryAmountPence",status,"stripeRefundId","ledgerAppliedAt","failureCode","actorId","updatedAt")
 VALUES ('local-refund','local-payment','local-payment','production','pi_local_fixture','ch_local_fixture',11000,11000,0,1000,10000,0,'READY',0,0,0,0,0,0,0,'FAILED','re_local_fixture',CURRENT_TIMESTAMP,'STRIPE_REFUND_FAILED_AFTER_SUCCESS','local-admin',CURRENT_TIMESTAMP);
DO $$
DECLARE
 payment_id text := 'local-payment';
 refund_id text := 'local-refund';
 alt_id text := 'local-alternative';
 actor_id text := 'local-admin';
 original_refund jsonb;
 record public."AlternativeRefund"%ROWTYPE;
 passed text[] := ARRAY[]::text[];
BEGIN
  SELECT to_jsonb(r) - 'activePaymentId' - 'updatedAt' INTO original_refund FROM public."StripeRefund" r WHERE id=refund_id;
  BEGIN
    UPDATE public."StripeRefund" SET "activePaymentId"=NULL WHERE id=refund_id;
    RAISE EXCEPTION 'FAIL reservation was released without settlement';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Failed refund requires%' THEN RAISE; END IF;
    passed := array_append(passed,'unsettled reservation release rejected');
  END;
  SELECT * INTO record FROM jsonb_populate_record(NULL::public."AlternativeRefund",jsonb_build_object(
    'id',alt_id,'paymentId',payment_id,'failedRefundId',refund_id,'actorId',actor_id,'environment','production',
    'amountPence',11000,'stripeRefundedPence',0,'method','BANK_TRANSFER','reference','ROLLBACK-SYNTHETIC-NO-PAYMENT',
    'referenceHash',repeat('a',64),'settledOn',CURRENT_DATE,'note','Schema test only. No money sent.',
    'requestHash',repeat('b',64),'evidenceName','synthetic.pdf','evidenceType','application/pdf',
    'evidenceSha256',repeat('c',64),'evidenceBytes',convert_to('%PDF-1.7 SYNTHETIC SCHEMA TEST ONLY','UTF8'),
    'canonicalCheckedAt',CURRENT_TIMESTAMP,'createdAt',CURRENT_TIMESTAMP));
  BEGIN
    INSERT INTO public."AlternativeRefund" SELECT record.*;
    SET CONSTRAINTS "AlternativeRefund_complete" IMMEDIATE;
    RAISE EXCEPTION 'FAIL incomplete ledger was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Alternative repayment must commit%' THEN RAISE; END IF;
    passed := array_append(passed,'incomplete evidence-only transaction rejected');
  END;
  INSERT INTO public."AlternativeRefund" SELECT record.*;
  BEGIN
    UPDATE public."BookingPayment" SET "refundedPence"=5500 WHERE id=payment_id;
    RAISE EXCEPTION 'FAIL partial settlement accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Alternative repayment totals%' THEN RAISE; END IF;
    passed := array_append(passed,'partial settlement rejected');
  END;
  UPDATE public."BookingPayment" SET "refundedPence"=11000,"platformFeePence"=0,"transporterProceedsPence"=0,status='REFUNDED',"payoutStatus"='CANCELLED' WHERE id=payment_id;
  UPDATE public."StripeRefund" SET "activePaymentId"=NULL WHERE id=refund_id;
  INSERT INTO public."FinanceEvent" (id,"paymentId",type,"amountPence","actorId",note)
    VALUES ('alternative-refund-'||alt_id,payment_id,'REFUND_CREATED',11000,actor_id,'ALTERNATIVE_REFUND_RECORDED:'||alt_id||':'||refund_id);
  SET CONSTRAINTS "AlternativeRefund_complete" IMMEDIATE;
  passed := array_append(passed,'complete atomic ledger and reservation release accepted');
  IF original_refund IS DISTINCT FROM (SELECT to_jsonb(r) - 'activePaymentId' - 'updatedAt' FROM public."StripeRefund" r WHERE id=refund_id) THEN RAISE EXCEPTION 'FAIL failed refund audit changed'; END IF;
  passed := array_append(passed,'original failed audit fields preserved');
  BEGIN
    UPDATE public."AlternativeRefund" SET note='changed' WHERE id=alt_id;
    RAISE EXCEPTION 'FAIL mutable audit';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Alternative repayment audit records%' THEN RAISE; END IF;
    passed := array_append(passed,'audit update rejected');
  END;
  BEGIN
    DELETE FROM public."AlternativeRefund" WHERE id=alt_id;
    RAISE EXCEPTION 'FAIL deletable audit';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Alternative repayment audit records%' THEN RAISE; END IF;
    passed := array_append(passed,'audit deletion rejected');
  END;
  BEGIN
    UPDATE public."BookingPayment" SET "payoutStatus"='READY' WHERE id=payment_id;
    RAISE EXCEPTION 'FAIL payout released';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Alternative repayment totals%' THEN RAISE; END IF;
    passed := array_append(passed,'payout release rejected');
  END;
  BEGIN
    UPDATE public."StripeRefund" SET status='SUCCEEDED',"failureCode"=NULL WHERE id=refund_id;
    RAISE EXCEPTION 'FAIL failed history relabelled';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Preserve the original failed%' THEN RAISE; END IF;
    passed := array_append(passed,'failed Stripe history cannot be relabelled');
  END;
  BEGIN
    INSERT INTO public."AlternativeRefund" SELECT record.*;
    RAISE EXCEPTION 'FAIL duplicate accepted';
  EXCEPTION WHEN unique_violation THEN passed := array_append(passed,'duplicate record rejected'); END;
  UPDATE public."BookingPayment" SET "payoutStatus"='HELD' WHERE id=payment_id;
  passed := array_append(passed,'later external inconsistency may hold without changing totals');
  PERFORM set_config('drivedrop.alternative_refund_test_report',to_json(passed)::text,true);
END;
$$;
SELECT current_setting('drivedrop.alternative_refund_test_report')::jsonb AS passed;
ROLLBACK;
