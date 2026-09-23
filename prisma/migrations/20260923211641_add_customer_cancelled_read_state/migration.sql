-- Persist the customer's read state for the latest cancelled-delivery event.
ALTER TABLE "Booking"
ADD COLUMN IF NOT EXISTS "customerCancellationSeenEventKey" TEXT;
