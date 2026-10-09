ALTER TABLE public."Quote"
  ADD COLUMN "proposedCollectionFrom" TEXT,
  ADD COLUMN "proposedCollectionUntil" TEXT;

ALTER TABLE public."Quote" ADD CONSTRAINT "Quote_proposed_collection_window_check" CHECK (
  ("proposedCollectionFrom" IS NULL AND "proposedCollectionUntil" IS NULL)
  OR ("proposedCollectionDate" IS NOT NULL
    AND "proposedCollectionFrom" IS NOT NULL AND "proposedCollectionUntil" IS NOT NULL
    AND "proposedCollectionFrom" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND "proposedCollectionUntil" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND "proposedCollectionFrom" < "proposedCollectionUntil")
);
