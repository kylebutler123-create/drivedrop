CREATE TYPE "DateNegotiationStatus" AS ENUM ('ORIGINAL', 'PROPOSED', 'ACCEPTED', 'DECLINED', 'COUNTERED');

ALTER TABLE "Quote"
ADD COLUMN "proposedCollectionDate" TIMESTAMP(3),
ADD COLUMN "dateNegotiationStatus" "DateNegotiationStatus" NOT NULL DEFAULT 'ORIGINAL';
