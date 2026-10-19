ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dailyJobEmails" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS "User_role_accountStatus_dailyJobEmails_id_idx" ON "User" ("role", "accountStatus", "dailyJobEmails", "id");
CREATE INDEX IF NOT EXISTS "TransportJob_status_createdAt_idx" ON "TransportJob" ("status", "createdAt");
CREATE TABLE IF NOT EXISTS "JobDigestRun" (
  "id" TEXT PRIMARY KEY,
  "windowEnd" TIMESTAMP(3) NOT NULL,
  "cursor" TEXT,
  "pending" JSONB,
  "leaseToken" TEXT,
  "leaseUntil" TIMESTAMP(3),
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "JobDigestRun_createdAt_idx" ON "JobDigestRun" ("createdAt");
ALTER TABLE "JobDigestRun" ENABLE ROW LEVEL SECURITY;
-- Application access uses the server-side Prisma connection, never the Data API.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
  REVOKE ALL ON "JobDigestRun" FROM anon;
 END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
  REVOKE ALL ON "JobDigestRun" FROM authenticated;
 END IF;
END $$;
