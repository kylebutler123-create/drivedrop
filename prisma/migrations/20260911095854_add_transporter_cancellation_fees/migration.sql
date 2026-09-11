BEGIN;

ALTER TABLE "BookingPayment"
ADD COLUMN IF NOT EXISTS "cancellationDeductionPence" INTEGER NOT NULL DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE "BookingPayment"
  ADD CONSTRAINT "BookingPayment_cancellationDeductionPence_check"
  CHECK ("cancellationDeductionPence" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "TransporterCancellationFee" (
  "id" TEXT NOT NULL,
  "transporterId" TEXT NOT NULL,
  "cancelledBookingId" TEXT NOT NULL,
  "amountPence" INTEGER NOT NULL DEFAULT 2500,
  "appliedPence" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "appliedAt" TIMESTAMPTZ(3),

  CONSTRAINT "TransporterCancellationFee_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TransporterCancellationFee_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TransporterCancellationFee_cancelledBookingId_fkey" FOREIGN KEY ("cancelledBookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TransporterCancellationFee_cancelledBookingId_key" UNIQUE ("cancelledBookingId"),
  CONSTRAINT "TransporterCancellationFee_amount_check" CHECK ("amountPence" > 0),
  CONSTRAINT "TransporterCancellationFee_applied_check" CHECK ("appliedPence" >= 0 AND "appliedPence" <= "amountPence"),
  CONSTRAINT "TransporterCancellationFee_status_check" CHECK ("status" IN ('PENDING','PARTIALLY_APPLIED','APPLIED','WAIVED'))
);

CREATE INDEX IF NOT EXISTS "TransporterCancellationFee_transporterId_status_createdAt_idx"
ON "TransporterCancellationFee"("transporterId", "status", "createdAt");

CREATE TABLE IF NOT EXISTS "TransporterCancellationDeduction" (
  "id" TEXT NOT NULL,
  "feeId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "amountPence" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TransporterCancellationDeduction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TransporterCancellationDeduction_feeId_fkey" FOREIGN KEY ("feeId") REFERENCES "TransporterCancellationFee"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TransporterCancellationDeduction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "BookingPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TransporterCancellationDeduction_feeId_paymentId_key" UNIQUE ("feeId", "paymentId"),
  CONSTRAINT "TransporterCancellationDeduction_amount_check" CHECK ("amountPence" > 0)
);

CREATE INDEX IF NOT EXISTS "TransporterCancellationDeduction_paymentId_idx"
ON "TransporterCancellationDeduction"("paymentId");

ALTER TABLE "TransporterCancellationFee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TransporterCancellationDeduction" ENABLE ROW LEVEL SECURITY;

COMMIT;
