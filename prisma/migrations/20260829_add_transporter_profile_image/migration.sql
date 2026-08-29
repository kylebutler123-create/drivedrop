ALTER TABLE "TransporterVerification" ADD COLUMN IF NOT EXISTS "profileImagePath" TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('transporter-profiles','transporter-profiles',true,2097152,ARRAY['image/jpeg','image/png','image/webp']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']::text[];
