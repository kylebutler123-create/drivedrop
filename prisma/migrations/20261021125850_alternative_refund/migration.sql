-- Additive preview-only repayment audit. No existing row is rewritten.
CREATE TABLE public."AlternativeRefund" (
  "id" TEXT PRIMARY KEY,
  "paymentId" TEXT NOT NULL UNIQUE REFERENCES public."BookingPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "failedRefundId" TEXT NOT NULL UNIQUE REFERENCES public."StripeRefund"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "actorId" TEXT NOT NULL REFERENCES public."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "environment" TEXT NOT NULL CHECK ("environment" IN ('preview', 'development')),
  "amountPence" INTEGER NOT NULL CHECK ("amountPence" > 0),
  "stripeRefundedPence" INTEGER NOT NULL CHECK ("stripeRefundedPence" = 0),
  "method" TEXT NOT NULL CHECK ("method" IN ('BANK_TRANSFER', 'CHEQUE', 'OTHER')),
  "reference" TEXT NOT NULL CHECK (length("reference") BETWEEN 3 AND 120),
  "referenceHash" TEXT NOT NULL CHECK ("referenceHash" ~ '^[0-9a-f]{64}$'),
  "settledOn" DATE NOT NULL,
  "note" TEXT NOT NULL CHECK (length("note") <= 1000),
  "requestHash" TEXT NOT NULL CHECK ("requestHash" ~ '^[0-9a-f]{64}$'),
  "evidenceName" TEXT NOT NULL CHECK (length("evidenceName") BETWEEN 1 AND 120),
  "evidenceType" TEXT NOT NULL CHECK ("evidenceType" IN ('application/pdf', 'image/jpeg', 'image/png')),
  "evidenceSha256" TEXT NOT NULL CHECK ("evidenceSha256" ~ '^[0-9a-f]{64}$'),
  "evidenceBytes" BYTEA NOT NULL CHECK (octet_length("evidenceBytes") BETWEEN 1 AND 3145728),
  "canonicalCheckedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("environment", "referenceHash"),
  UNIQUE ("environment", "evidenceSha256")
);
CREATE INDEX "AlternativeRefund_actorId_idx" ON public."AlternativeRefund"("actorId");
ALTER TABLE public."AlternativeRefund" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."AlternativeRefund" FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.drivedrop_alternative_refund_immutable() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  RAISE EXCEPTION 'Alternative repayment audit records cannot be edited or deleted';
END;
$$;
CREATE TRIGGER "AlternativeRefund_immutable" BEFORE UPDATE OR DELETE ON public."AlternativeRefund"
FOR EACH ROW EXECUTE FUNCTION public.drivedrop_alternative_refund_immutable();

-- Late failed instructions can release their reservation only with a linked,
-- committed alternative settlement. The trigger below provides the cross-table
-- guard that cannot be expressed as a PostgreSQL CHECK subquery.
ALTER TABLE public."StripeRefund" DROP CONSTRAINT "StripeRefund_success_check",
ADD CONSTRAINT "StripeRefund_success_check" CHECK (
  ("ledgerAppliedAt" IS NULL AND "status" <> 'SUCCEEDED' AND COALESCE("failureCode", '') NOT IN ('STRIPE_REFUND_FAILED_AFTER_SUCCESS','LATE_REFUND_FAILURE_REVIEW'))
  OR ("ledgerAppliedAt" IS NOT NULL AND "stripeRefundId" IS NOT NULL AND (
    ("status" = 'SUCCEEDED' AND COALESCE("failureCode", '') NOT IN ('STRIPE_REFUND_FAILED_AFTER_SUCCESS','LATE_REFUND_FAILURE_REVIEW'))
    OR ("status" = 'FAILED' AND COALESCE("failureCode", '') = 'STRIPE_REFUND_FAILED_AFTER_SUCCESS' AND ("activePaymentId" IS NULL OR "activePaymentId" = "paymentId"))
    OR ("status" = 'REVIEW' AND COALESCE("failureCode", '') = 'LATE_REFUND_FAILURE_REVIEW' AND "activePaymentId" IS NOT NULL AND "activePaymentId" = "paymentId")
  ))
);
CREATE FUNCTION public.drivedrop_alternative_refund_reservation() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE settled boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public."AlternativeRefund" a WHERE a."failedRefundId" = NEW.id AND a."paymentId" = NEW."paymentId") INTO settled;
  IF NEW."failureCode" = 'STRIPE_REFUND_FAILED_AFTER_SUCCESS' AND NEW."activePaymentId" IS NULL AND NOT settled THEN
    RAISE EXCEPTION 'Failed refund requires its reservation or an alternative settlement';
  END IF;
  IF settled THEN
    IF TG_OP <> 'UPDATE' OR NEW."activePaymentId" IS NOT NULL OR NEW.status <> 'FAILED'
       OR (to_jsonb(NEW) - 'activePaymentId' - 'updatedAt') IS DISTINCT FROM (to_jsonb(OLD) - 'activePaymentId' - 'updatedAt') THEN
      RAISE EXCEPTION 'Preserve the original failed Stripe refund audit';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "StripeRefund_alternative_reservation" BEFORE INSERT OR UPDATE ON public."StripeRefund"
FOR EACH ROW EXECUTE FUNCTION public.drivedrop_alternative_refund_reservation();

-- Reject stale event handlers that try to overwrite externally settled totals.
-- A new external Stripe inconsistency may still place the cancelled payout on
-- HELD for review; it must never become payable again.
CREATE FUNCTION public.drivedrop_alternative_refund_payment_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE amount integer;
BEGIN
  SELECT a."amountPence" INTO amount FROM public."AlternativeRefund" a WHERE a."paymentId" = NEW.id;
  IF FOUND AND (NEW."paidPence" <> amount OR NEW."refundedPence" <> amount OR NEW.status <> 'REFUNDED'
    OR NEW."platformFeePence" <> 0 OR NEW."transporterProceedsPence" <> 0 OR NEW."cancellationDeductionPence" <> 0
    OR NEW."payoutStatus" NOT IN ('CANCELLED','HELD') OR NEW.provider <> 'STRIPE' OR NEW.currency <> 'GBP'
    OR NEW."providerReference" IS DISTINCT FROM OLD."providerReference" OR NEW."bookingId" <> OLD."bookingId") THEN
    RAISE EXCEPTION 'Alternative repayment totals are immutable and cannot be paid out';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "BookingPayment_alternative_guard" BEFORE UPDATE ON public."BookingPayment"
FOR EACH ROW EXECUTE FUNCTION public.drivedrop_alternative_refund_payment_guard();

-- At commit, record, completed ledger, reservation release and once-only event
-- must agree. An interrupted transaction cannot leave evidence without settlement.
CREATE FUNCTION public.drivedrop_alternative_refund_complete() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public."BookingPayment" p JOIN public."StripeRefund" r ON r.id = NEW."failedRefundId"
    JOIN public."User" u ON u.id = NEW."actorId"
    WHERE p.id = NEW."paymentId" AND r."paymentId" = p.id AND r.environment = NEW.environment
      AND u.role = 'ADMIN' AND u."accountStatus" = 'ACTIVE'
      AND p.provider = 'STRIPE' AND p.currency = 'GBP' AND p.status = 'REFUNDED' AND p."payoutStatus" = 'CANCELLED'
      AND p."paidPence" = NEW."amountPence" AND p."refundedPence" = NEW."amountPence"
      AND p."platformFeePence" = 0 AND p."transporterProceedsPence" = 0 AND p."cancellationDeductionPence" = 0
      AND r.status = 'FAILED' AND r."stripeRefundId" IS NOT NULL AND r."activePaymentId" IS NULL
      AND r."failureCode" IN ('STRIPE_REFUND_FAILED','STRIPE_REFUND_FAILED_AFTER_SUCCESS')
      AND r."recoveryStatus" = 'NOT_REQUIRED' AND r."recoveryAmountPence" = 0 AND r."priorRefundedPence" = 0
      AND r."amountPence" = NEW."amountPence" AND r."paidPence" = NEW."amountPence"
      AND r."priorPayoutStatus" IN ('READY','NOT_READY') AND r."priorDeductionPence" = 0 AND r."fineRestorePence" = 0
      AND r."payoutId" IS NULL AND r."stripeTransferId" IS NULL AND r."disputeId" IS NULL
      AND r."leaseToken" IS NULL AND r."leaseUntil" IS NULL AND r."retryAfter" IS NULL
      AND NEW."settledOn" BETWEEN r."createdAt"::date AND CURRENT_DATE
      AND NOT EXISTS (SELECT 1 FROM public."StripePayout" s WHERE s."paymentId" = p.id)
      AND NOT EXISTS (SELECT 1 FROM public."StripeRefund" s WHERE s."paymentId" = p.id AND s.id <> r.id)
      AND NOT EXISTS (SELECT 1 FROM public."Dispute" d WHERE d."bookingId" = p."bookingId")
      AND EXISTS (SELECT 1 FROM public."FinanceEvent" e WHERE e.id = 'alternative-refund-' || NEW.id AND e."paymentId" = p.id
        AND e.type = 'REFUND_CREATED' AND e."amountPence" = NEW."amountPence" AND e."actorId" = NEW."actorId")
  ) THEN RAISE EXCEPTION 'Alternative repayment must commit with its complete ledger and failed-refund audit'; END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER "AlternativeRefund_complete" AFTER INSERT ON public."AlternativeRefund"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.drivedrop_alternative_refund_complete();
REVOKE ALL ON FUNCTION public.drivedrop_alternative_refund_immutable(), public.drivedrop_alternative_refund_reservation(),
  public.drivedrop_alternative_refund_payment_guard(), public.drivedrop_alternative_refund_complete() FROM PUBLIC, anon, authenticated;
