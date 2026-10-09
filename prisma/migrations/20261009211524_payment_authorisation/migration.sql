-- Additive only: earlier requests remain readable and must be re-authorised explicitly.
ALTER TABLE "AvailabilityRequest"
 ADD COLUMN "paymentProvider" TEXT,
 ADD COLUMN "paymentState" TEXT,
 ADD COLUMN "checkoutSessionId" TEXT,
 ADD COLUMN "paymentIntentId" TEXT,
 ADD COLUMN "authorisedAmountPence" INTEGER,
 ADD COLUMN "authorisationExpiresAt" TIMESTAMP(3),
 ADD COLUMN "paymentEnvironment" TEXT;
CREATE UNIQUE INDEX "AvailabilityRequest_checkoutSessionId_key" ON "AvailabilityRequest"("checkoutSessionId");
CREATE UNIQUE INDEX "AvailabilityRequest_paymentIntentId_key" ON "AvailabilityRequest"("paymentIntentId");
ALTER TABLE "AvailabilityRequest" DROP CONSTRAINT "AvailabilityRequest_status_check",
 DROP CONSTRAINT "AvailabilityRequest_active_check",
 DROP CONSTRAINT "AvailabilityRequest_confirmed_check";
ALTER TABLE "AvailabilityRequest" ADD CONSTRAINT "AvailabilityRequest_status_check"
 CHECK ("status" IN ('AWAITING_AUTHORISATION','AWAITING_TRANSPORTER','AWAITING_PAYMENT','CAPTURING','PAYMENT_FAILED','DECLINED','WITHDRAWN','EXPIRED','BOOKED'));
ALTER TABLE "AvailabilityRequest" ADD CONSTRAINT "AvailabilityRequest_active_check"
 CHECK (("status" IN ('AWAITING_AUTHORISATION','AWAITING_TRANSPORTER','AWAITING_PAYMENT','CAPTURING') AND "activeJobId"="jobId" AND "activeJobId" IS NOT NULL)
 OR ("status" NOT IN ('AWAITING_AUTHORISATION','AWAITING_TRANSPORTER','AWAITING_PAYMENT','CAPTURING') AND "activeJobId" IS NULL));
ALTER TABLE "AvailabilityRequest" ADD CONSTRAINT "AvailabilityRequest_confirmed_check"
 CHECK ("status" NOT IN ('AWAITING_PAYMENT','CAPTURING','BOOKED') OR ("confirmedAt" IS NOT NULL AND ("paymentProvider" IS NOT NULL OR "payBy" IS NOT NULL)));
ALTER TABLE "AvailabilityRequest" ADD CONSTRAINT "AvailabilityRequest_authorised_amount_check"
 CHECK ("authorisedAmountPence" IS NULL OR "authorisedAmountPence">="pricePence");
