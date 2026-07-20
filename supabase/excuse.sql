-- ============================================================================
-- Homes.ph Daily Tracker — TEMPORARY EXCUSE (step-out) support
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL editor (in addition to schema.sql).
--
-- A "temporary excuse" lets a user who is already timed-in step out for a
-- while WITH a manager's approval, then time in again (resume) afterwards.
-- This is separate from the whole-day "excused" mark on the attendance row.
--
--   status shown in the app: "Excuse"
--   approved_by: 'Sir Hernan Malubay' | 'Sir Johnry Fibra'
--   resumed_at IS NULL  -> user is currently on excuse
--   resumed_at IS NOT NULL -> the excuse is finished (user came back)
-- ============================================================================

create table if not exists public.attendance_excuse (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  work_date date not null default (now() at time zone 'Asia/Manila')::date,
  reason text not null,
  approved_by text not null,                 -- 'Sir Hernan Malubay' | 'Sir Johnry Fibra'
  excused_at timestamptz not null default now(),
  resumed_at timestamptz,                    -- null while still on excuse
  created_at timestamptz default now()
);

alter table public.attendance_excuse enable row level security;

drop policy if exists "attendance_excuse_all_own" on public.attendance_excuse;
create policy "attendance_excuse_all_own" on public.attendance_excuse
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists attendance_excuse_user_date_idx
  on public.attendance_excuse (user_id, work_date desc, excused_at);
