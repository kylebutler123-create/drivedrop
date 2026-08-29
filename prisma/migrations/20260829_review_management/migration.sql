ALTER TABLE "Review"
ADD COLUMN "transporterReply" TEXT,
ADD COLUMN "transporterReplyAt" TIMESTAMP(3),
ADD COLUMN "disputeReason" TEXT,
ADD COLUMN "disputeDetails" TEXT,
ADD COLUMN "disputedAt" TIMESTAMP(3),
ADD COLUMN "moderationStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "moderationNote" TEXT,
ADD COLUMN "moderatedAt" TIMESTAMP(3);

CREATE INDEX "Review_moderationStatus_createdAt_idx" ON "Review"("moderationStatus", "createdAt");
