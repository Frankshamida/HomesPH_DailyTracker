"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, CalendarDays, FileText, Link2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/layout/page";
import {
  formatManilaTime,
  getWorkSlots,
  getSchedule,
  manilaDateKey,
  manilaHour,
  slotLabel,
} from "@/lib/attendance";

type TaskType =
  | "development"
  | "bug_fixing"
  | "ui_designing"
  | "ui_implementation"
  | "ux_improvement"
  | "qa"
  | "testing"
  | "code_review"
  | "performance_optimization"
  | "security_enhancement"
  | "database_management"
  | "api_development"
  | "api_integration"
  | "frontend_development"
  | "backend_development"
  | "full_stack_development"
  | "devops"
  | "deployment"
  | "maintenance"
  | "feature_development"
  | "refactoring"
  | "research_development"
  | "documentation"
  | "technical_writing"
  | "auditing"
  | "website_audit"
  | "seo_optimization"
  | "accessibility"
  | "content_management"
  | "article_posting"
  | "blog_posting"
  | "image_editing"
  | "graphic_design"
  | "branding"
  | "data_entry"
  | "data_migration"
  | "client_support"
  | "user_support"
  | "training"
  | "meeting"
  | "planning"
  | "project_management";
type TaskStatus =
  | "pending"
  | "in_progress"
  | "on_hold"
  | "for_review"
  | "testing"
  | "completed"
  | "cancelled"
  | "reopened"
  // legacy values kept so previously-saved tasks still render
  | "ongoing"
  | "done";

interface DailyTask {
  id: string;
  work_date: string;
  title: string;
  description: string | null;
  type: TaskType;
  status: TaskStatus;
  start_hour: number;
  end_hour: number;
  design_url: string | null;
  archived?: boolean;
  carried_over_from?: string | null;
}

interface PastDay {
  date: string;
  tasks: DailyTask[];
  totalHours: number;
}

const TYPE_META: Record<TaskType, { label: string; needsUrl: boolean; badge: string }> = {
  development: { label: "Development", needsUrl: false, badge: "bg-indigo-100 text-indigo-700" },
  bug_fixing: { label: "Bug Fixing", needsUrl: false, badge: "bg-red-100 text-red-700" },
  ui_designing: { label: "UI Designing", needsUrl: true, badge: "bg-pink-100 text-pink-700" },
  ui_implementation: { label: "UI Implementation", needsUrl: true, badge: "bg-rose-100 text-rose-700" },
  ux_improvement: { label: "UX Improvement", needsUrl: true, badge: "bg-fuchsia-100 text-fuchsia-700" },
  qa: { label: "Quality Assurance (QA)", needsUrl: true, badge: "bg-amber-100 text-amber-700" },
  testing: { label: "Testing", needsUrl: true, badge: "bg-yellow-100 text-yellow-700" },
  code_review: { label: "Code Review", needsUrl: true, badge: "bg-purple-100 text-purple-700" },
  performance_optimization: { label: "Performance Optimization", needsUrl: false, badge: "bg-orange-100 text-orange-700" },
  security_enhancement: { label: "Security Enhancement", needsUrl: false, badge: "bg-muted text-foreground" },
  database_management: { label: "Database Management", needsUrl: false, badge: "bg-teal-100 text-teal-700" },
  api_development: { label: "API Development", needsUrl: false, badge: "bg-cyan-100 text-cyan-700" },
  api_integration: { label: "API Integration", needsUrl: false, badge: "bg-sky-100 text-sky-700" },
  frontend_development: { label: "Frontend Development", needsUrl: false, badge: "bg-blue-100 text-blue-700" },
  backend_development: { label: "Backend Development", needsUrl: false, badge: "bg-indigo-100 text-indigo-700" },
  full_stack_development: { label: "Full Stack Development", needsUrl: false, badge: "bg-violet-100 text-violet-700" },
  devops: { label: "DevOps", needsUrl: false, badge: "bg-emerald-100 text-emerald-700" },
  deployment: { label: "Deployment", needsUrl: false, badge: "bg-green-100 text-green-700" },
  maintenance: { label: "Maintenance", needsUrl: false, badge: "bg-lime-100 text-lime-700" },
  feature_development: { label: "Feature Development", needsUrl: false, badge: "bg-indigo-100 text-indigo-700" },
  refactoring: { label: "Refactoring", needsUrl: false, badge: "bg-amber-100 text-amber-700" },
  research_development: { label: "Research & Development (R&D)", needsUrl: false, badge: "bg-purple-100 text-purple-700" },
  documentation: { label: "Documentation", needsUrl: true, badge: "bg-stone-100 text-stone-700" },
  technical_writing: { label: "Technical Writing", needsUrl: true, badge: "bg-neutral-100 text-neutral-700" },
  auditing: { label: "Auditing", needsUrl: false, badge: "bg-zinc-100 text-zinc-700" },
  website_audit: { label: "Website Audit", needsUrl: true, badge: "bg-orange-100 text-orange-700" },
  seo_optimization: { label: "SEO Optimization", needsUrl: true, badge: "bg-green-100 text-green-700" },
  accessibility: { label: "Accessibility (A11y)", needsUrl: true, badge: "bg-teal-100 text-teal-700" },
  content_management: { label: "Content Management", needsUrl: true, badge: "bg-cyan-100 text-cyan-700" },
  article_posting: { label: "Article Posting", needsUrl: true, badge: "bg-sky-100 text-sky-700" },
  blog_posting: { label: "Blog Posting", needsUrl: true, badge: "bg-blue-100 text-blue-700" },
  image_editing: { label: "Image Editing", needsUrl: true, badge: "bg-pink-100 text-pink-700" },
  graphic_design: { label: "Graphic Design", needsUrl: true, badge: "bg-rose-100 text-rose-700" },
  branding: { label: "Branding", needsUrl: true, badge: "bg-fuchsia-100 text-fuchsia-700" },
  data_entry: { label: "Data Entry", needsUrl: false, badge: "bg-muted text-foreground" },
  data_migration: { label: "Data Migration", needsUrl: false, badge: "bg-teal-100 text-teal-700" },
  client_support: { label: "Client Support", needsUrl: false, badge: "bg-emerald-100 text-emerald-700" },
  user_support: { label: "User Support", needsUrl: false, badge: "bg-green-100 text-green-700" },
  training: { label: "Training", needsUrl: false, badge: "bg-amber-100 text-amber-700" },
  meeting: { label: "Meeting", needsUrl: false, badge: "bg-violet-100 text-violet-700" },
  planning: { label: "Planning", needsUrl: false, badge: "bg-indigo-100 text-indigo-700" },
  project_management: { label: "Project Management", needsUrl: false, badge: "bg-blue-100 text-blue-700" },
};

const STATUS_META: Record<TaskStatus, { label: string; badge: string }> = {
  pending: { label: "📝 Pending", badge: "bg-muted text-foreground" },
  in_progress: { label: "🚀 In Progress", badge: "bg-sky-100 text-sky-700" },
  on_hold: { label: "⏸️ On Hold", badge: "bg-amber-100 text-amber-700" },
  for_review: { label: "👀 For Review", badge: "bg-violet-100 text-violet-700" },
  testing: { label: "🧪 Testing", badge: "bg-yellow-100 text-yellow-700" },
  completed: { label: "✅ Completed", badge: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "❌ Cancelled", badge: "bg-red-100 text-red-700" },
  reopened: { label: "🔄 Reopened", badge: "bg-orange-100 text-orange-700" },
  // legacy
  ongoing: { label: "🚀 In Progress", badge: "bg-sky-100 text-sky-700" },
  done: { label: "✅ Completed", badge: "bg-emerald-100 text-emerald-700" },
};

// statuses offered in the pickers (legacy values are display-only)
const STATUS_OPTIONS: TaskStatus[] = [
  "pending",
  "in_progress",
  "on_hold",
  "for_review",
  "testing",
  "completed",
  "cancelled",
  "reopened",
];

function statusMeta(s: string) {
  return STATUS_META[s as TaskStatus] ?? { label: s, badge: "bg-muted text-muted-foreground" };
}

interface Block {
  start: number;
  end: number;
  task: DailyTask | null; // null = uncovered
  taskIds: string[];
}

export default function DailyTaskClient({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [now, setNow] = useState<Date | null>(null);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [reminder, setReminder] = useState<string | null>(null);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>("default");

  // report
  const [report, setReport] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // share link
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // past tasks
  const [past, setPast] = useState<PastDay[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reportDate, setReportDate] = useState<string | null>(null); // which day the report is for

  // form / modal
  const [open, setOpen] = useState(false);
  const [editingIds, setEditingIds] = useState<string[] | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [descLoading, setDescLoading] = useState(false);
  const [type, setType] = useState<TaskType>("development");
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(10);
  const [designUrl, setDesignUrl] = useState("");
  const [formErr, setFormErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [typeQuery, setTypeQuery] = useState("");
  const typeBoxRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [carryOptions, setCarryOptions] = useState<DailyTask[]>([]);
  const [carryFrom, setCarryFrom] = useState<string | null>(null);
  const [carrySelId, setCarrySelId] = useState("");

  const remindedRef = useRef<Set<string>>(new Set());

  const baseDate = now ?? new Date();
  const todayKey = manilaDateKey(baseDate);
  const slots = getWorkSlots(baseDate);
  const sched = getSchedule(baseDate);
  const currentHour = now ? manilaHour(now) : -1;

  // clock
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPerm(Notification.permission);
    }
  }, []);

  useEffect(() => setMounted(true), []);

  // lock background scroll while any modal is open
  useEffect(() => {
    if (!(open || shareOpen)) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, shareOpen]);

  // close the searchable Type dropdown when clicking outside it
  useEffect(() => {
    if (!typeOpen) return;
    function onDown(e: MouseEvent) {
      if (typeBoxRef.current && !typeBoxRef.current.contains(e.target as Node)) {
        setTypeOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [typeOpen]);

  const load = useCallback(async () => {
    const key = manilaDateKey(new Date());
    // Live tracker = today's NOT-archived tasks
    const { data } = await supabase
      .from("daily_task")
      .select("*")
      .eq("user_id", userId)
      .eq("work_date", key)
      .eq("archived", false)
      .order("start_hour");
    setTasks((data as DailyTask[]) ?? []);
  }, [supabase, userId]);

  const loadPast = useCallback(async () => {
    // Past = archived tasks, grouped by date (most recent first)
    const { data } = await supabase
      .from("daily_task")
      .select("*")
      .eq("user_id", userId)
      .eq("archived", true)
      .order("work_date", { ascending: false })
      .order("start_hour");
    const rows = (data as DailyTask[]) ?? [];
    const map = new Map<string, DailyTask[]>();
    for (const r of rows) {
      if (!map.has(r.work_date)) map.set(r.work_date, []);
      map.get(r.work_date)!.push(r);
    }
    const days: PastDay[] = Array.from(map.entries()).map(([date, tks]) => ({
      date,
      tasks: tks,
      totalHours: tks.reduce((s, t) => s + (t.end_hour - t.start_hour), 0),
    }));
    setPast(days);
  }, [supabase, userId]);

  // Unfinished tasks from previous days that can be carried over into today.
  const loadCarry = useCallback(async () => {
    const key = manilaDateKey(new Date());
    const { data } = await supabase
      .from("daily_task")
      .select("*")
      .eq("user_id", userId)
      .lt("work_date", key)
      .not("status", "in", "(completed,done,cancelled)")
      .order("work_date", { ascending: false })
      .order("start_hour");
    // De-duplicate by title+type — keep the most recent occurrence only.
    const seen = new Set<string>();
    const list: DailyTask[] = [];
    for (const r of (data as DailyTask[]) ?? []) {
      const k = `${r.title.trim().toLowerCase()}|${r.type}`;
      if (seen.has(k)) continue;
      seen.add(k);
      list.push(r);
    }
    setCarryOptions(list);
  }, [supabase, userId]);

  const generateReport = useCallback(async (dateKey?: string) => {
    const key = dateKey ?? manilaDateKey(new Date());
    setReportDate(key);
    setReportLoading(true);
    setCopied(false);
    const { data } = await supabase
      .from("daily_task")
      .select("*")
      .eq("user_id", userId)
      .eq("work_date", key)
      .order("start_hour");
    const list = (data as DailyTask[]) ?? [];
    const totalHours = list.reduce((sum, t) => sum + (t.end_hour - t.start_hour), 0);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "report",
          totalHours,
          tasks: list.map((t) => ({
            title: t.title,
            description: t.description ?? "",
            type: t.type,
            status: t.status,
            start: t.start_hour,
            end: t.end_hour,
            carriedOverFrom: t.carried_over_from ?? null,
          })),
        }),
      });
      const json = await res.json();
      setReport(json.report as string);
    } catch {
      setReport("Sorry, the report could not be generated. Please try again.");
    } finally {
      setReportLoading(false);
    }
  }, [supabase, userId]);

  async function generateLink(dateKey?: string) {
    setShareLoading(true);
    setShareCopied(false);
    setShareUrl(null);
    setShareOpen(true);
    const key = dateKey ?? manilaDateKey(new Date());
    const { data, error } = await supabase
      .from("share_link")
      .upsert({ user_id: userId, work_date: key }, { onConflict: "user_id,work_date" })
      .select("token")
      .maybeSingle();
    setShareLoading(false);
    if (error || !data) {
      flash(error?.message ?? "Could not create link.");
      setShareOpen(false);
      return;
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    setShareUrl(`${origin}/share/${data.token}`);
  }

  useEffect(() => {
    load();
    loadPast();
    loadCarry();
  }, [load, loadPast, loadCarry]);

  // Auto-generate when arriving from the Time-out "Create Report" button
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("hph-autoreport")) {
      sessionStorage.removeItem("hph-autoreport");
      generateReport();
    }
  }, [generateReport]);

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 3500);
  };

  // hour -> task map (first task covering that hour)
  const hourMap = useMemo(() => {
    const m = new Map<number, DailyTask>();
    for (const t of tasks) {
      for (let h = t.start_hour; h < t.end_hour; h++) {
        if (!m.has(h)) m.set(h, t);
      }
    }
    return m;
  }, [tasks]);

  // Build merged timeline blocks across work slots
  const blocks = useMemo<Block[]>(() => {
    const result: Block[] = [];
    const keyOf = (t: DailyTask | null) =>
      t ? `${t.type}|${t.title.trim().toLowerCase()}|${t.status}|${t.design_url ?? ""}|${t.description ?? ""}` : "__empty__";

    for (const s of slots) {
      const t = hourMap.get(s) ?? null;
      const last = result[result.length - 1];
      if (last && last.end === s && keyOf(last.task) === keyOf(t)) {
        last.end = s + 1;
        if (t && !last.taskIds.includes(t.id)) last.taskIds.push(t.id);
      } else {
        result.push({ start: s, end: s + 1, task: t, taskIds: t ? [t.id] : [] });
      }
    }
    return result;
  }, [slots, hourMap]);

  // ------- reminders -------
  const checkReminder = useCallback(() => {
    if (!now) return;
    if (sched.dayType === "sunday") return;
    if (!slots.includes(currentHour)) return; // outside work slots / lunch
    if (hourMap.has(currentHour)) {
      setReminder(null);
      return;
    }
    const key = `${todayKey}-${currentHour}`;
    const label = slotLabel(currentHour, currentHour + 1);
    setReminder(`You haven't logged a task for ${label}. Add one to keep your tracker complete.`);
    if (!remindedRef.current.has(key)) {
      remindedRef.current.add(key);
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification("Homes.ph Daily Task Tracker", {
          body: `No task set for ${label}. Please log what you're working on.`,
        });
      }
    }
  }, [now, sched.dayType, slots, currentHour, hourMap, todayKey]);

  useEffect(() => {
    checkReminder();
  }, [checkReminder, currentHour, tasks]);

  function enableNotifications() {
    if (!("Notification" in window)) return flash("This browser doesn't support notifications.");
    Notification.requestPermission().then((p) => {
      setNotifPerm(p);
      if (p === "granted") flash("Hourly reminders enabled ✓");
    });
  }

  // ------- form -------
  function openAdd(prefillStart?: number) {
    const first = prefillStart ?? slots.find((s) => !hourMap.has(s)) ?? slots[0] ?? 9;
    setEditingIds(null);
    setTitle("");
    setDescription("");
    setType("development");
    setStatus("pending");
    setStartHour(first);
    setEndHour(first + 1);
    setDesignUrl("");
    setFormErr(null);
    setTypeQuery("");
    setTypeOpen(false);
    setCarryFrom(null);
    setCarrySelId("");
    setOpen(true);
  }

  function openEdit(b: Block) {
    if (!b.task) return openAdd(b.start);
    setEditingIds(b.taskIds);
    setTitle(b.task.title);
    setDescription(b.task.description ?? "");
    setType(b.task.type);
    setStatus(b.task.status);
    setStartHour(b.start);
    setEndHour(b.end);
    setDesignUrl(b.task.design_url ?? "");
    setFormErr(null);
    setTypeQuery("");
    setTypeOpen(false);
    setCarryFrom(b.task.carried_over_from ?? null);
    setCarrySelId("");
    setOpen(true);
  }

  async function quickStatus(b: Block, next: TaskStatus) {
    if (!b.taskIds.length) return;
    await supabase.from("daily_task").update({ status: next, updated_at: new Date().toISOString() }).in("id", b.taskIds);
    load();
  }

  async function generateDescription() {
    if (!title.trim()) return setFormErr("Please enter a task title first, then generate.");
    setFormErr(null);
    setDescLoading(true);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "describe",
          title: title.trim(),
          type: TYPE_META[type].label,
          status,
        }),
      });
      const data = await res.json();
      if (data?.description) setDescription(String(data.description).trim());
      else setFormErr("Couldn't generate a description. Please try again.");
    } catch {
      setFormErr("Couldn't generate a description. Please try again.");
    } finally {
      setDescLoading(false);
    }
  }

  async function save() {
    setFormErr(null);
    if (!title.trim()) return setFormErr("Please enter a task title.");
    if (endHour <= startHour) return setFormErr("End time must be after start time.");
    if (TYPE_META[type].needsUrl && !designUrl.trim())
      return setFormErr(`A design URL is required for ${TYPE_META[type].label}.`);

    setSaving(true);
    const payload = {
      user_id: userId,
      work_date: todayKey,
      title: title.trim(),
      description: description.trim() || null,
      type,
      status,
      start_hour: startHour,
      end_hour: endHour,
      design_url: TYPE_META[type].needsUrl ? designUrl.trim() : null,
      carried_over_from: carryFrom,
      updated_at: new Date().toISOString(),
    };

    // Editing a (possibly merged) block: remove underlying rows, insert one consolidated row.
    if (editingIds && editingIds.length) {
      await supabase.from("daily_task").delete().in("id", editingIds);
    }
    const { error } = await supabase.from("daily_task").insert(payload);
    setSaving(false);
    if (error) return setFormErr(error.message);
    setOpen(false);
    flash(editingIds ? "Task updated ✓" : "Task added ✓");
    load();
    loadCarry();
  }

  async function remove(b: Block) {
    if (!b.taskIds.length) return;
    if (!window.confirm("Delete this task?")) return;
    await supabase.from("daily_task").delete().in("id", b.taskIds);
    load();
  }

  const endOptions = slots.map((s) => s + 1).filter((e) => e > startHour);

  return (
    <PageContainer className="max-w-[1100px]">
      {/* Header */}
      <PageHeader
        icon={CalendarDays}
        title="My Daily Task"
        description={
          now
            ? `${new Intl.DateTimeFormat("en-US", {
                timeZone: "Asia/Manila",
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              }).format(now)}  ·  ${formatManilaTime(now)}`
            : "…"
        }
        actions={
          <>
            {notifPerm !== "granted" && (
              <Button variant="outline" size="sm" onClick={enableNotifications}>
                <Bell /> Enable reminders
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => generateLink()}
              disabled={shareLoading || sched.dayType === "sunday"}
            >
              <Link2 /> Share Link
            </Button>
            <Button
              variant="secondary"
              onClick={() => generateReport()}
              loading={reportLoading}
              disabled={reportLoading || sched.dayType === "sunday" || tasks.length === 0}
              title={tasks.length === 0 ? "Add at least one task before generating a report." : undefined}
            >
              <FileText /> Generate Report
            </Button>
            <Button onClick={() => openAdd()} disabled={sched.dayType === "sunday"}>
              <Plus /> Add Task
            </Button>
          </>
        }
      />

      {msg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 text-sm font-medium">
          {msg}
        </div>
      )}
      {reminder && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-sm font-medium flex items-center gap-2">
          <span>⏰</span> {reminder}
        </div>
      )}

      {(report || reportLoading) && (
        <section className="bg-card rounded-2xl shadow-sm border border-brand-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-foreground">📝 Daily Work Report</h2>
              <p className="text-xs text-muted-foreground">
                {reportDate ? `For ${reportDate}` : "Today"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => generateReport(reportDate ?? undefined)}
                disabled={reportLoading}
                className="text-xs font-medium border border-border rounded-lg px-3 py-1.5 hover:bg-muted/50 disabled:opacity-50"
              >
                {reportLoading ? "…" : "↻ Regenerate"}
              </button>
              <button
                onClick={() => {
                  if (report) {
                    navigator.clipboard.writeText(report);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
                disabled={!report}
                className="text-xs font-semibold bg-brand-600 text-white rounded-lg px-3 py-1.5 hover:bg-brand-700 disabled:opacity-50"
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>
          </div>
          <div className="p-6">
            {reportLoading && !report ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <span className="animate-pulse">✍️</span> Summarizing your day…
              </div>
            ) : (
              <textarea
                value={report ?? ""}
                onChange={(e) => setReport(e.target.value)}
                rows={Math.max(6, (report ?? "").split("\n").length + 1)}
                className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground leading-relaxed focus:ring-2 focus:ring-brand-500 outline-none whitespace-pre-wrap"
              />
            )}
            <p className="text-xs text-muted-foreground mt-2">
              You can edit the report above before copying it.
            </p>
          </div>
        </section>
      )}

      {sched.dayType === "sunday" ? (
        <div className="bg-card rounded-2xl border border-border p-10 text-center text-muted-foreground">
          Today is Sunday — a rest day. No hourly tracker.
        </div>
      ) : (
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-bold text-foreground">Hourly Tracker</h2>
            <span className="text-xs text-muted-foreground">
              {sched.dayType === "saturday" ? "Sat 9:00 AM – 12:00 PM" : "9:00 AM – 6:00 PM (lunch 12–1)"}
            </span>
          </div>

          <ul className="divide-y divide-border">
            {blocks.map((b) => {
              const isNow = currentHour >= b.start && currentHour < b.end;
              const meta = b.task ? (TYPE_META[b.task.type] ?? TYPE_META.development) : null;
              return (
                <li
                  key={`${b.start}-${b.end}`}
                  className={`flex items-center gap-4 px-6 py-4 ${isNow ? "bg-brand-50/60" : ""}`}
                >
                  <div className="w-40 shrink-0">
                    <p className="text-sm font-semibold text-foreground">{slotLabel(b.start, b.end)}</p>
                    {isNow && <span className="text-[10px] font-bold text-brand-600 uppercase">now</span>}
                  </div>

                  {b.task ? (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-medium text-foreground">{b.task.title}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${meta!.badge}`}>
                          {meta!.label}
                        </span>
                        <select
                          value={b.task.status}
                          onChange={(e) => quickStatus(b, e.target.value as TaskStatus)}
                          className={`text-xs font-semibold rounded-full px-2 py-0.5 border-0 cursor-pointer ${statusMeta(b.task.status).badge}`}
                        >
                          {!STATUS_OPTIONS.includes(b.task.status) && (
                            <option value={b.task.status}>{statusMeta(b.task.status).label}</option>
                          )}
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_META[s].label}
                            </option>
                          ))}
                        </select>
                        {b.task.design_url && (
                          <a
                            href={b.task.design_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-brand-700 underline truncate max-w-[180px]"
                          >
                            🔗 design
                          </a>
                        )}
                      </div>
                      {b.task.description && (
                        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{b.task.description}</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1">
                      <span className="text-sm text-muted-foreground italic">No task set</span>
                    </div>
                  )}

                  <div className="shrink-0 flex gap-2">
                    {b.task ? (
                      <>
                        <button
                          onClick={() => openEdit(b)}
                          className="text-xs font-medium text-muted-foreground hover:text-brand-700 border border-border rounded-lg px-2.5 py-1"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => remove(b)}
                          className="text-xs font-medium text-muted-foreground hover:text-red-600 border border-border rounded-lg px-2.5 py-1"
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => openAdd(b.start)}
                        className="text-xs font-semibold text-brand-700 hover:text-brand-800 border border-brand-200 bg-brand-50 rounded-lg px-2.5 py-1"
                      >
                        + Add
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Past Tasks */}
      <section className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-bold text-foreground">🗂️ Past Tasks</h2>
          <p className="text-xs text-muted-foreground">
            Completed days (archived after you time out). Click a day to view its tasks.
          </p>
        </div>

        {past.length === 0 ? (
          <div className="px-6 py-10 text-center text-muted-foreground text-sm">
            No past tasks yet. Your tasks move here after you time out for the day.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Date</th>
                  <th className="text-left px-4 py-3 font-semibold">Hours</th>
                  <th className="text-left px-4 py-3 font-semibold">Tasks</th>
                  <th className="text-right px-6 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {past.map((d) => (
                  <Fragment key={d.date}>
                    <tr className="hover:bg-muted/50">
                      <td className="px-6 py-3 font-medium text-foreground">{d.date}</td>
                      <td className="px-4 py-3 text-muted-foreground">{d.totalHours}h</td>
                      <td className="px-4 py-3 text-muted-foreground">{d.tasks.length}</td>
                      <td className="px-6 py-3">
                        <div className="flex gap-2 justify-end flex-wrap">
                          <button
                            onClick={() => setExpanded(expanded === d.date ? null : d.date)}
                            className="text-xs font-medium text-muted-foreground hover:text-brand-700 border border-border rounded-lg px-2.5 py-1"
                          >
                            {expanded === d.date ? "Hide" : "View"}
                          </button>
                          <button
                            onClick={() => generateLink(d.date)}
                            className="text-xs font-medium text-muted-foreground hover:text-brand-700 border border-border rounded-lg px-2.5 py-1"
                          >
                            🔗 Link
                          </button>
                          <button
                            onClick={() => generateReport(d.date)}
                            className="text-xs font-semibold text-brand-700 border border-brand-200 bg-brand-50 rounded-lg px-2.5 py-1 hover:bg-brand-100"
                          >
                            📝 Report
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded === d.date && (
                      <tr>
                        <td colSpan={4} className="px-6 py-3 bg-muted/50/70">
                          <ul className="space-y-2">
                            {d.tasks.map((t) => {
                              const meta = TYPE_META[t.type] ?? TYPE_META.development;
                              return (
                                <li key={t.id} className="text-sm">
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <span className="font-semibold text-brand-700 w-40">
                                      {slotLabel(t.start_hour, t.end_hour)}
                                    </span>
                                    <span className="text-foreground">{t.title}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${meta.badge}`}>
                                      {meta.label}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusMeta(t.status).badge}`}>
                                      {statusMeta(t.status).label}
                                    </span>
                                    {t.design_url && (
                                      <a
                                        href={t.design_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-brand-700 underline"
                                      >
                                        🔗 design
                                      </a>
                                    )}
                                  </div>
                                  {t.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5 ml-[10.75rem] whitespace-pre-line">
                                      {t.description}
                                    </p>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Share link modal */}
      {shareOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md my-auto p-6">
            <h3 className="text-lg font-bold text-foreground mb-1">🔗 Share your daily task</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Anyone with this link can view that day&apos;s tasks, your name, photo and design links
              (read-only).
            </p>

            {shareLoading || !shareUrl ? (
              <div className="text-muted-foreground text-sm py-4">Creating link…</div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 rounded-lg border border-input px-3 py-2 text-sm bg-muted/50"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      setShareCopied(true);
                      setTimeout(() => setShareCopied(false), 2000);
                    }}
                    className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg px-4"
                  >
                    {shareCopied ? "Copied ✓" : "Copy"}
                  </button>
                </div>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-3 text-sm text-brand-700 underline"
                >
                  Open preview →
                </a>
              </>
            )}

            <button
              onClick={() => setShareOpen(false)}
              className="mt-6 w-full border border-input rounded-lg py-2.5 font-medium text-muted-foreground hover:bg-muted/50"
            >
              Close
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Modal */}
      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md my-auto max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-bold text-foreground px-6 pt-6 pb-4 shrink-0">
              {editingIds ? "Edit Task" : "Add Task"}
            </h3>

            <div className="space-y-4 px-6 pb-4 overflow-y-auto">
              {!editingIds && carryOptions.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <label className="block text-sm font-semibold text-amber-800 mb-1">
                    ↩ Carry over an unfinished task
                  </label>
                  <select
                    value={carrySelId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setCarrySelId(id);
                      if (!id) {
                        setCarryFrom(null);
                        return;
                      }
                      const t = carryOptions.find((c) => c.id === id);
                      if (!t) return;
                      setTitle(t.title);
                      setDescription(t.description ?? "");
                      setType(t.type);
                      setStatus(
                        STATUS_OPTIONS.includes(t.status) ? t.status : "in_progress"
                      );
                      if (t.design_url) setDesignUrl(t.design_url);
                      setCarryFrom(t.carried_over_from ?? t.work_date);
                    }}
                    className="w-full rounded-lg border border-amber-300 bg-card px-3 py-2 text-sm"
                  >
                    <option value="">Start a new task instead…</option>
                    {carryOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} · {statusMeta(t.status).label} · {t.work_date}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-amber-700 mt-1">
                    Picks a task you didn&apos;t finish before. The report will note it was continued
                    from that day.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Task title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Regression testing of listings page"
                  className="w-full rounded-lg border border-input px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Type</label>
                  <div ref={typeBoxRef} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setTypeQuery("");
                        setTypeOpen((v) => !v);
                      }}
                      className="w-full flex items-center justify-between gap-2 rounded-lg border border-input px-3 py-2 text-left focus:ring-2 focus:ring-brand-500 outline-none"
                    >
                      <span className="truncate">{TYPE_META[type].label}</span>
                      <span className="text-muted-foreground shrink-0">▾</span>
                    </button>
                    {typeOpen && (
                      <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
                        <div className="p-2 border-b border-border">
                          <input
                            autoFocus
                            value={typeQuery}
                            onChange={(e) => setTypeQuery(e.target.value)}
                            placeholder="Search type…"
                            className="w-full rounded-md border border-input px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                          />
                        </div>
                        <ul className="max-h-52 overflow-y-auto py-1">
                          {(Object.keys(TYPE_META) as TaskType[])
                            .filter((t) =>
                              TYPE_META[t].label.toLowerCase().includes(typeQuery.trim().toLowerCase())
                            )
                            .map((t) => (
                              <li key={t}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setType(t);
                                    setTypeOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-brand-50 ${
                                    t === type ? "bg-brand-50 font-semibold text-brand-700" : "text-foreground"
                                  }`}
                                >
                                  {TYPE_META[t].label}
                                </button>
                              </li>
                            ))}
                          {(Object.keys(TYPE_META) as TaskType[]).filter((t) =>
                            TYPE_META[t].label.toLowerCase().includes(typeQuery.trim().toLowerCase())
                          ).length === 0 && (
                            <li className="px-3 py-2 text-sm text-muted-foreground">No matching type</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full rounded-lg border border-input px-3 py-2"
                  >
                    {!STATUS_OPTIONS.includes(status) && (
                      <option value={status}>{statusMeta(status).label}</option>
                    )}
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_META[s].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-foreground">
                    Description <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateDescription}
                    disabled={descLoading || !title.trim()}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-md px-2 py-1 hover:bg-brand-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {descLoading ? "Generating…" : "✨ Generate with AI"}
                  </button>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="What is this task about? Or tap ✨ Generate with AI to write it from the title & type."
                  className="w-full rounded-lg border border-input px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none resize-y"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">From</label>
                  <select
                    value={startHour}
                    onChange={(e) => {
                      const s = Number(e.target.value);
                      setStartHour(s);
                      if (endHour <= s) setEndHour(s + 1);
                    }}
                    className="w-full rounded-lg border border-input px-3 py-2"
                  >
                    {slots.map((s) => (
                      <option key={s} value={s}>
                        {slotLabel(s, s + 1).split(" – ")[0]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">To</label>
                  <select
                    value={endHour}
                    onChange={(e) => setEndHour(Number(e.target.value))}
                    className="w-full rounded-lg border border-input px-3 py-2"
                  >
                    {endOptions.map((e2) => (
                      <option key={e2} value={e2}>
                        {slotLabel(e2 - 1, e2).split(" – ")[1]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {TYPE_META[type].needsUrl && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Design URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={designUrl}
                    onChange={(e) => setDesignUrl(e.target.value)}
                    placeholder="https://figma.com/… or the design link"
                    className="w-full rounded-lg border border-input px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Required for {TYPE_META[type].label}.
                  </p>
                </div>
              )}

              {formErr && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {formErr}
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-5 shrink-0 border-t border-border">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 border border-input rounded-lg py-2.5 font-medium text-muted-foreground hover:bg-muted/50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5"
              >
                {saving ? "Saving…" : editingIds ? "Save changes" : "Add task"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </PageContainer>
  );
}
