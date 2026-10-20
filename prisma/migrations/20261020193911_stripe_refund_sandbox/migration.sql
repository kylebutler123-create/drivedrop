-- Durable sandbox-only customer refund instructions. Client roles have no access.
CREATE TABLE public."StripeRefund" (
 "id" TEXT PRIMARY KEY,
 "paymentId" TEXT NOT NULL REFERENCES public."BookingPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "activePaymentId" TEXT UNIQUE,
 "environment" TEXT NOT NULL,
 "paymentIntentId" TEXT NOT NULL,
 "sourceChargeId" TEXT NOT NULL,
 "paidPence" INTEGER NOT NULL,
 "amountPence" INTEGER NOT NULL,
 "priorRefundedPence" INTEGER NOT NULL,
 "priorPlatformFeePence" INTEGER NOT NULL,
 "priorProceedsPence" INTEGER NOT NULL,
 "priorDeductionPence" INTEGER NOT NULL,
 "priorPayoutStatus" TEXT NOT NULL,
 "platformFeePence" INTEGER NOT NULL,
 "transporterProceedsPence" INTEGER NOT NULL,
 "cancellationDeductionPence" INTEGER NOT NULL,
 "fineRestorePence" INTEGER NOT NULL,
 "payoutId" TEXT,
 "stripeTransferId" TEXT,
 "requiredReversedPence" INTEGER NOT NULL,
 "baselineReversedPence" INTEGER NOT NULL,
 "recoveryAmountPence" INTEGER NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING',
 "recoveryStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
 "stripeRefundId" TEXT UNIQUE,
 "stripeReversalId" TEXT UNIQUE,
 "ledgerAppliedAt" TIMESTAMP(3),
 "firstAttemptAt" TIMESTAMP(3),
 "recoveryFirstAttemptAt" TIMESTAMP(3),
 "attemptCount" INTEGER NOT NULL DEFAULT 0,
 "leaseUntil" TIMESTAMP(3),
 "leaseToken" TEXT,
 "retryAfter" TIMESTAMP(3),
 "failureCode" TEXT,
 "recoveryFailureCode" TEXT,
 "actorId" TEXT NOT NULL,
 "disputeId" TEXT REFERENCES public."Dispute"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "resolution" TEXT,
 "resolutionNote" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "StripeRefund_environment_check" CHECK ("environment" IN ('preview','development')),
 CONSTRAINT "StripeRefund_active_check" CHECK ("activePaymentId" IS NULL OR "activePaymentId"="paymentId"),
 CONSTRAINT "StripeRefund_status_check" CHECK ("status" IN ('PENDING','RETRY','PENDING_STRIPE','SUCCEEDED','FAILED','REVIEW')),
 CONSTRAINT "StripeRefund_recovery_check" CHECK ("recoveryStatus" IN ('NOT_REQUIRED','PENDING','RETRY','RECOVERED','REVIEW')),
 CONSTRAINT "StripeRefund_amounts_check" CHECK (
  "amountPence">0 AND "paidPence">0 AND "priorRefundedPence">=0 AND "priorRefundedPence"<= "paidPence"-"amountPence" AND
  "priorPlatformFeePence">=0 AND "priorProceedsPence">=0 AND "priorDeductionPence">=0 AND
  "platformFeePence">=0 AND "transporterProceedsPence">=0 AND "cancellationDeductionPence">=0 AND "fineRestorePence">=0 AND
  "requiredReversedPence">=0 AND "baselineReversedPence">=0 AND "recoveryAmountPence">=0 AND "attemptCount">=0 AND
  "priorPlatformFeePence"::bigint+"priorProceedsPence"+"priorDeductionPence"="paidPence"-"priorRefundedPence" AND
  "platformFeePence"::bigint+"transporterProceedsPence"+"cancellationDeductionPence"="paidPence"-"priorRefundedPence"-"amountPence" AND
  "fineRestorePence"::bigint+"cancellationDeductionPence"="priorDeductionPence" AND
  "recoveryAmountPence"=GREATEST(0,"requiredReversedPence"-"baselineReversedPence")
 ),
 CONSTRAINT "StripeRefund_success_check" CHECK (("status"='SUCCEEDED')=("ledgerAppliedAt" IS NOT NULL) AND ("ledgerAppliedAt" IS NULL OR "stripeRefundId" IS NOT NULL)),
 CONSTRAINT "StripeRefund_resolution_check" CHECK (("disputeId" IS NULL AND "resolution" IS NULL) OR ("disputeId" IS NOT NULL AND "resolution" IS NOT NULL AND "resolutionNote" IS NOT NULL AND "resolution" IN ('REFUND_CUSTOMER','PARTIAL_REFUND') AND length(trim("resolutionNote"))>0))
);
CREATE UNIQUE INDEX "StripeRefund_paymentId_priorRefundedPence_key" ON public."StripeRefund"("paymentId","priorRefundedPence");
CREATE INDEX "StripeRefund_environment_status_retryAfter_idx" ON public."StripeRefund"("environment","status","retryAfter");
CREATE INDEX "StripeRefund_environment_recoveryStatus_retryAfter_idx" ON public."StripeRefund"("environment","recoveryStatus","retryAfter");
CREATE INDEX "StripeRefund_disputeId_idx" ON public."StripeRefund"("disputeId");
CREATE INDEX "StripeRefund_sourceChargeId_environment_idx" ON public."StripeRefund"("sourceChargeId","environment");
ALTER TABLE public."StripeRefund" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."StripeRefund" FROM PUBLIC, anon, authenticated;
COMMENT ON TABLE public."StripeRefund" IS 'Server-only sandbox refund and transfer recovery instructions. No client policies. Activation requires STRIPE_REFUNDS_ENABLED and sandbox account verification.';
