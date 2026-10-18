-- Applied to the linked Supabase project with the vehicle_request_photo migration.
-- Private bucket: do not grant anonymous/public object access.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('vehicle-photos','vehicle-photos',false,900000,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;
