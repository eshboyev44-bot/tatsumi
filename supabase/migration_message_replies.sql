-- Migration: Add message reply support
-- Description: Allow replying to a specific message inside the same conversation

-- ============================================
-- 1. Add reply column + FK
-- ============================================
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_id bigint;

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_reply_to_id_fkey;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_reply_to_id_fkey
  FOREIGN KEY (reply_to_id)
  REFERENCES public.messages(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS messages_reply_to_idx ON public.messages(reply_to_id);

-- ============================================
-- 2. Validate reply belongs to same conversation
-- ============================================
CREATE OR REPLACE FUNCTION public.validate_message_reply()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_parent_conversation_id uuid;
BEGIN
  IF NEW.reply_to_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT conversation_id
  INTO v_parent_conversation_id
  FROM public.messages
  WHERE id = NEW.reply_to_id;

  IF v_parent_conversation_id IS NULL THEN
    RAISE EXCEPTION 'Reply target not found';
  END IF;

  IF v_parent_conversation_id IS DISTINCT FROM NEW.conversation_id THEN
    RAISE EXCEPTION 'Reply target belongs to another conversation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_message_reply_trigger ON public.messages;
CREATE TRIGGER validate_message_reply_trigger
BEFORE INSERT OR UPDATE OF reply_to_id, conversation_id
ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.validate_message_reply();

-- PostgREST schema cache ni yangilash
NOTIFY pgrst, 'reload schema';
