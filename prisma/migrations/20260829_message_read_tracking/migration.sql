ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "Message_bookingId_readAt_idx"
ON "Message"("bookingId", "readAt");
