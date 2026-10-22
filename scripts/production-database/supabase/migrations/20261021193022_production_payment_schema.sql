-- PROPOSED, NOT APPLIED. Only for the empty prepared production database.
-- Execute in one transaction (Supabase apply_migration or psql --single-transaction).
-- Never apply to preview. Exact baseline: docs/evidence/production-readiness-comparison.json.
SET LOCAL search_path = public, extensions;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $preflight$
DECLARE actual text; tbl record; occupied boolean;
BEGIN
  IF to_regnamespace('drivedrop_production_ops') IS NOT NULL THEN
    RAISE EXCEPTION 'Production recovery schema already exists; review migration history';
  END IF;
  IF to_regclass('supabase_migrations.schema_migrations') IS NULL THEN
    RAISE EXCEPTION 'Expected prepared production migration history';
  END IF;
  IF (SELECT count(*) FROM supabase_migrations.schema_migrations) <> 1 OR NOT EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261019020729'
      AND name='drivedrop_production_schema_and_storage_baseline'
  ) THEN RAISE EXCEPTION 'Unexpected migration history'; END IF;
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename LOOP
    EXECUTE format('LOCK TABLE public.%I IN ACCESS EXCLUSIVE MODE',tbl.tablename);
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I)',tbl.tablename) INTO occupied;
    IF occupied THEN RAISE EXCEPTION 'Prepared production must still be empty: %',tbl.tablename; END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM auth.users) OR EXISTS (SELECT 1 FROM storage.objects) THEN
    RAISE EXCEPTION 'Prepared production auth/storage must still be empty';
  END IF;
  SELECT check_schema.schema_md5 INTO actual FROM (
SELECT md5((jsonb_build_object('tables', snapshot->'tables','columns', snapshot->'columns','enums', snapshot->'enums','constraints', snapshot->'constraints','indexes', snapshot->'indexes','functions', snapshot->'functions','triggers', snapshot->'triggers','policies', snapshot->'policies','buckets', snapshot->'buckets'))::text) AS schema_md5, snapshot->'counts' AS counts FROM (SELECT jsonb_build_object(
'checked_at', now(),
'version', version(),
'schemas', (SELECT jsonb_agg(nspname ORDER BY nspname) FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname <> 'information_schema'),
'tables', (SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity) ORDER BY c.relname),'[]') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m')),
'columns', (SELECT coalesce(jsonb_agg(jsonb_build_object('table',c.relname,'name',a.attname,'position',a.attnum,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid),'identity',a.attidentity,'generated',a.attgenerated) ORDER BY c.relname,a.attnum),'[]') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE n.nspname='public' AND c.relkind IN ('r','p') AND a.attnum>0 AND NOT a.attisdropped),
'enums', (SELECT coalesce(jsonb_agg(row_to_json(e) ORDER BY e.name),'[]') FROM (SELECT t.typname AS name,array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' GROUP BY t.typname)e),
'constraints', (SELECT coalesce(jsonb_agg(jsonb_build_object('table',c.relname,'name',k.conname,'type',k.contype,'validated',k.convalidated,'definition',pg_get_constraintdef(k.oid,true)) ORDER BY c.relname,k.conname),'[]') FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'),
'indexes', (SELECT coalesce(jsonb_agg(jsonb_build_object('table',c.relname,'name',ic.relname,'definition',pg_get_indexdef(i.indexrelid),'valid',i.indisvalid) ORDER BY c.relname,ic.relname),'[]') FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_class ic ON ic.oid=i.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'),
'functions', (SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),'result',pg_get_function_result(p.oid),'security_definer',p.prosecdef,'definition_md5',md5(pg_get_functiondef(p.oid)),'search_path',(SELECT v FROM unnest(p.proconfig)v WHERE v LIKE 'search_path=%'),'public_execute',EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE'),'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE')) ORDER BY p.proname,p.oid),'[]') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f'),
'triggers', (SELECT coalesce(jsonb_agg(jsonb_build_object('table',c.relname,'name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid,true)) ORDER BY c.relname,t.tgname),'[]') FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal),
'policies', (SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY schemaname,tablename,policyname),'[]') FROM pg_policies p WHERE schemaname IN ('public','storage')),
'client_table_grants', (SELECT coalesce(jsonb_agg(jsonb_build_object('table',c.relname,'role',coalesce(r.rolname,'PUBLIC'),'privilege',a.privilege_type) ORDER BY c.relname,r.rolname,a.privilege_type),'[]') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner)))a LEFT JOIN pg_roles r ON r.oid=a.grantee WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m') AND (a.grantee=0 OR r.rolname IN ('anon','authenticated'))),
'default_grants', (SELECT coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'owner',r.rolname,'object_type',d.defaclobjtype,'acl',d.defaclacl::text) ORDER BY n.nspname,r.rolname,d.defaclobjtype),'[]') FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace JOIN pg_roles r ON r.oid=d.defaclrole WHERE n.nspname='public'),
'extensions', (SELECT jsonb_agg(jsonb_build_object('name',e.extname,'version',e.extversion,'schema',n.nspname) ORDER BY e.extname) FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace),
'buckets', (SELECT jsonb_agg(jsonb_build_object('id',id,'name',name,'public',public,'file_size_limit',file_size_limit,'allowed_mime_types',allowed_mime_types) ORDER BY id) FROM storage.buckets),
'counts', jsonb_build_object('application_users',(SELECT count(*) FROM public."User"),'bookings',(SELECT count(*) FROM public."Booking"),'auth_users',(SELECT count(*) FROM auth.users),'storage_objects',(SELECT count(*) FROM storage.objects)),
'cron_available',to_regclass('cron.job') IS NOT NULL
) AS snapshot) catalog
  ) check_schema;
  IF actual <> 'dbafd834d5aaa168c554d9a62c382b84' THEN RAISE EXCEPTION 'Production schema/buckets differ from reviewed baseline'; END IF;
  IF EXISTS (SELECT 1 FROM pg_tables t CROSS JOIN (VALUES ('anon'),('authenticated')) r(role)
    WHERE t.schemaname='public' AND has_table_privilege(r.role,format('public.%I',t.tablename),'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')) THEN
    RAISE EXCEPTION 'Unexpected client table privileges';
  END IF;
END $preflight$;

-- Derived from prisma/migrations/20261019213129_stripe_connect_sandbox/migration.sql
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PayoutStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "PayoutStatus" ADD VALUE 'FAILED';

-- CreateTable
CREATE TABLE "StripeConnectAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "stripeAccountId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CREATING',
    "transfersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "requirementsDue" BOOLEAN NOT NULL DEFAULT true,
    "creationStartedAt" TIMESTAMP(3),
    "creationEmail" TEXT NOT NULL,
    "creationName" TEXT NOT NULL,
    "lastCheckedAt" TIMESTAMP(3),
    "lastBankPayoutId" TEXT,
    "lastBankPayoutStatus" TEXT,
    "lastBankPayoutCreated" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeConnectAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripePayout" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "connectAccountId" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "destinationAccountId" TEXT NOT NULL,
    "paymentIntentId" TEXT NOT NULL,
    "sourceChargeId" TEXT NOT NULL,
    "grossPence" INTEGER NOT NULL,
    "finePence" INTEGER NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "paidPence" INTEGER NOT NULL,
    "refundedPence" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "stripeTransferId" TEXT,
    "transferredAt" TIMESTAMP(3),
    "reversedPence" INTEGER NOT NULL DEFAULT 0,
    "firstAttemptAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "retryAfter" TIMESTAMP(3),
    "leaseUntil" TIMESTAMP(3),
    "failureCode" TEXT,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripePayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StripeConnectAccount_stripeAccountId_key" ON "StripeConnectAccount"("stripeAccountId");

-- CreateIndex
CREATE INDEX "StripeConnectAccount_environment_lastCheckedAt_idx" ON "StripeConnectAccount"("environment", "lastCheckedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StripeConnectAccount_userId_environment_key" ON "StripeConnectAccount"("userId", "environment");

-- CreateIndex
CREATE UNIQUE INDEX "StripePayout_paymentId_key" ON "StripePayout"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "StripePayout_stripeTransferId_key" ON "StripePayout"("stripeTransferId");

-- CreateIndex
CREATE INDEX "StripePayout_environment_status_retryAfter_idx" ON "StripePayout"("environment", "status", "retryAfter");

-- AddForeignKey
ALTER TABLE "StripeConnectAccount" ADD CONSTRAINT "StripeConnectAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripePayout" ADD CONSTRAINT "StripePayout_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "BookingPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripePayout" ADD CONSTRAINT "StripePayout_connectAccountId_fkey" FOREIGN KEY ("connectAccountId") REFERENCES "StripeConnectAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- These tables are used only by the authenticated application server.
ALTER TABLE "StripeConnectAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StripePayout" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "StripeConnectAccount", "StripePayout" FROM PUBLIC;
DO $security$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "StripeConnectAccount", "StripePayout" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON "StripeConnectAccount", "StripePayout" FROM authenticated;
  END IF;
END $security$;
ALTER TABLE "StripeConnectAccount" ADD CONSTRAINT "StripeConnectAccount_environment_check"
  CHECK ("environment" IN ('production'));
ALTER TABLE "StripePayout" ADD CONSTRAINT "StripePayout_environment_check"
  CHECK ("environment" IN ('production'));
ALTER TABLE "StripePayout" ADD CONSTRAINT "StripePayout_amounts_check"
  CHECK ("grossPence" >= 0 AND "finePence" >= 0 AND "finePence" <= "grossPence"
    AND "amountPence" = "grossPence" - "finePence"
    AND "paidPence" > 0 AND "refundedPence" >= 0 AND "refundedPence" <= "paidPence"
    AND "reversedPence" >= 0 AND "reversedPence" <= "amountPence" AND "attemptCount" >= 0);


-- Derived from prisma/migrations/20261020193911_stripe_refund_sandbox/migration.sql
-- Durable production-only customer refund instructions. Client roles have no access.
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
 CONSTRAINT "StripeRefund_environment_check" CHECK ("environment" IN ('production')),
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
COMMENT ON TABLE public."StripeRefund" IS 'Server-only production refund and transfer recovery instructions. No client policies. Activation requires STRIPE_REFUNDS_ENABLED and live platform account verification.';


-- Derived from prisma/migrations/20261020220726_stripe_refund_late_failure/migration.sql
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


-- Derived from prisma/migrations/20261021125850_alternative_refund/migration.sql
-- Additive production-only repayment audit. No existing row is rewritten.
CREATE TABLE public."AlternativeRefund" (
  "id" TEXT PRIMARY KEY,
  "paymentId" TEXT NOT NULL UNIQUE REFERENCES public."BookingPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "failedRefundId" TEXT NOT NULL UNIQUE REFERENCES public."StripeRefund"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "actorId" TEXT NOT NULL REFERENCES public."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "environment" TEXT NOT NULL CHECK ("environment" IN ('production')),
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


-- Independent lease/run log; no scheduler, HTTP extension or secret is copied.
CREATE SCHEMA drivedrop_production_ops;
REVOKE ALL ON SCHEMA drivedrop_production_ops FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA drivedrop_production_ops TO service_role;
CREATE TABLE drivedrop_production_ops.booking_authorisation_runs (
  id text PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','succeeded','failed','interrupted')),
  checked integer NOT NULL DEFAULT 0 CHECK (checked >= 0),
  failed integer NOT NULL DEFAULT 0 CHECK (failed >= 0),
  CHECK ((status = 'running') = (finished_at IS NULL))
);
CREATE UNIQUE INDEX booking_authorisation_runs_one_active
  ON drivedrop_production_ops.booking_authorisation_runs ((true)) WHERE finished_at IS NULL;
ALTER TABLE drivedrop_production_ops.booking_authorisation_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON drivedrop_production_ops.booking_authorisation_runs FROM PUBLIC, anon, authenticated;
GRANT ALL ON drivedrop_production_ops.booking_authorisation_runs TO service_role;
GRANT ALL ON public."StripeConnectAccount", public."StripePayout", public."StripeRefund", public."AlternativeRefund" TO service_role;
GRANT EXECUTE ON FUNCTION public.drivedrop_alternative_refund_immutable(), public.drivedrop_alternative_refund_reservation(),
  public.drivedrop_alternative_refund_payment_guard(), public.drivedrop_alternative_refund_complete() TO service_role;

DO $postflight$
BEGIN
  IF (SELECT count(*) FROM pg_tables WHERE schemaname='public') <> 31
    OR (SELECT count(*) FROM information_schema.columns WHERE table_schema='public') <> 377
    OR (SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public') <> 140
    OR (SELECT count(*) FROM pg_indexes WHERE schemaname='public') <> 121 THEN
    RAISE EXCEPTION 'Unexpected final public schema counts';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname IN ('public','drivedrop_production_ops') AND c.relkind='r' AND NOT c.relrowsecurity) THEN
    RAISE EXCEPTION 'Missing RLS';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables t CROSS JOIN (VALUES ('anon'),('authenticated')) r(role)
    WHERE t.schemaname IN ('public','drivedrop_production_ops')
      AND has_table_privilege(r.role,format('%I.%I',t.schemaname,t.tablename),'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')) THEN
    RAISE EXCEPTION 'Unexpected client table privileges';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND (p.prosecdef OR has_function_privilege('anon',p.oid,'EXECUTE')
      OR has_function_privilege('authenticated',p.oid,'EXECUTE'))) THEN
    RAISE EXCEPTION 'Unexpected public function privileges';
  END IF;
  IF (SELECT column_default FROM information_schema.columns WHERE table_schema='public'
    AND table_name='TransporterCancellationFee' AND column_name='amountPence') <> '5000' THEN
    RAISE EXCEPTION 'Preserve the approved production cancellation fee';
  END IF;
END $postflight$;
