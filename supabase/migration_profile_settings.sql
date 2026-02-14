-- Migration: Profile Settings and Avatar Storage
-- Description: Add avatar support and profile settings helpers

-- ============================================
-- 1. Update helper function: Search users
-- ============================================
drop function if exists public.search_users(text);
create function public.search_users(search_email text)
returns table (
  id uuid,
  email text,
  display_name text,
  avatar_url text
)
language plpgsql
security definer
as $$
begin
  return query
  select
    au.id,
    au.email::text,
    coalesce(au.raw_user_meta_data->>'display_name', split_part(au.email::text, '@', 1)) as display_name,
    nullif(btrim(au.raw_user_meta_data->>'avatar_url'), '') as avatar_url
  from auth.users au
  where au.email ilike '%' || search_email || '%'
    and au.id != auth.uid()
  limit 20;
end;
$$;

-- ============================================
-- 2. Update helper function: Get user info by ID
-- ============================================
drop function if exists public.get_user_info(uuid);
create function public.get_user_info(user_id uuid)
returns table (
  id uuid,
  email text,
  display_name text,
  avatar_url text
)
language plpgsql
security definer
as $$
begin
  return query
  select
    au.id,
    au.email::text,
    coalesce(au.raw_user_meta_data->>'display_name', split_part(au.email::text, '@', 1)) as display_name,
    nullif(btrim(au.raw_user_meta_data->>'avatar_url'), '') as avatar_url
  from auth.users au
  where au.id = user_id;
end;
$$;

-- ============================================
-- 3. Create avatars storage bucket
-- ============================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ============================================
-- 4. RLS policies for avatars bucket
-- ============================================
drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatars" on storage.objects;
create policy "Users can upload their own avatars"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update their own avatars" on storage.objects;
create policy "Users can update their own avatars"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete their own avatars" on storage.objects;
create policy "Users can delete their own avatars"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- PostgREST schema cache ni yangilash
notify pgrst, 'reload schema';
