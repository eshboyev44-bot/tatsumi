-- public.messages jadvali
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  username text not null check (char_length(btrim(username)) > 0),
  content text not null check (char_length(btrim(content)) > 0 and char_length(content) <= 500)
);

-- Eski jadval bo'lsa (faqat content bilan), kerakli ustunlarni qo'shamiz
alter table public.messages
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists username text,
  add column if not exists content text,
  add column if not exists created_at timestamptz default now();

update public.messages
set username = 'Guest'
where username is null or char_length(btrim(username)) = 0;

alter table public.messages
  alter column user_id set default auth.uid(),
  alter column created_at set default now(),
  alter column content set not null,
  alter column username set default 'Guest',
  alter column username set not null;

alter table public.messages
  drop constraint if exists messages_username_check;
alter table public.messages
  add constraint messages_username_check
  check (char_length(btrim(username)) > 0);

alter table public.messages
  drop constraint if exists messages_content_check;
alter table public.messages
  add constraint messages_content_check
  check (char_length(btrim(content)) > 0 and char_length(content) <= 500);

-- RLS yoqilgan bo'lsa ham anon client o'qiy va yozishi uchun
alter table public.messages enable row level security;

drop policy if exists "Public can read messages" on public.messages;
create policy "Public can read messages"
on public.messages
for select
to anon, authenticated
using (true);

drop policy if exists "Public can insert messages" on public.messages;
drop policy if exists "Authenticated can insert messages" on public.messages;
create policy "Authenticated can insert messages"
on public.messages
for insert
to authenticated
with check (
  auth.uid() is not null and
  auth.uid() = user_id and
  char_length(btrim(username)) > 0 and
  char_length(btrim(content)) > 0 and
  char_length(content) <= 500
);

-- Realtime subscription uchun jadvalni publication ga qo'shamiz
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end
$$;

-- PostgREST schema cache ni yangilash
notify pgrst, 'reload schema';
