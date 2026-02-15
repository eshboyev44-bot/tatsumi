-- Migration: Ensure message-images public access
-- Description: Force bucket visibility and read policy for image rendering on web/mobile

-- Ensure bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-images',
  'message-images',
  true,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read policy for image rendering
DROP POLICY IF EXISTS "Message images are publicly readable" ON storage.objects;
CREATE POLICY "Message images are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'message-images');

-- Keep owner write permissions
DROP POLICY IF EXISTS "Users can upload message images" ON storage.objects;
CREATE POLICY "Users can upload message images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update own message images" ON storage.objects;
CREATE POLICY "Users can update own message images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'message-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'message-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete own message images" ON storage.objects;
CREATE POLICY "Users can delete own message images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

NOTIFY pgrst, 'reload schema';
