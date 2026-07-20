import Image from "next/image";
import { CheckCircle2, Clock, ExternalLink, Link2, UtensilsCrossed } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ThemeToggle from "@/components/ui/theme-toggle";
import { slotLabel } from "@/lib/attendance";

export const dynamic = "force-dynamic";

const TYPE_META: Record<string, { label: string; badge: string; dot: string }> = {
  development: { label: "Development", badge: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
  bug_fixing: { label: "Bug Fixing", badge: "bg-red-100 text-red-700", dot: "bg-red-500" },
  ui_designing: { label: "UI Designing", badge: "bg-pink-100 text-pink-700", dot: "bg-pink-500" },
  ui_implementation: { label: "UI Implementation", badge: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
  ux_improvement: { label: "UX Improvement", badge: "bg-fuchsia-100 text-fuchsia-700", dot: "bg-fuchsia-500" },
  qa: { label: "Quality Assurance (QA)", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  testing: { label: "Testing", badge: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
  code_review: { label: "Code Review", badge: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  performance_optimization: { label: "Performance Optimization", badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  security_enhancement: { label: "Security Enhancement", badge: "bg-slate-100 text-foreground", dot: "bg-slate-500" },
  database_management: { label: "Database Management", badge: "bg-teal-100 text-teal-700", dot: "bg-teal-500" },
  api_development: { label: "API Development", badge: "bg-cyan-100 text-cyan-700", dot: "bg-cyan-500" },
  api_integration: { label: "API Integration", badge: "bg-sky-100 text-sky-700", dot: "bg-sky-500" },
  frontend_development: { label: "Frontend Development", badge: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  backend_development: { label: "Backend Development", badge: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
  full_stack_development: { label: "Full Stack Development", badge: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
  devops: { label: "DevOps", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  deployment: { label: "Deployment", badge: "bg-green-100 text-green-700", dot: "bg-green-500" },
  maintenance: { label: "Maintenance", badge: "bg-lime-100 text-lime-700", dot: "bg-lime-500" },
  feature_development: { label: "Feature Development", badge: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
  refactoring: { label: "Refactoring", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  research_development: { label: "Research & Development (R&D)", badge: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  documentation: { label: "Documentation", badge: "bg-stone-100 text-stone-700", dot: "bg-stone-500" },
  technical_writing: { label: "Technical Writing", badge: "bg-neutral-100 text-neutral-700", dot: "bg-neutral-500" },
  auditing: { label: "Auditing", badge: "bg-zinc-100 text-zinc-700", dot: "bg-zinc-500" },
  website_audit: { label: "Website Audit", badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  seo_optimization: { label: "SEO Optimization", badge: "bg-green-100 text-green-700", dot: "bg-green-500" },
  accessibility: { label: "Accessibility (A11y)", badge: "bg-teal-100 text-teal-700", dot: "bg-teal-500" },
  content_management: { label: "Content Management", badge: "bg-cyan-100 text-cyan-700", dot: "bg-cyan-500" },
  article_posting: { label: "Article Posting", badge: "bg-sky-100 text-sky-700", dot: "bg-sky-500" },
  blog_posting: { label: "Blog Posting", badge: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  image_editing: { label: "Image Editing", badge: "bg-pink-100 text-pink-700", dot: "bg-pink-500" },
  graphic_design: { label: "Graphic Design", badge: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
  branding: { label: "Branding", badge: "bg-fuchsia-100 text-fuchsia-700", dot: "bg-fuchsia-500" },
  data_entry: { label: "Data Entry", badge: "bg-slate-100 text-foreground", dot: "bg-slate-500" },
  data_migration: { label: "Data Migration", badge: "bg-teal-100 text-teal-700", dot: "bg-teal-500" },
  client_support: { label: "Client Support", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  user_support: { label: "User Support", badge: "bg-green-100 text-green-700", dot: "bg-green-500" },
  training: { label: "Training", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  meeting: { label: "Meeting", badge: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
  planning: { label: "Planning", badge: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
  project_management: { label: "Project Management", badge: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
};

const STATUS_META: Record<string, { label: string; badge: string }> = {
  pending: { label: "📝 Pending", badge: "bg-slate-100 text-foreground" },
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

function statusMeta(s: string) {
  return STATUS_META[s] ?? { label: s, badge: "bg-slate-100 text-muted-foreground" };
}

// Standard workday slots (lunch 12–1 excluded)
const SLOTS = [9, 10, 11, 13, 14, 15, 16, 17];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0][0]!.toUpperCase();
  return (parts[0][0]! + parts[parts.length - 1][0]!).toUpperCase();
}

function prettyDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

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

interface Block {
  start: number;
  end: number;
  task: DailyTask | null;
}

function buildBlocks(tasks: DailyTask[]): Block[] {
  const hourMap = new Map<number, DailyTask>();
  for (const t of tasks) {
    for (let h = t.start_hour; h < t.end_hour; h++) {
      if (!hourMap.has(h)) hourMap.set(h, t);
    }
  }
  const keyOf = (t: DailyTask | null) =>
    t ? `${t.type}|${t.title.trim().toLowerCase()}|${t.status}|${t.design_url ?? ""}|${t.description ?? ""}` : "__empty__";

  const blocks: Block[] = [];
  for (const s of SLOTS) {
    const t = hourMap.get(s) ?? null;
    const last = blocks[blocks.length - 1];
    if (last && last.end === s && keyOf(last.task) === keyOf(t)) {
      last.end = s + 1;
    } else {
      blocks.push({ start: s, end: s + 1, task: t });
    }
  }
  return blocks;
}

function TaskRow({ block }: { block: Block }) {
  const t = block.task;
  const meta = t ? TYPE_META[t.type] ?? TYPE_META.development : null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-stretch gap-2 sm:gap-4">
      {/* Time */}
      <div className="sm:w-40 sm:shrink-0 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${t ? meta!.dot : "bg-slate-300"}`} />
        <span className="text-sm font-semibold text-foreground">
          {slotLabel(block.start, block.end)}
        </span>
      </div>

      {/* Card */}
      {t ? (
        <div className="flex-1 rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="font-semibold text-foreground">{t.title}</p>
          {t.description && (
            <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">{t.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${meta!.badge}`}>
              {meta!.label}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusMeta(t.status).badge}`}
            >
              {statusMeta(t.status).label}
            </span>
            {t.design_url && (
              <a
                href={t.design_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 dark:text-brand-300 hover:underline break-all"
              >
                <ExternalLink className="size-3.5" /> View design link
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 rounded-xl border border-dashed border-border bg-background/60 p-4">
          <span className="text-sm text-muted-foreground italic">No task logged</span>
        </div>
      )}
    </div>
  );
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: link } = await supabase
    .from("share_link")
    .select("user_id, work_date")
    .eq("token", token)
    .maybeSingle();

  if (!link) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Link2 className="size-7" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Link not found</h1>
          <p className="text-muted-foreground">This share link is invalid or has been removed.</p>
        </div>
      </div>
    );
  }

  const [{ data: profile }, { data: tasksData }] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_url").eq("id", link.user_id).maybeSingle(),
    supabase
      .from("daily_task")
      .select("id, title, type, status, start_hour, end_hour, design_url")
      .eq("user_id", link.user_id)
      .eq("work_date", link.work_date)
      .order("start_hour"),
  ]);

  const name = profile?.full_name || "Team Member";
  const avatar = profile?.avatar_url || null;
  const tasks = (tasksData as DailyTask[]) ?? [];
  const totalHours = tasks.reduce((s, t) => s + (t.end_hour - t.start_hour), 0);

  const blocks = buildBlocks(tasks);
  const morning = blocks.filter((b) => b.start < 12);
  const afternoon = blocks.filter((b) => b.start >= 13);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
        {/* ---------- Header ---------- */}
        <div className="relative overflow-hidden rounded-3xl shadow-xl">
          <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-6 py-8 sm:px-10 sm:py-10 text-white">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-9 w-9 rounded-lg bg-white p-1.5 shadow flex items-center justify-center">
                <Image src="/homesph-mark.png" alt="Homes.ph" width={26} height={26} className="object-contain" />
              </div>
              <div className="leading-tight">
                <p className="font-bold text-sm">Homes.ph</p>
                <p className="text-[11px] text-brand-200">Daily Task Tracker</p>
              </div>
              <ThemeToggle className="ml-auto text-white" />
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
                <p className="text-brand-100">{prettyDate(link.work_date)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur rounded-full px-3 py-1 text-sm font-semibold">
                    <Clock className="size-4" /> {totalHours} hour{totalHours === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur rounded-full px-3 py-1 text-sm font-semibold">
                    <CheckCircle2 className="size-4" /> {tasks.length} task{tasks.length === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur rounded-full px-3 py-1 text-sm font-semibold">
                    9:00 AM – 6:00 PM
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- Timeline ---------- */}
        <div className="mt-6 sm:mt-8 rounded-3xl bg-card shadow-lg border border-border p-5 sm:p-8">
          <h2 className="text-lg font-bold text-foreground mb-5">Daily Task Timeline</h2>

          <div className="space-y-3 sm:space-y-4">
            {morning.map((b) => (
              <TaskRow key={`${b.start}-${b.end}`} block={b} />
            ))}

            {/* Lunch break */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="sm:w-40 sm:shrink-0 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-orange-300" />
                <span className="text-sm font-semibold text-muted-foreground">12:00 – 1:00 PM</span>
              </div>
              <div className="flex-1 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/40 border border-orange-100 dark:border-orange-900/40 p-4 flex items-center gap-2 text-orange-700 dark:text-orange-300">
                <UtensilsCrossed className="size-5" />
                <span className="text-sm font-semibold">Break time</span>
              </div>
            </div>

            {afternoon.map((b) => (
              <TaskRow key={`${b.start}-${b.end}`} block={b} />
            ))}
          </div>
        </div>

        <p className="text-center text-muted-foreground text-xs mt-8">
          Shared via <span className="font-semibold text-muted-foreground">Homes.ph Daily Task Tracker</span>
        </p>
      </div>
    </div>
  );
}
