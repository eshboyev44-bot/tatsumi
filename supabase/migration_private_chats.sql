-- Migration: Private Chat Rooms
-- Description: Add support for one-on-one private conversations

-- ============================================
-- 1. Create conversations table
-- ============================================
create table if not exists public.conversations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  user1_id uuid not null references auth.users(id) on delete cascade,
  user2_id uuid not null references auth.users(id) on delete cascade,
  last_message_at timestamptz,
  
  -- Ensure user1_id < user2_id for consistent ordering
  constraint conversations_users_ordered check (user1_id < user2_id),
  -- Prevent duplicate conversations
  constraint conversations_unique unique (user1_id, user2_id)
);

-- Indexes for fast lookups
create index if not exists conversations_user1_idx on public.conversations(user1_id);
create index if not exists conversations_user2_idx on public.conversations(user2_id);
create index if not exists conversations_last_message_idx on public.conversations(last_message_at desc);

-- ============================================
-- 2. Update messages table
-- ============================================
alter table public.messages
  add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;

-- Index for fast conversation message queries
create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at);

-- ============================================
-- 3. RLS Policies for conversations
-- ============================================
alter table public.conversations enable row level security;

drop policy if exists "Users can view their conversations" on public.conversations;
create policy "Users can view their conversations"
on public.conversations for select
to authenticated
using (auth.uid() = user1_id or auth.uid() = user2_id);

drop policy if exists "Users can create conversations" on public.conversations;
create policy "Users can create conversations"
on public.conversations for insert
to authenticated
with check (auth.uid() = user1_id or auth.uid() = user2_id);

drop policy if exists "Users can update their conversations" on public.conversations;
create policy "Users can update their conversations"
on public.conversations for update
to authenticated
using (auth.uid() = user1_id or auth.uid() = user2_id);

-- ============================================
-- 4. Update RLS Policies for messages
-- ============================================
drop policy if exists "Public can read messages" on public.messages;
drop policy if exists "Users can read their conversation messages" on public.messages;
create policy "Users can read their conversation messages"
on public.messages for select
to authenticated
using (
  conversation_id is null or
  exists (
    select 1 from public.conversations
    where id = conversation_id
    and (user1_id = auth.uid() or user2_id = auth.uid())
  )
);

drop policy if exists "Authenticated can insert messages" on public.messages;
drop policy if exists "Users can insert messages in their conversations" on public.messages;
create policy "Users can insert messages in their conversations"
on public.messages for insert
to authenticated
with check (
  (conversation_id is null) or
  (
    exists (
      select 1 from public.conversations
      where id = conversation_id
      and (user1_id = auth.uid() or user2_id = auth.uid())
    )
    and auth.uid() = user_id
  )
);

-- ============================================
-- 5. Helper function: Find or create conversation
-- ============================================
create or replace function public.find_or_create_conversation(
  other_user_id uuid
)
returns uuid
language plpgsql
security definer
as $$
declare
  current_user_id uuid;
  conv_id uuid;
  uid1 uuid;
  uid2 uuid;
begin
  current_user_id := auth.uid();
  
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;
  
  if current_user_id = other_user_id then
    raise exception 'Cannot create conversation with yourself';
  end if;
  
  -- Order user IDs (smaller first)
  if current_user_id < other_user_id then
    uid1 := current_user_id;
    uid2 := other_user_id;
  else
    uid1 := other_user_id;
    uid2 := current_user_id;
  end if;
  
  -- Try to find existing conversation
  select id into conv_id
  from public.conversations
  where user1_id = uid1 and user2_id = uid2;
  
  -- Create if not exists
  if conv_id is null then
    insert into public.conversations (user1_id, user2_id, last_message_at)
    values (uid1, uid2, now())
    returning id into conv_id;
  end if;
  
  return conv_id;
end;
$$;

-- ============================================
-- 6. Helper function: Search users
-- ============================================
create or replace function public.search_users(search_email text)
returns table (
  id uuid,
  email text,
  display_name text
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    au.id,
    au.email::text,
    coalesce(au.raw_user_meta_data->>'display_name', split_part(au.email::text, '@', 1)) as display_name
  from auth.users au
  where au.email ilike '%' || search_email || '%'
    and au.id != auth.uid()
  limit 20;
end;
$$;

-- ============================================
-- 6.5. Helper function: Get user info by ID
-- ============================================
create or replace function public.get_user_info(user_id uuid)
returns table (
  id uuid,
  email text,
  display_name text
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    au.id,
    au.email::text,
    coalesce(au.raw_user_meta_data->>'display_name', split_part(au.email::text, '@', 1)) as display_name
  from auth.users au
  where au.id = user_id;
end;
$$;

-- ============================================
-- 7. Trigger: Update last_message_at
-- ============================================
create or replace function public.update_conversation_timestamp()
returns trigger
language plpgsql
as $$
begin
  if NEW.conversation_id is not null then
    update public.conversations
    set last_message_at = NEW.created_at
    where id = NEW.conversation_id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists update_conversation_timestamp_trigger on public.messages;
create trigger update_conversation_timestamp_trigger
after insert on public.messages
for each row
execute function public.update_conversation_timestamp();

-- ============================================
-- 8. Add conversations to realtime publication
-- ============================================
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
end
$$;

-- PostgREST schema cache ni yangilash
notify pgrst, 'reload schema';
