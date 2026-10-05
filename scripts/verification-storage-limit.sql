-- Approved configuration change: verification documents only. Keep the bucket private.
-- Applied to the existing DriveDrop project on 2026-10-05 UTC.
-- HEIC/HEIF is converted locally to JPEG; raw HEIC uploads are not accepted by storage.
UPDATE storage.buckets
SET file_size_limit = 20971520
WHERE id = 'transporter-verification'
  AND public = false
  AND file_size_limit = 4194304;

SELECT id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'transporter-verification';
