-- Prepared for Preview/testing. Do not apply to the shared database until explicitly approved.
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED');
CREATE TYPE "DisputeResolution" AS ENUM ('REFUND_CUSTOMER', 'PARTIAL_REFUND', 'RELEASE_PAYOUT', 'NO_ACTION', 'OTHER');

CREATE TABLE "Dispute" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "raisedById" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "details" TEXT,
  "evidenceUrl" TEXT,
  "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
  "resolution" "DisputeResolution",
  "resolutionNote" TEXT,
  "reviewerId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Dispute_bookingId_status_createdAt_idx" ON "Dispute"("bookingId", "status", "createdAt");
CREATE INDEX "Dispute_raisedById_createdAt_idx" ON "Dispute"("raisedById", "createdAt");
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
