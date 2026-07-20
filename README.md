# Homes.ph Daily Tracker

Next.js 14 + Supabase attendance & task tracker.

## Features
- Email/password **login & sign-up** (Supabase Auth)
- **Dashboard** with live Manila clock, greeting, and stats
- **Profile picture** upload (Supabase Storage, drag-to-edit avatar)
- **Time-In / Time-Out** with automatic classification:
  - Time-in before 9:00 AM → **Early In** (minutes counted)
  - Time-in exactly 9:00 → **On Time**
  - Time-in 9:01+ → **Late** (minutes counted)
  - Time-out before schedule end → **Early Out** (reason required, minutes counted)
  - Time-out after schedule end → **Overtime** (minutes counted)
- **Work schedule** (Asia/Manila):
  - Mon–Fri 9:00 AM – 6:00 PM (lunch 12–1)
  - Sat 9:00 AM – 12:00 PM
  - Sun rest day
- **Tasks & Improvements** checklist per day
- **Attendance history** (last 14 days) with totals for late / overtime / early-out

## Setup

### 1. Database
In your Supabase dashboard → **SQL Editor**, paste and run [`supabase/schema.sql`](supabase/schema.sql).
This creates the `profiles`, `attendance`, `tasks` tables, RLS policies, the sign-up
trigger, and the public `avatars` storage bucket.

### 2. Auth (optional but recommended for quick testing)
Supabase → **Authentication → Providers → Email**: turn **off** "Confirm email"
if you want sign-up to log you in immediately without email confirmation.

### 3. Environment
`.env.local` is already filled in with your project URL and anon key.

### 4. Install & run
```bash
npm install
npm run dev
```
Open http://localhost:3000

## ⚠️ Security
Rotate your **service_role** key in Supabase (Settings → API) — it was shared in chat.
This app never uses it; only the safe public anon key is used client-side.
