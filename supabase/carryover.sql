-- ============================================================================
-- Homes.ph Daily Tracker — CARRY-OVER (continue an unfinished task) support
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL editor (in addition to schema.sql).
--
-- When a task from a previous day is not yet finished, the user can "carry it
-- over" — re-add it today. carried_over_from stores the ORIGINAL work_date the
-- task was first started on, so the daily report can say things like
-- "the task from 2026-07-20 which I have now completed".
-- ============================================================================

alter table public.daily_task
  add column if not exists carried_over_from date;
