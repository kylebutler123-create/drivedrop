-- Preview-only rollback test. Clones only the retained synthetic scenario into
-- explicitly disposable IDs inside this transaction. No original row is updated,
-- no notification is inserted, no Stripe API is called, and nothing is committed.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '20s';
DO $$
DECLARE
  source_id text := 'cmvh5nyop0001l507711bxm28';
  job_id text := 'dd_alt_schema_rollback_job';
  quote_id text := 'dd_alt_schema_rollback_quote';
  booking_id text := 'dd_alt_schema_rollback_booking';
  payment_id text := 'dd_alt_schema_rollback_payment';
  refund_id text := '10000000-0000-4000-8000-000000000001';
  alt_id text := '10000000-0000-4000-8000-000000000002';
  actor_id text;
  original_refund jsonb;
  record public."AlternativeRefund"%ROWTYPE;
  passed text[] := ARRAY[]::text[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public."BookingPayment" p JOIN public."StripeRefund" r ON r."paymentId"=p.id
    WHERE p."bookingId"=source_id AND p."paidPence"=11000 AND p."refundedPence"=0 AND p."payoutStatus"='HELD'
      AND r.environment='preview' AND r.status='FAILED' AND r."failureCode"='STRIPE_REFUND_FAILED_AFTER_SUCCESS') THEN
    RAISE EXCEPTION 'Expected preserved synthetic preview fixture is not in its reviewed state';
  END IF;
  SELECT r."actorId" INTO actor_id FROM public."StripeRefund" r JOIN public."BookingPayment" p ON p.id=r."paymentId" WHERE p."bookingId"=source_id;
  INSERT INTO public."TransportJob" SELECT (jsonb_populate_record(NULL::public."TransportJob",to_jsonb(j)||jsonb_build_object('id',job_id))).*
    FROM public."TransportJob" j JOIN public."Booking" b ON b."jobId"=j.id WHERE b.id=source_id;
  INSERT INTO public."Quote" SELECT (jsonb_populate_record(NULL::public."Quote",to_jsonb(q)||jsonb_build_object('id',quote_id,'jobId',job_id))).*
    FROM public."Quote" q JOIN public."Booking" b ON b."quoteId"=q.id WHERE b.id=source_id;
  INSERT INTO public."Booking" SELECT (jsonb_populate_record(NULL::public."Booking",to_jsonb(b)||jsonb_build_object('id',booking_id,'jobId',job_id,'quoteId',quote_id))).*
    FROM public."Booking" b WHERE b.id=source_id;
  INSERT INTO public."BookingPayment" SELECT (jsonb_populate_record(NULL::public."BookingPayment",to_jsonb(p)||jsonb_build_object('id',payment_id,'bookingId',booking_id,'providerReference','pi_alt_schema_rollback'))).*
    FROM public."BookingPayment" p WHERE p."bookingId"=source_id;
  INSERT INTO public."StripeRefund" SELECT (jsonb_populate_record(NULL::public."StripeRefund",to_jsonb(r)||jsonb_build_object('id',refund_id,'paymentId',payment_id,'activePaymentId',payment_id,'paymentIntentId','pi_alt_schema_rollback','sourceChargeId','ch_alt_schema_rollback','stripeRefundId','re_alt_schema_rollback'))).*
    FROM public."StripeRefund" r JOIN public."BookingPayment" p ON p.id=r."paymentId" WHERE p."bookingId"=source_id;
  SELECT to_jsonb(r) - 'activePaymentId' - 'updatedAt' INTO original_refund FROM public."StripeRefund" r WHERE id=refund_id;
  BEGIN
    UPDATE public."StripeRefund" SET "activePaymentId"=NULL WHERE id=refund_id;
    RAISE EXCEPTION 'FAIL reservation was released without settlement';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Failed refund requires%' THEN RAISE; END IF;
    passed := array_append(passed,'unsettled reservation release rejected');
  END;
  SELECT * INTO record FROM jsonb_populate_record(NULL::public."AlternativeRefund",jsonb_build_object(
    'id',alt_id,'paymentId',payment_id,'failedRefundId',refund_id,'actorId',actor_id,'environment','preview',
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
