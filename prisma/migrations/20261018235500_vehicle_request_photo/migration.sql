-- Optional shared request photo. Access is through authenticated application routes.
ALTER TABLE "TransportJob" ADD COLUMN IF NOT EXISTS "vehiclePhotoPath" TEXT;
-- Supabase storage setup is applied separately; local Prisma databases need no storage schema.
