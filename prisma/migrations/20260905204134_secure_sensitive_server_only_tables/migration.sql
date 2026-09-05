-- Keep sensitive application tables server-only.
-- DriveDrop authorizes access in authenticated Next.js API routes through Prisma.
REVOKE ALL PRIVILEGES ON TABLE
  public."PasswordResetToken",
  public."Dispute",
  public."Notification",
  public."MessageAttachment"
FROM anon, authenticated;

ALTER TABLE public."PasswordResetToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Dispute" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MessageAttachment" ENABLE ROW LEVEL SECURITY;
