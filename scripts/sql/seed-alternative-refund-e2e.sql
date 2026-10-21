-- QA21 ALT: new preview-only sandbox fixture for the approved alternative repayment test.
-- Only transporter confirmation is simulated here. Stripe Checkout and the existing
-- worker perform the actual sandbox authorisation/capture. Original rows are read only.
-- Successful alternative recording later creates an immutable audit and is retained.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '20s';
DO $test$
DECLARE
  baseline jsonb := '[{"table_name":"AvailabilityRequest","rows":11,"fingerprint":"deb316efa28e2a280b16bd107028f684"},{"table_name":"Booking","rows":53,"fingerprint":"ac052436e169e638a2e46d1d4e129602"},{"table_name":"BookingPayment","rows":53,"fingerprint":"eca61d5fd380e7a3fe7fc05ad2a75751"},{"table_name":"ConversationInboxState","rows":2,"fingerprint":"d7b5330da85491b53ad52489f4e4a595"},{"table_name":"Dispute","rows":20,"fingerprint":"0ff368d1cae8a3deb1fa1ea1161398ff"},{"table_name":"DisputeReviewNote","rows":0,"fingerprint":"d41d8cd98f00b204e9800998ecf8427e"},{"table_name":"EmailChangeToken","rows":2,"fingerprint":"fd6b965260e3bf298d619a115500dac6"},{"table_name":"Evidence","rows":98,"fingerprint":"c0730557265680c92412c8dc5190f883"},{"table_name":"FinanceEvent","rows":138,"fingerprint":"a04711c23ace45cb779af248cda79338"},{"table_name":"JobDigestRun","rows":0,"fingerprint":"d41d8cd98f00b204e9800998ecf8427e"},{"table_name":"Message","rows":32,"fingerprint":"95396d4e224c163fae4a659dd779edd1"},{"table_name":"MessageAttachment","rows":5,"fingerprint":"6a5c68e5cac005908299320ea96ab2c3"},{"table_name":"Notification","rows":405,"fingerprint":"c281cef8290e2cd8dce21695129f43f7"},{"table_name":"PasswordResetToken","rows":1,"fingerprint":"dd28ab764c541d4970fe82ab370a6ac7"},{"table_name":"Quote","rows":67,"fingerprint":"b5d06acd6d4252a04eca77e8d3222113"},{"table_name":"Review","rows":8,"fingerprint":"bf3868f7b6cab1c199c1d4cbdb73bcf4"},{"table_name":"Session","rows":1,"fingerprint":"9bac1b51790dd1ffdae9130d3a3f5219"},{"table_name":"storage.objects","rows":136,"fingerprint":"ebbe346597d33536e580807e5b9ccf1a"},{"table_name":"StripeConnectAccount","rows":1,"fingerprint":"78c5aad61ade8d9d18dfca8065a11ffc"},{"table_name":"StripePayout","rows":0,"fingerprint":"d41d8cd98f00b204e9800998ecf8427e"},{"table_name":"StripeRefund","rows":1,"fingerprint":"2ddc047f1bd30054dbbc637bf6fd3608"},{"table_name":"SupportConversation","rows":4,"fingerprint":"d5e6c030a2cde120711fa69b35705483"},{"table_name":"SupportMessage","rows":4,"fingerprint":"665e0a27aa3b05db729fc587a5a21ab6"},{"table_name":"TrackingEvent","rows":128,"fingerprint":"f257d3effd6b092b2769eab6e5ecd47f"},{"table_name":"TransporterCancellationDeduction","rows":4,"fingerprint":"f6cde087373395027c29a1ecfe9caa74"},{"table_name":"TransporterCancellationFee","rows":8,"fingerprint":"113901cc29d01cf4953ce85120c5d67d"},{"table_name":"TransporterPayoutDetails","rows":1,"fingerprint":"0a82c147ab5f6401b88469e6a62a527e"},{"table_name":"TransporterVerification","rows":9,"fingerprint":"b2b4e2c715313da99f2be2f0e2984e2c"},{"table_name":"TransportJob","rows":77,"fingerprint":"b9b91ae74680f806c8dacc9818b4d59d"},{"table_name":"User","rows":19,"fingerprint":"34a586e358ea1e5b3df5ddd83f619dd5"},{"table_name":"VerificationDocument","rows":23,"fingerprint":"1eb8b4a04b2a2bd88a4a7f0da31ed90e"}]'::jsonb;
  expected jsonb;
  actual_rows integer;
  actual_fingerprint text;
  relation_name text;
  source_booking text := 'cmvh5nyop0001l507711bxm28';
  job_id text := 'dd_alt_20261021_e2e_job';
  quote_id text := 'dd_alt_20261021_e2e_quote';
  request_id text := 'dd_alt_20261021_e2e_request';
  omitted_id text;
  pass integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public."TransportJob" WHERE id=job_id OR registration='QA21 ALT')
     OR EXISTS (SELECT 1 FROM public."Quote" WHERE id=quote_id)
     OR EXISTS (SELECT 1 FROM public."AvailabilityRequest" WHERE id=request_id)
     OR EXISTS (SELECT 1 FROM public."AlternativeRefund") THEN
    RAISE EXCEPTION 'Unexpected prior alternative test state; do not rerun';
  END IF;
  FOR pass IN 1..2 LOOP
    IF pass=2 THEN
      INSERT INTO public."TransportJob"
      SELECT (jsonb_populate_record(NULL::public."TransportJob",to_jsonb(j)||jsonb_build_object(
        'id',job_id,'vehicleMake','Sandbox QA','vehicleModel','Alternative repayment TEST ONLY',
        'registration','QA21 ALT','status','QUOTED','createdAt',NOW(),
        'collectionDate',CURRENT_DATE+INTERVAL '2 days','vehiclePhotoPath',NULL))).*
      FROM public."TransportJob" j JOIN public."Booking" b ON b."jobId"=j.id WHERE b.id=source_booking;
      INSERT INTO public."Quote"
      SELECT (jsonb_populate_record(NULL::public."Quote",to_jsonb(q)||jsonb_build_object(
        'id',quote_id,'jobId',job_id,'pricePence',100,'status','PENDING','createdAt',NOW(),
        'expiresAt',NOW()+INTERVAL '1 day','message','Sandbox QA21 ALT only; no real delivery.'))).*
      FROM public."Quote" q JOIN public."Booking" b ON b."quoteId"=q.id WHERE b.id=source_booking;
      INSERT INTO public."AvailabilityRequest"
      SELECT (jsonb_populate_record(NULL::public."AvailabilityRequest",to_jsonb(r)||jsonb_build_object(
        'id',request_id,'jobId',job_id,'quoteId',quote_id,'status','CAPTURING','activeJobId',job_id,
        'pricePence',100,'authorisedAmountPence',110,'collectionDate',CURRENT_DATE+INTERVAL '2 days',
        'respondBy',NOW()+INTERVAL '1 day','confirmedAt',NOW(),'payBy',NULL,'bookingId',NULL,
        'createdAt',NOW(),'updatedAt',NOW(),'paymentProvider','STRIPE','paymentEnvironment','preview',
        'paymentState','CAPTURE_PENDING','checkoutSessionId','cs_test_a1B7Wye2FRwhnNDmnyw4jVLBSPsnlYFRPJSscAONMokT92VZEH0CqNaAoZ','paymentIntentId',NULL,
        'authorisationExpiresAt',NOW()+INTERVAL '2 days'))).*
      FROM public."AvailabilityRequest" r WHERE r."bookingId"=source_booking;
      IF NOT EXISTS (SELECT 1 FROM public."AvailabilityRequest" WHERE id=request_id AND "authorisedAmountPence"=110) THEN
        RAISE EXCEPTION 'Source fixture missing';
      END IF;
    END IF;
    FOR expected IN SELECT value FROM jsonb_array_elements(baseline) LOOP
      relation_name := CASE WHEN expected->>'table_name'='storage.objects' THEN 'storage.objects'
        ELSE format('public.%I',expected->>'table_name') END;
      omitted_id := CASE expected->>'table_name' WHEN 'TransportJob' THEN job_id WHEN 'Quote' THEN quote_id WHEN 'AvailabilityRequest' THEN request_id ELSE NULL END;
      EXECUTE format('SELECT count(*)::int,md5(coalesce(string_agg(to_jsonb(t)::text,''''
        ORDER BY to_jsonb(t)::text),'''')) FROM %s t WHERE ($1 IS NULL OR t.id::text <> $1)',relation_name)
        INTO actual_rows,actual_fingerprint USING omitted_id;
      IF actual_rows<>(expected->>'rows')::integer OR actual_fingerprint<>expected->>'fingerprint' THEN
        RAISE EXCEPTION 'Original data mismatch in % during pass %',expected->>'table_name',pass;
      END IF;
    END LOOP;
  END LOOP;
END;
$test$;
SELECT id,status,"paymentState","pricePence","authorisedAmountPence","paymentEnvironment" FROM public."AvailabilityRequest" WHERE id='dd_alt_20261021_e2e_request';
COMMIT;
