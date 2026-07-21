-- ===========================================================================
-- Homes.ph Daily Tracker — Supabase schema
-- Run this in your Supabase project:  SQL Editor -> New query -> paste -> Run
-- ===========================================================================

-- --------------------------------------------------------------------------
-- 1) PROFILES
-- --------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- --------------------------------------------------------------------------
-- 2) ATTENDANCE  (one row per user per work-date)
-- --------------------------------------------------------------------------
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  work_date date not null,
  time_in timestamptz,
  in_status text,        -- 'early' | 'on_time' | 'late'
  in_minutes integer,    -- minutes early OR minutes late
  in_location text,      -- approved site name where the user timed in
  time_out timestamptz,
  out_status text,       -- 'early_out' | 'on_time' | 'overtime'
  out_minutes integer,   -- minutes early-out OR overtime minutes
  out_location text,     -- approved site name where the user timed out
  early_out_reason text,
  day_status text not null default 'present',  -- 'present' | 'absent' | 'excused'
  absence_reason text,
  created_at timestamptz default now(),
  unique (user_id, work_date)
);

-- For existing installs, add the day-status columns if missing:
alter table public.attendance add column if not exists day_status text not null default 'present';
alter table public.attendance add column if not exists absence_reason text;
alter table public.attendance add column if not exists in_location text;
alter table public.attendance add column if not exists out_location text;

alter table public.attendance enable row level security;

drop policy if exists "attendance_all_own" on public.attendance;
create policy "attendance_all_own" on public.attendance
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists attendance_user_date_idx
  on public.attendance (user_id, work_date desc);

-- --------------------------------------------------------------------------
-- 3) TASKS  (tasks & improvements)
-- --------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  work_date date not null default (now() at time zone 'Asia/Manila')::date,
  title text not null,
  category text not null default 'task',   -- 'task' | 'improvement'
  status text not null default 'pending',  -- 'pending' | 'done'
  created_at timestamptz default now()
);

alter table public.tasks enable row level security;

drop policy if exists "tasks_all_own" on public.tasks;
create policy "tasks_all_own" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists tasks_user_date_idx
  on public.tasks (user_id, work_date);

-- --------------------------------------------------------------------------
-- 3b) DAILY_TASK  (per-hour daily task tracker)
--     type: 'development' | 'qa' | 'ui_designing'
--     status: 'pending' | 'in_progress' | 'on_hold' | 'for_review' | 'testing' | 'completed' | 'cancelled' | 'reopened'  (legacy: 'ongoing' | 'done')
--     start_hour / end_hour are 24h integers, e.g. 9 and 11 = 9:00 AM–11:00 AM
--     design_url required when type is 'qa' or 'ui_designing'
-- --------------------------------------------------------------------------
create table if not exists public.daily_task (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  work_date date not null default (now() at time zone 'Asia/Manila')::date,
  title text not null,
  description text,
  type text not null default 'development',
  status text not null default 'pending',
  start_hour integer not null,
  end_hour integer not null,
  design_url text,
  archived boolean not null default false,  -- true once the day is timed-out (moves to Past Tasks)
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  check (end_hour > start_hour)
);

-- For existing installs:
alter table public.daily_task add column if not exists archived boolean not null default false;
alter table public.daily_task add column if not exists description text;

alter table public.daily_task enable row level security;

drop policy if exists "daily_task_all_own" on public.daily_task;
create policy "daily_task_all_own" on public.daily_task
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists daily_task_user_date_idx
  on public.daily_task (user_id, work_date, start_hour);

-- --------------------------------------------------------------------------
-- 3b-2) DAILY_TASK_LISTING  (one or more listing videos attached to a
--     'listing_video_posting' daily_task, added AFTER the task is created)
-- --------------------------------------------------------------------------
create table if not exists public.daily_task_listing (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.daily_task (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  listing_title text not null,
  youtube_link text not null,
  created_at timestamptz default now()
);

alter table public.daily_task_listing enable row level security;

drop policy if exists "daily_task_listing_all_own" on public.daily_task_listing;
create policy "daily_task_listing_all_own" on public.daily_task_listing
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists daily_task_listing_task_idx
  on public.daily_task_listing (task_id);

-- --------------------------------------------------------------------------
-- 3c) SHARE_LINK  (public read-only link for a user's day)
--     A token maps to (user_id, work_date). Anyone with the token can view
--     that day's tasks + the owner's name/photo.
-- --------------------------------------------------------------------------
create table if not exists public.share_link (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  work_date date not null,
  created_at timestamptz default now(),
  unique (user_id, work_date)
);

alter table public.share_link enable row level security;

-- Owner can create / read / delete their own links
drop policy if exists "share_link_owner_all" on public.share_link;
create policy "share_link_owner_all" on public.share_link
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Anyone (anon) can resolve a token
drop policy if exists "share_link_public_read" on public.share_link;
create policy "share_link_public_read" on public.share_link
  for select using (true);

-- Public may read daily_task rows ONLY for days that have been shared
drop policy if exists "daily_task_public_shared" on public.daily_task;
create policy "daily_task_public_shared" on public.daily_task
  for select using (
    exists (
      select 1 from public.share_link s
      where s.user_id = daily_task.user_id and s.work_date = daily_task.work_date
    )
  );

-- Public may read daily_task_listing rows ONLY for tasks on a shared day
drop policy if exists "daily_task_listing_public_shared" on public.daily_task_listing;
create policy "daily_task_listing_public_shared" on public.daily_task_listing
  for select using (
    exists (
      select 1 from public.daily_task dt
      join public.share_link s on s.user_id = dt.user_id and s.work_date = dt.work_date
      where dt.id = daily_task_listing.task_id
    )
  );

-- Public may read the profile (name/photo) of users who have any shared day
drop policy if exists "profiles_public_shared" on public.profiles;
create policy "profiles_public_shared" on public.profiles
  for select using (
    exists (select 1 from public.share_link s where s.user_id = profiles.id)
  );

-- --------------------------------------------------------------------------
-- 4) Auto-create a profile row when a user signs up
-- --------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------------------------------------------------------------------------
-- 5) STORAGE bucket for avatars (public read, owner write)
-- --------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
