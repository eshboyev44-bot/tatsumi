-- Migration: Push notifications support
-- Description: Store Expo push tokens and expose RPC for safe upsert

-- ============================================
-- 1. Push tokens table
-- ============================================
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token text NOT NULL,
  platform text NOT NULL DEFAULT 'unknown',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_tokens_token_not_empty CHECK (char_length(btrim(expo_push_token)) > 0),
  CONSTRAINT push_tokens_platform_not_empty CHECK (char_length(btrim(platform)) > 0),
  CONSTRAINT push_tokens_unique UNIQUE (user_id, expo_push_token)
);

CREATE INDEX IF NOT EXISTS push_tokens_user_idx ON public.push_tokens(user_id);
CREATE INDEX IF NOT EXISTS push_tokens_token_idx ON public.push_tokens(expo_push_token);

-- ============================================
-- 2. RLS policies
-- ============================================
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own push tokens" ON public.push_tokens;
CREATE POLICY "Users can read own push tokens"
ON public.push_tokens FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own push tokens" ON public.push_tokens;
CREATE POLICY "Users can insert own push tokens"
ON public.push_tokens FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own push tokens" ON public.push_tokens;
CREATE POLICY "Users can update own push tokens"
ON public.push_tokens FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own push tokens" ON public.push_tokens;
CREATE POLICY "Users can delete own push tokens"
ON public.push_tokens FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- 3. RPC: upsert push token
-- ============================================
CREATE OR REPLACE FUNCTION public.upsert_push_token(
  p_expo_push_token text,
  p_platform text DEFAULT 'unknown'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_token text := nullif(btrim(p_expo_push_token), '');
  v_platform text := nullif(btrim(p_platform), '');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_token IS NULL THEN
    RAISE EXCEPTION 'Push token is required';
  END IF;

  IF v_platform IS NULL THEN
    v_platform := 'unknown';
  END IF;

  INSERT INTO public.push_tokens (
    user_id,
    expo_push_token,
    platform,
    created_at,
    updated_at,
    last_seen_at
  )
  VALUES (
    v_user_id,
    v_token,
    v_platform,
    now(),
    now(),
    now()
  )
  ON CONFLICT (user_id, expo_push_token)
  DO UPDATE
  SET
    platform = EXCLUDED.platform,
    updated_at = now(),
    last_seen_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_push_token(text, text) TO authenticated;

-- ============================================
-- 4. RPC: remove push token
-- ============================================
CREATE OR REPLACE FUNCTION public.remove_push_token(
  p_expo_push_token text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_token text := nullif(btrim(p_expo_push_token), '');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_token IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.push_tokens
  WHERE user_id = v_user_id
    AND expo_push_token = v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_push_token(text) TO authenticated;

-- PostgREST schema cache ni yangilash
NOTIFY pgrst, 'reload schema';
