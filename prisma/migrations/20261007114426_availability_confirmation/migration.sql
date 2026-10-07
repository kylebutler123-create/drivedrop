-- AlterTable
ALTER TABLE "TransportJob" ADD COLUMN     "collectionFrom" TEXT,
ADD COLUMN     "collectionUntil" TEXT;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AvailabilityRequest" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "transporterId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AWAITING_TRANSPORTER',
    "activeJobId" TEXT,
    "pricePence" INTEGER NOT NULL,
    "collectionDate" TIMESTAMP(3) NOT NULL,
    "collectionFrom" TEXT,
    "collectionUntil" TEXT,
    "respondBy" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "payBy" TIMESTAMP(3),
    "travelMinutes" INTEGER,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilityRequest_activeJobId_key" ON "AvailabilityRequest"("activeJobId");

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilityRequest_bookingId_key" ON "AvailabilityRequest"("bookingId");

-- CreateIndex
CREATE INDEX "AvailabilityRequest_customerId_createdAt_idx" ON "AvailabilityRequest"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "AvailabilityRequest_transporterId_createdAt_idx" ON "AvailabilityRequest"("transporterId", "createdAt");

-- CreateIndex
CREATE INDEX "AvailabilityRequest_status_respondBy_payBy_idx" ON "AvailabilityRequest"("status", "respondBy", "payBy");

-- AddForeignKey
ALTER TABLE "AvailabilityRequest" ADD CONSTRAINT "AvailabilityRequest_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "TransportJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequest" ADD CONSTRAINT "AvailabilityRequest_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Server-only model. DriveDrop uses its own authenticated session and Prisma owner checks.
ALTER TABLE "AvailabilityRequest" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AvailabilityRequest" FROM PUBLIC, anon, authenticated;
ALTER TABLE "AvailabilityRequest" ADD CONSTRAINT "AvailabilityRequest_status_check"
  CHECK ("status" IN ('AWAITING_TRANSPORTER','AWAITING_PAYMENT','DECLINED','WITHDRAWN','EXPIRED','BOOKED'));
ALTER TABLE "AvailabilityRequest" ADD CONSTRAINT "AvailabilityRequest_active_check"
  CHECK (("status" IN ('AWAITING_TRANSPORTER','AWAITING_PAYMENT') AND "activeJobId"="jobId" AND "activeJobId" IS NOT NULL)
      OR ("status" NOT IN ('AWAITING_TRANSPORTER','AWAITING_PAYMENT') AND "activeJobId" IS NULL));
ALTER TABLE "AvailabilityRequest" ADD CONSTRAINT "AvailabilityRequest_confirmed_check"
  CHECK ("status" NOT IN ('AWAITING_PAYMENT','BOOKED') OR ("confirmedAt" IS NOT NULL AND "payBy" IS NOT NULL));
ALTER TABLE "AvailabilityRequest" ADD CONSTRAINT "AvailabilityRequest_price_check" CHECK ("pricePence" > 0);
CREATE INDEX "AvailabilityRequest_quoteId_idx" ON "AvailabilityRequest"("quoteId");
CREATE INDEX "AvailabilityRequest_jobId_idx" ON "AvailabilityRequest"("jobId");
CREATE INDEX "Quote_expiresAt_idx" ON "Quote"("expiresAt");
