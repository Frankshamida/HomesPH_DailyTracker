"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, ExternalLink, MapPin, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/ui/theme-toggle";
import {
  formatManilaTime,
  getSchedule,
  manilaDateKey,
  manilaHour,
  manilaMinutes,
  slotLabel,
} from "@/lib/attendance";

// ---- display maps (kept local to the public page) -------------------------
const TYPE_LABELS: Record<string, string> = {
  development: "Development",
  bug_fixing: "Bug Fixing",
  ui_designing: "UI Designing",
  ui_implementation: "UI Implementation",
  ux_improvement: "UX Improvement",
  qa: "Quality Assurance (QA)",
  testing: "Testing",
  code_review: "Code Review",
  performance_optimization: "Performance Optimization",
  security_enhancement: "Security Enhancement",
  database_management: "Database Management",
  api_development: "API Development",
  api_integration: "API Integration",
  frontend_development: "Frontend Development",
  backend_development: "Backend Development",
  full_stack_development: "Full Stack Development",
  devops: "DevOps",
  deployment: "Deployment",
  maintenance: "Maintenance",
  feature_development: "Feature Development",
  refactoring: "Refactoring",
  research_development: "Research & Development (R&D)",
  documentation: "Documentation",
  technical_writing: "Technical Writing",
  auditing: "Auditing",
  website_audit: "Website Audit",
  seo_optimization: "SEO Optimization",
  accessibility: "Accessibility (A11y)",
  content_management: "Content Management",
  article_posting: "Article Posting",
  blog_posting: "Blog Posting",
  image_editing: "Image Editing",
  graphic_design: "Graphic Design",
  branding: "Branding",
  data_entry: "Data Entry",
  data_migration: "Data Migration",
  client_support: "Client Support",
  user_support: "User Support",
  training: "Training",
  meeting: "Meeting",
  planning: "Planning",
  project_management: "Project Management",
};
const typeLabel = (t: string) => TYPE_LABELS[t] ?? t;

const STATUS_META: Record<string, { label: string; badge: string }> = {
  pending: { label: "📝 Pending", badge: "bg-slate-100 text-foreground" },
  in_progress: { label: "🚀 In Progress", badge: "bg-sky-100 text-sky-700" },
  on_hold: { label: "⏸️ On Hold", badge: "bg-amber-100 text-amber-700" },
  for_review: { label: "👀 For Review", badge: "bg-violet-100 text-violet-700" },
  testing: { label: "🧪 Testing", badge: "bg-yellow-100 text-yellow-700" },
  completed: { label: "✅ Completed", badge: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "❌ Cancelled", badge: "bg-red-100 text-red-700" },
  reopened: { label: "🔄 Reopened", badge: "bg-orange-100 text-orange-700" },
  ongoing: { label: "🚀 In Progress", badge: "bg-sky-100 text-sky-700" },
  done: { label: "✅ Completed", badge: "bg-emerald-100 text-emerald-700" },
};
const statusMeta = (s: string) =>
  STATUS_META[s] ?? { label: s, badge: "bg-slate-100 text-muted-foreground" };

interface DailyTask {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  start_hour: number;
  end_hour: number;
  design_url: string | null;
}
interface Attendance {
  time_in: string | null;
  in_status: string | null;
  in_location: string | null;
  time_out: string | null;
  out_status: string | null;
  out_location: string | null;
  day_status: string | null;
  absence_reason: string | null;
}
interface Excuse {
  id: string;
  reason: string;
  approved_by: string;
  excused_at: string;
  resumed_at: string | null;
}

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  if (p.length === 1) return p[0][0]!.toUpperCase();
  return (p[0][0]! + p[p.length - 1][0]!).toUpperCase();
}

const IN_LABEL: Record<string, string> = { early: "Early In", on_time: "On Time", late: "Late" };
const OUT_LABEL: Record<string, string> = { early_out: "Early Out", overtime: "Overtime", on_time: "On Time" };
const IN_BADGE: Record<string, string> = {
  early: "bg-sky-100 text-sky-700",
  on_time: "bg-emerald-100 text-emerald-700",
  late: "bg-amber-100 text-amber-700",
};
const OUT_BADGE: Record<string, string> = {
  early_out: "bg-rose-100 text-rose-700",
  overtime: "bg-violet-100 text-violet-700",
  on_time: "bg-emerald-100 text-emerald-700",
};

export default function LiveStatus({
  userId,
  name,
  avatar,
}: {
  userId: string;
  name: string;
  avatar: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [now, setNow] = useState<Date | null>(null);
  const [att, setAtt] = useState<Attendance | null>(null);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [excuses, setExcuses] = useState<Excuse[]>([]);
  const [selected, setSelected] = useState<DailyTask | null>(null);

  // live clock
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    const key = manilaDateKey(new Date());
    const [{ data: a }, { data: tk }, { data: ex }] = await Promise.all([
      supabase.from("attendance").select("*").eq("user_id", userId).eq("work_date", key).maybeSingle(),
      supabase
        .from("daily_task")
        .select("id, title, description, type, status, start_hour, end_hour, design_url")
        .eq("user_id", userId)
        .eq("work_date", key)
        .order("start_hour"),
      supabase
        .from("attendance_excuse")
        .select("id, reason, approved_by, excused_at, resumed_at")
        .eq("user_id", userId)
        .eq("work_date", key)
        .order("excused_at", { ascending: true }),
    ]);
    setAtt((a as Attendance) ?? null);
    setTasks((tk as DailyTask[]) ?? []);
    setExcuses((ex as Excuse[]) ?? []);
  }, [supabase, userId]);

  // poll every 15s for "live" updates
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const baseDate = now ?? new Date();
  const sched = getSchedule(baseDate);
  const nowHour = manilaHour(baseDate);
  const nowMin = manilaMinutes(baseDate);
  const openExcuse = excuses.find((e) => !e.resumed_at) ?? null;

  const dayStatus = att?.day_status ?? "present";
  const isAbsent = dayStatus === "absent";
  const isDayExcused = dayStatus === "excused";
  const hasIn = !!att?.time_in;
  const hasOut = !!att?.time_out;
  const totalHours = tasks.reduce((s, t) => s + (t.end_hour - t.start_hour), 0);

  // Current live activity
  const currentTask =
    hasIn && !hasOut && !openExcuse
      ? tasks.find((t) => t.start_hour <= nowHour && nowHour < t.end_hour) ?? null
      : null;

  let activity: { icon: string; text: string; tone: string; task?: DailyTask } = {
    icon: "🟢",
    text: "Available",
    tone: "bg-emerald-500",
  };
  if (sched.dayType === "sunday") activity = { icon: "🌙", text: "Rest day", tone: "bg-slate-400" };
  else if (isAbsent) activity = { icon: "🔴", text: "Absent today", tone: "bg-red-500" };
  else if (isDayExcused) activity = { icon: "🟡", text: "Excused today", tone: "bg-amber-500" };
  else if (!hasIn) activity = { icon: "⚪", text: "Not clocked in yet", tone: "bg-slate-400" };
  else if (hasOut) activity = { icon: "🏁", text: "Timed out for the day", tone: "bg-slate-500" };
  else if (openExcuse)
    activity = {
      icon: "✋",
      text: `On excuse · approved by ${openExcuse.approved_by}`,
      tone: "bg-amber-500",
    };
  else if (sched.hasLunch && nowMin >= 12 * 60 && nowMin < 13 * 60)
    activity = { icon: "🍽️", text: "Break time (lunch)", tone: "bg-orange-500" };
  else if (currentTask)
    activity = {
      icon: "🛠️",
      text: `Working on: ${currentTask.title}`,
      tone: "bg-brand-500",
      task: currentTask,
    };
  else activity = { icon: "🟢", text: "Clocked in — no task set for this hour", tone: "bg-emerald-500" };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
        {/* ---------- Header ---------- */}
        <div className="relative overflow-hidden rounded-3xl shadow-xl">
          <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-6 py-8 sm:px-10 sm:py-10 text-white">
            <div className="flex items-center justify-between gap-2 mb-6">
              <div className="leading-tight">
                <p className="font-bold text-sm">Homes.ph</p>
                <p className="text-[11px] text-brand-200">Daily Task Tracker · Live Status</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1 text-xs font-semibold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  LIVE {now ? `· ${formatManilaTime(now)}` : ""}
                </span>
                <ThemeToggle className="text-white" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full ring-4 ring-white/30 overflow-hidden bg-white/10 flex items-center justify-center text-3xl sm:text-4xl font-bold shrink-0">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <span>{initials(name)}</span>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold truncate">{name}</h1>
                <div className="mt-2 flex flex-wrap gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1.5 text-sm font-semibold">
                    <span className={`h-2.5 w-2.5 rounded-full ${activity.tone}`} />
                    {activity.icon} {activity.text}
                  </div>
                  {att?.in_location && (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1.5 text-sm font-semibold">
                      <MapPin className="size-4" /> {att.in_location}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- Attendance ---------- */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-card shadow border border-border p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Time In</p>
            {hasIn ? (
              <>
                <p className="text-xl font-bold text-foreground mt-1">
                  {formatManilaTime(new Date(att!.time_in!))}
                </p>
                {att!.in_status && (
                  <span
                    className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      IN_BADGE[att!.in_status] ?? "bg-slate-100 text-muted-foreground"
                    }`}
                  >
                    {IN_LABEL[att!.in_status] ?? att!.in_status}
                  </span>
                )}
                {att!.in_location && (
                  <p className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 dark:text-brand-300 bg-brand-500/10 border border-brand-500/20 rounded-lg px-2 py-1">
                    <MapPin className="size-4" /> {att!.in_location}
                  </p>
                )}
              </>
            ) : isAbsent ? (
              <p className="text-lg font-semibold text-red-600 mt-1">Absent</p>
            ) : isDayExcused ? (
              <p className="text-lg font-semibold text-amber-600 mt-1">Excused</p>
            ) : (
              <p className="text-lg font-semibold text-muted-foreground mt-1">—</p>
            )}
          </div>

          <div className="rounded-2xl bg-card shadow border border-border p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Time Out</p>
            {hasOut ? (
              <>
                <p className="text-xl font-bold text-foreground mt-1">
                  {formatManilaTime(new Date(att!.time_out!))}
                </p>
                {att!.out_status && (
                  <span
                    className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      OUT_BADGE[att!.out_status] ?? "bg-slate-100 text-muted-foreground"
                    }`}
                  >
                    {OUT_LABEL[att!.out_status] ?? att!.out_status}
                  </span>
                )}
                {att!.out_location && (
                  <p className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 dark:text-brand-300 bg-brand-500/10 border border-brand-500/20 rounded-lg px-2 py-1">
                    <MapPin className="size-4" /> {att!.out_location}
                  </p>
                )}
              </>
            ) : openExcuse ? (
              <p className="text-lg font-semibold text-amber-600 mt-1">✋ On excuse</p>
            ) : (
              <p className="text-lg font-semibold text-muted-foreground mt-1">
                {hasIn ? "Still working…" : "—"}
              </p>
            )}
          </div>
        </div>

        {/* excuse log */}
        {excuses.length > 0 && (
          <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1">
              Excuses today
            </p>
            {excuses.map((e) => (
              <p key={e.id} className="text-sm text-amber-800">
                ✋ {formatManilaTime(new Date(e.excused_at))}
                {e.resumed_at ? ` – ${formatManilaTime(new Date(e.resumed_at))}` : " – ongoing"} ·{" "}
                approved by {e.approved_by} · {e.reason}
              </p>
            ))}
          </div>
        )}

        {/* ---------- Tasks ---------- */}
        <div className="mt-6 rounded-3xl bg-card shadow-lg border border-border p-5 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-foreground">Today&apos;s Tasks</h2>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="size-4" /> {totalHours}h · {tasks.length} task{tasks.length === 1 ? "" : "s"}
            </span>
          </div>

          {tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No tasks logged yet today.</p>
          ) : (
            <ul className="space-y-3">
              {tasks.map((t) => {
                const isCurrent = currentTask?.id === t.id;
                const sm = statusMeta(t.status);
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => setSelected(t)}
                      className={`w-full text-left rounded-xl border p-4 transition hover:shadow-md hover:border-brand-300 ${
                        isCurrent ? "border-brand-400 bg-brand-50/60 ring-1 ring-brand-200" : "border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-semibold text-brand-700 w-36 shrink-0">
                          {slotLabel(t.start_hour, t.end_hour)}
                        </span>
                        <span className="font-medium text-foreground flex-1 min-w-0 truncate">
                          {t.title}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-600 text-white">
                            NOW
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-muted-foreground">
                          {typeLabel(t.type)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sm.badge}`}>
                          {sm.label}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="text-center text-muted-foreground text-xs mt-8">
          Live status via <span className="font-semibold text-muted-foreground">Homes.ph Daily Task Tracker</span> · updates automatically
        </p>
      </div>

      {/* ---------- Task detail modal ---------- */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl w-full max-w-md my-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold text-foreground">{selected.title}</h3>
              <button
                onClick={() => setSelected(null)}
                className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{slotLabel(selected.start_hour, selected.end_hour)}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                {typeLabel(selected.type)}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusMeta(selected.status).badge}`}>
                {statusMeta(selected.status).label}
              </span>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Description</p>
              <p className="text-sm text-foreground whitespace-pre-line">
                {selected.description?.trim() || "No description provided."}
              </p>
            </div>

            {selected.design_url && (
              <a
                href={selected.design_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-brand-700 dark:text-brand-300 hover:underline break-all"
              >
                <ExternalLink className="size-4" /> View design link
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
