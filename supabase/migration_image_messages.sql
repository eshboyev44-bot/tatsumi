-- Migration: Add image messages support
-- Description: Allow sending chat messages with optional image attachments

-- ============================================
-- 1. Update messages table for image messages
-- ============================================
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE public.messages
  ALTER COLUMN content DROP NOT NULL;

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_content_check;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_content_check
  CHECK (
    content IS NULL OR
    (
      char_length(btrim(content)) > 0 AND
      char_length(content) <= 500
    )
  );

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_text_or_image_check;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_text_or_image_check
  CHECK (
    (
      content IS NOT NULL AND
      char_length(btrim(content)) > 0 AND
      char_length(content) <= 500
    ) OR (
      image_url IS NOT NULL AND
      char_length(btrim(image_url)) > 0
    )
  );

-- ============================================
-- 2. Update insert policy for new validation
-- ============================================
DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Authenticated can insert messages" ON public.messages;

CREATE POLICY "Users can insert messages in their conversations"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND
  auth.uid() = user_id AND
  char_length(btrim(username)) > 0 AND
  (
    (
      content IS NOT NULL AND
      char_length(btrim(content)) > 0 AND
      char_length(content) <= 500
    ) OR (
      image_url IS NOT NULL AND
      char_length(btrim(image_url)) > 0
    )
  ) AND
  (
    conversation_id IS NULL OR
    EXISTS (
      SELECT 1
      FROM public.conversations
      WHERE id = conversation_id
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  )
);

-- ============================================
-- 3. Create storage bucket for message images
-- ============================================
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

-- ============================================
-- 4. RLS policies for message-images bucket
-- ============================================
DROP POLICY IF EXISTS "Message images are publicly readable" ON storage.objects;
CREATE POLICY "Message images are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'message-images');

DROP POLICY IF EXISTS "Users can upload message images" ON storage.objects;
CREATE POLICY "Users can upload message images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update own message images" ON storage.objects;
CREATE POLICY "Users can update own message images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'message-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'message-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete own message images" ON storage.objects;
CREATE POLICY "Users can delete own message images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- PostgREST schema cache ni yangilash
NOTIFY pgrst, 'reload schema';
