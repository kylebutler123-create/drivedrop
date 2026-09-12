ALTER TABLE "TransporterVerification"
  ADD COLUMN IF NOT EXISTS "transporterPhotoPath" TEXT,
  ADD COLUMN IF NOT EXISTS "truckPhotoPath" TEXT;
