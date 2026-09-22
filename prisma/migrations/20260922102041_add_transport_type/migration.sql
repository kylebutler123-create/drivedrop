ALTER TABLE "TransportJob"
ADD COLUMN IF NOT EXISTS "transportType" TEXT;

UPDATE "TransportJob"
SET "transportType" = 'ANY'
WHERE "transportType" IS NULL
   OR "transportType" NOT IN ('ANY', 'DRIVEN', 'OPEN', 'ENCLOSED');

ALTER TABLE "TransportJob"
ALTER COLUMN "transportType" SET DEFAULT 'ANY',
ALTER COLUMN "transportType" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'TransportJob_transportType_check'
      AND conrelid = '"TransportJob"'::regclass
  ) THEN
    ALTER TABLE "TransportJob"
    ADD CONSTRAINT "TransportJob_transportType_check"
    CHECK ("transportType" IN ('ANY', 'DRIVEN', 'OPEN', 'ENCLOSED'));
  END IF;
END
$$;
