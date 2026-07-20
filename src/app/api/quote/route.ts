import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Mode = "morning" | "timeout" | "report" | "describe";

interface ReportTask {
  title: string;
  description?: string;
  type: string;
  status: string;
  start: number;
  end: number;
  carriedOverFrom?: string | null;
}

const REPORT_INTRO =
  "Good Evening, Sir @Anthony Leuterio, Sir @Hernan Malubay, and Sir @Johnry Fibra,";

const FALLBACKS: Record<"morning" | "timeout", string[]> = {
  morning: [
    "Good things take time — and today, you have plenty of it. Make it count!",
    "Every morning is a fresh page. Write a good one today.",
    "Your effort yesterday built today. Keep going — you're doing great.",
  ],
  timeout: [
    "Thank you for your hard work today. Rest well — you've earned it!",
    "Great job today! Your dedication doesn't go unnoticed. See you tomorrow.",
    "You gave your best today, and it matters. Get some rest and recharge.",
  ],
};

function hourLabel(h: number) {
  const period = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:00 ${period}`;
}

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

function typeLabel(t: string) {
  return TYPE_LABELS[t] ?? "Development";
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  on_hold: "On Hold",
  for_review: "For Review",
  testing: "Testing",
  completed: "Completed",
  cancelled: "Cancelled",
  reopened: "Reopened",
  ongoing: "In Progress",
  done: "Completed",
};

function statusLabel(s: string) {
  return STATUS_LABELS[s] ?? s;
}

function pick(mode: "morning" | "timeout") {
  const arr = FALLBACKS[mode];
  return arr[new Date().getMinutes() % arr.length];
}

function fallbackReport(tasks: ReportTask[], totalHours: number) {
  if (!tasks.length) {
    return `${REPORT_INTRO}\n\nToday I did not have any logged tasks in the tracker.`;
  }
  const lines = tasks.map((t) => {
    const range = `${hourLabel(t.start)} to ${hourLabel(t.end)}`;
    const desc = t.description?.trim() ? ` ${t.description.trim()}` : "";
    const carried = t.carriedOverFrom ? ` (continued from ${t.carriedOverFrom})` : "";
    return `From ${range}, I worked on ${t.title} (${typeLabel(t.type)})${carried}.${desc} This task is ${statusLabel(
      t.status
    )}.`;
  });
  return `${REPORT_INTRO}\n\nToday I worked for about ${totalHours} hour${
    totalHours === 1 ? "" : "s"
  }. ${lines.join(" ")}`;
}

export async function POST(req: Request) {
  let mode: Mode = "morning";
  let name = "";
  let tasks: ReportTask[] = [];
  let totalHours = 0;

  let descTitle = "";
  let descType = "";
  let descStatus = "";

  try {
    const body = await req.json();
    if (body?.mode === "timeout" || body?.mode === "report" || body?.mode === "describe")
      mode = body.mode;
    if (typeof body?.name === "string") name = body.name.split(" ")[0] ?? "";
    if (Array.isArray(body?.tasks)) tasks = body.tasks;
    if (typeof body?.totalHours === "number") totalHours = body.totalHours;
    if (typeof body?.title === "string") descTitle = body.title.trim();
    if (typeof body?.type === "string") descType = body.type.trim();
    if (typeof body?.status === "string") descStatus = body.status.trim();
  } catch {
    /* defaults */
  }

  const apiKey = process.env.GROQ_API_KEY;

  // ---------------- TASK DESCRIPTION ----------------
  if (mode === "describe") {
    const fallbackDesc = descTitle
      ? `Working on ${descTitle}${descType ? ` as a ${descType} task` : ""}.`
      : "";

    if (!descTitle) {
      return NextResponse.json({ description: "" });
    }
    if (!apiKey) {
      return NextResponse.json({ description: fallbackDesc, source: "fallback" });
    }

    const prompt = `A Homes.ph team member is logging a work task. Write a short description of what this task involves.

Task title: ${descTitle}
Task type: ${descType || "General"}${descStatus ? `\nStatus: ${descStatus}` : ""}

Rules:
- Write 1 to 2 sentences in simple, natural, everyday English.
- Describe what the person is actually doing for this task, based on the title and type.
- Do NOT repeat the title word-for-word; expand on it a little.
- No greeting, no bullet points, no emojis, no quotes. Return only the description text.`;

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          temperature: 0.6,
          max_tokens: 120,
          messages: [
            {
              role: "system",
              content:
                "You write short, clear, natural task descriptions for a daily work tracker. Plain English, 1-2 sentences, never robotic.",
            },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!res.ok) {
        return NextResponse.json({ description: fallbackDesc, source: "fallback" });
      }
      const data = await res.json();
      const description: string =
        data?.choices?.[0]?.message?.content?.trim()?.replace(/^["']|["']$/g, "") || fallbackDesc;
      return NextResponse.json({ description, source: "groq" });
    } catch {
      return NextResponse.json({ description: fallbackDesc, source: "fallback" });
    }
  }

  // ---------------- REPORT ----------------
  if (mode === "report") {
    if (!apiKey) {
      return NextResponse.json({ report: fallbackReport(tasks, totalHours) });
    }

    const taskLines =
      tasks.length === 0
        ? "(no tasks were logged today)"
        : tasks
            .map((t) => {
              const desc = t.description?.trim() ? ` — ${t.description.trim()}` : "";
              const carried = t.carriedOverFrom ? ` (carried over from ${t.carriedOverFrom})` : "";
              return `- ${hourLabel(t.start)}–${hourLabel(t.end)}: ${t.title} [${typeLabel(
                t.type
              )}]${desc} (status: ${statusLabel(t.status)})${carried}`;
            })
            .join("\n");

    const doneStatuses = new Set(["completed", "done", "cancelled"]);
    const pending = tasks.filter((t) => !doneStatuses.has(t.status));
    const carryOver =
      pending.length > 0
        ? `\n\nThese tasks are NOT finished yet and will be continued: ${pending
            .map((t) => `${t.title} (${statusLabel(t.status)})`)
            .join(", ")}.`
        : "";

    const prompt = `You are helping a Homes.ph team member write their end-of-day work report to their bosses.

Here are the tasks they logged today (total about ${totalHours} hours). Each line has the time, task title, type, a short description, and the task's STATUS:
${taskLines}${carryOver}

Write the report body in SIMPLE, everyday English — like a real person casually telling their bosses what they did. Rules:
- Do NOT write any greeting or "Good Evening" line (that is added separately).
- Start with something like "Today I worked on..." or "My tasks today were...".
- SUMMARIZE each task using its title AND description so the bosses understand what was actually done.
- ALWAYS state the status of each task in plain words, e.g. "this task is completed", "this one is still in progress", "this is pending", "this is on hold", "this is for review", "this was cancelled".
- If a task is not finished (pending, in progress, on hold, for review, testing, reopened), clearly say it will be continued/carried over tomorrow.
- If a task shows "carried over from <date>", mention it was continued from a previous day, e.g. "the task from yesterday which I have now completed" or "continuing the task I started on <date>, which is still in progress".
- Keep it concise but cover every task. Group naturally; you may use a few short sentences per task.
- Sound natural and human, NOT formal or robotic. No fancy words. No bullet points. No emojis.
- Do not invent tasks that are not listed.`;

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          temperature: 0.7,
          max_tokens: 700,
          messages: [
            {
              role: "system",
              content:
                "You write short, simple, natural-sounding daily work reports. Plain English only, like a normal person, never robotic.",
            },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!res.ok) {
        return NextResponse.json({ report: fallbackReport(tasks, totalHours) });
      }
      const data = await res.json();
      const bodyText: string =
        data?.choices?.[0]?.message?.content?.trim() || fallbackReport(tasks, totalHours);
      // Guarantee the fixed intro is always on top.
      const cleaned = bodyText.replace(/^good evening[^\n]*\n*/i, "").trim();
      return NextResponse.json({ report: `${REPORT_INTRO}\n\n${cleaned}` });
    } catch {
      return NextResponse.json({ report: fallbackReport(tasks, totalHours) });
    }
  }

  // ---------------- MORNING / TIMEOUT QUOTE ----------------
  const quoteMode = mode as "morning" | "timeout";
  if (!apiKey) {
    return NextResponse.json({ quote: pick(quoteMode), source: "fallback" });
  }

  const prompt =
    quoteMode === "morning"
      ? `Write ONE short, warm, uplifting good-morning message (max 22 words) for a Homes.ph team member${
          name ? ` named ${name}` : ""
        } starting their workday. Make it motivating and appreciative. Return only the sentence, no quotes, no emoji.`
      : `Write ONE short, warm message of appreciation (max 22 words) thanking a Homes.ph team member${
          name ? ` named ${name}` : ""
        } for their hard work as they clock out, telling them to rest. Return only the sentence, no quotes, no emoji.`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0.9,
        max_tokens: 80,
        messages: [
          {
            role: "system",
            content:
              "You are a warm, encouraging workplace companion. Keep replies to a single sentence.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) return NextResponse.json({ quote: pick(quoteMode), source: "fallback" });
    const data = await res.json();
    const quote: string =
      data?.choices?.[0]?.message?.content?.trim()?.replace(/^["']|["']$/g, "") ||
      pick(quoteMode);
    return NextResponse.json({ quote, source: "groq" });
  } catch {
    return NextResponse.json({ quote: pick(quoteMode), source: "fallback" });
  }
}
