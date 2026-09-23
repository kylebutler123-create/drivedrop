ALTER TABLE "Booking"
ADD COLUMN IF NOT EXISTS "customerCompletedSeenEventKey" TEXT;
