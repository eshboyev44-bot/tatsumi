-- Migration: User presence and last seen
-- Description: Track online status and last seen timestamp per user

-- ============================================
-- 1. Create presence table
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online boolean NOT NULL DEFAULT false,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  entered_at timestamptz,
  last_seen_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_presence
  ADD COLUMN IF NOT EXISTS entered_at timestamptz;

CREATE INDEX IF NOT EXISTS user_presence_online_idx
  ON public.user_presence (is_online, last_active_at DESC);

-- ============================================
-- 2. RLS policies
-- ============================================
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read user presence" ON public.user_presence;
CREATE POLICY "Authenticated can read user presence"
ON public.user_presence FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can insert own presence" ON public.user_presence;
CREATE POLICY "Users can insert own presence"
ON public.user_presence FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own presence" ON public.user_presence;
CREATE POLICY "Users can update own presence"
ON public.user_presence FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 3. Helper function to touch current user presence
-- ============================================
CREATE OR REPLACE FUNCTION public.touch_user_presence(
  p_is_online boolean DEFAULT true
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

  INSERT INTO public.user_presence (
    user_id,
    is_online,
    last_active_at,
    entered_at,
    last_seen_at,
    updated_at
  )
  VALUES (
    v_user_id,
    p_is_online,
    now(),
    now(),
    CASE WHEN p_is_online THEN NULL ELSE now() END,
    now()
  )
  ON CONFLICT (user_id)
  DO UPDATE
  SET
    is_online = EXCLUDED.is_online,
    last_active_at = EXCLUDED.last_active_at,
    entered_at = CASE
      WHEN EXCLUDED.is_online AND public.user_presence.is_online = false
        THEN EXCLUDED.entered_at
      WHEN EXCLUDED.is_online AND public.user_presence.entered_at IS NULL
        THEN EXCLUDED.entered_at
      ELSE public.user_presence.entered_at
    END,
    last_seen_at = CASE
      WHEN EXCLUDED.is_online THEN public.user_presence.last_seen_at
      ELSE EXCLUDED.last_seen_at
    END,
    updated_at = EXCLUDED.updated_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.touch_user_presence(boolean) TO authenticated;

-- ============================================
-- 4. Add to realtime publication
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_presence'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
  END IF;
END
$$;

-- PostgREST schema cache ni yangilash
NOTIFY pgrst, 'reload schema';
