-- Milestone 7 hardening indexes/constraints.
CREATE INDEX IF NOT EXISTS "TransportJob_customerId_status_createdAt_idx" ON "TransportJob"("customerId", "status", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "Quote_jobId_transporterId_key" ON "Quote"("jobId", "transporterId");
CREATE INDEX IF NOT EXISTS "Quote_transporterId_status_createdAt_idx" ON "Quote"("transporterId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Booking_customerId_status_createdAt_idx" ON "Booking"("customerId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Booking_transporterId_status_createdAt_idx" ON "Booking"("transporterId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");
CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");
