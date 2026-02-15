-- Migration: Allow deleting own messages
-- Description: Authenticated users can delete only their own messages

DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
CREATE POLICY "Users can delete own messages"
ON public.messages FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  AND (
    conversation_id IS NULL OR
    EXISTS (
      SELECT 1
      FROM public.conversations
      WHERE id = conversation_id
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  )
);

-- PostgREST schema cache ni yangilash
NOTIFY pgrst, 'reload schema';
