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
  CHECK ("environment" IN ('preview','development'));
ALTER TABLE "StripePayout" ADD CONSTRAINT "StripePayout_environment_check"
  CHECK ("environment" IN ('preview','development'));
ALTER TABLE "StripePayout" ADD CONSTRAINT "StripePayout_amounts_check"
  CHECK ("grossPence" >= 0 AND "finePence" >= 0 AND "finePence" <= "grossPence"
    AND "amountPence" = "grossPence" - "finePence"
    AND "paidPence" > 0 AND "refundedPence" >= 0 AND "refundedPence" <= "paidPence"
    AND "reversedPence" >= 0 AND "reversedPence" <= "amountPence" AND "attemptCount" >= 0);
