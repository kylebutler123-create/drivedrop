CREATE TABLE IF NOT EXISTS public."DisputeReviewNote" (
"id" TEXT PRIMARY KEY,
"disputeId" TEXT NOT NULL REFERENCES public."Dispute"("id") ON DELETE CASCADE,
"actorId" TEXT REFERENCES public."User"("id") ON DELETE SET NULL,
"kind" TEXT NOT NULL CHECK ("kind" IN ('REVIEW','OUTCOME')),
"body" TEXT NOT NULL CHECK (char_length("body") BETWEEN 1 AND 2000),
"createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "DisputeReviewNote_disputeId_createdAt_idx" ON public."DisputeReviewNote" ("disputeId","createdAt");
CREATE INDEX IF NOT EXISTS "DisputeReviewNote_actorId_idx" ON public."DisputeReviewNote" ("actorId");
ALTER TABLE public."DisputeReviewNote" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."DisputeReviewNote" FROM PUBLIC, anon, authenticated;
