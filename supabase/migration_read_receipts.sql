-- Migration: Add Read Receipts
-- Description: Add read_at column to messages table for read receipts

-- Add read_at column to messages table
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS messages_read_at_idx ON public.messages(read_at);

-- Ensure UPDATE payloads contain full row in Realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(
  p_conversation_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Mark all unread messages in the conversation as read
  -- Only mark messages sent by the other user
  UPDATE public.messages
  SET read_at = now()
  WHERE conversation_id = p_conversation_id
    AND user_id IS DISTINCT FROM v_user_id
    AND read_at IS NULL;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.mark_messages_as_read(uuid, uuid) TO authenticated;

-- Ensure messages table is in realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END
$$;

-- PostgREST schema cache ni yangilash
NOTIFY pgrst, 'reload schema';
