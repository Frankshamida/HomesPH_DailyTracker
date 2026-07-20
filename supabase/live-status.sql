-- ============================================================================
-- Homes.ph Daily Tracker — PUBLIC LIVE STATUS page support
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL editor (in addition to schema.sql / excuse.sql).
--
-- The live-status page lives at  /<fullname>  (e.g. /frankdweezelgomez) and is
-- PUBLIC — anyone with the link can view that person's live status for today:
-- their name, photo, time-in / time-out status, current activity and tasks.
--
-- To support that, anonymous visitors need read-only (SELECT) access to the
-- relevant tables. These policies grant SELECT only — never insert/update/
-- delete, which stay owner-only via the existing policies in schema.sql.
--
-- ⚠️ PRIVACY NOTE: this makes every user's profile, attendance, tasks and
-- excuses publicly READABLE by anyone (writes remain protected). That is the
-- nature of a "public status by name" page. Remove these policies to disable.
-- ============================================================================

-- Profile (name + avatar, and slug resolution by full_name)
drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read" on public.profiles
  for select using (true);

-- Attendance (time-in / time-out status)
drop policy if exists "attendance_public_read" on public.attendance;
create policy "attendance_public_read" on public.attendance
  for select using (true);

-- Daily tasks (the task timeline)
drop policy if exists "daily_task_public_read" on public.daily_task;
create policy "daily_task_public_read" on public.daily_task
  for select using (true);

-- Temporary excuses (on-excuse status)
drop policy if exists "attendance_excuse_public_read" on public.attendance_excuse;
create policy "attendance_excuse_public_read" on public.attendance_excuse
  for select using (true);
