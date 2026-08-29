CREATE TABLE IF NOT EXISTS "EmailChangeToken" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "newEmail" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "usedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailChangeToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmailChangeToken_tokenHash_key" UNIQUE ("tokenHash"),
  CONSTRAINT "EmailChangeToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "EmailChangeToken_userId_expiresAt_idx" ON "EmailChangeToken"("userId", "expiresAt");
CREATE INDEX IF NOT EXISTS "EmailChangeToken_expiresAt_idx" ON "EmailChangeToken"("expiresAt");

ALTER TABLE "EmailChangeToken" ENABLE ROW LEVEL SECURITY;
