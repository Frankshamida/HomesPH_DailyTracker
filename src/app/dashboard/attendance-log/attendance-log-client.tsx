"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileDown,
  FileImage,
  FileSpreadsheet,
  FileText,
  MapPin,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { formatManilaTime, formatMinutes, manilaDateKey } from "@/lib/attendance";
import HomesSwal from "@/lib/swal";

interface Attendance {
  user_id: string;
  work_date: string;
  time_in: string | null;
  in_location: string | null;
  time_out: string | null;
  out_location: string | null;
  day_status: string | null;
}
interface Profile {
  id: string;
  full_name: string | null;
}
interface ReportRow {
  date: string;
  name: string;
  status: string;
  timeIn: string;
  timeOut: string;
  hours: string;
  location: string;
}
interface SummaryRow {
  name: string;
  present: number;
  absent: number;
  excuse: number;
  totalMinutes: number;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad = (n: number) => String(n).padStart(2, "0");
const dateKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

type StatusKind = "present" | "absent" | "excuse" | "none";
function statusOf(a: Attendance | undefined): StatusKind {
  if (!a) return "none";
  if (a.day_status === "absent") return "absent";
  if (a.day_status === "excused") return "excuse";
  if (a.time_in) return "present";
  return "none";
}
const STATUS_LABEL: Record<StatusKind, string> = {
  present: "Present",
  absent: "Absent",
  excuse: "Excuse",
  none: "No record",
};
const STATUS_BADGE: Record<StatusKind, string> = {
  present: "bg-emerald-100 text-emerald-700",
  absent: "bg-red-100 text-red-700",
  excuse: "bg-amber-100 text-amber-700",
  none: "bg-muted text-muted-foreground",
};

// Worked minutes: from 9:00 AM (or time-in if later) to time-out, minus lunch.
function workMinutes(a: Attendance | undefined): number | null {
  if (!a?.time_in || !a?.time_out) return null;
  const inMin = minutesOfDay(new Date(a.time_in));
  const outMin = minutesOfDay(new Date(a.time_out));
  const start = Math.max(inMin, 9 * 60);
  let mins = outMin - start;
  // subtract lunch overlap (12:00–13:00)
  const lunch = Math.max(0, Math.min(outMin, 13 * 60) - Math.max(start, 12 * 60));
  mins -= lunch;
  return mins > 0 ? mins : 0;
}
function workHours(a: Attendance | undefined): string {
  const m = workMinutes(a);
  return m === null ? "—" : formatMinutes(m);
}
function minutesOfDay(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return (h % 24) * 60 + m;
}

export default function AttendanceLogClient() {
  const supabase = useMemo(() => createClient(), []);
  const todayKey = manilaDateKey(new Date());
  const [ty, tm, td] = todayKey.split("-").map(Number);

  const [viewYear, setViewYear] = useState(ty);
  const [viewMonth, setViewMonth] = useState(tm - 1); // 0-indexed
  const [selected, setSelected] = useState(todayKey);
  const [rows, setRows] = useState<Attendance[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // report state
  const [report, setReport] = useState<{
    from: string;
    to: string;
    detail: ReportRow[];
    summary: SummaryRow[];
    totalMinutes: number;
  } | null>(null);
  const [reportBusy, setReportBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const first = dateKey(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
    const last = dateKey(viewYear, viewMonth, lastDay);
    const [{ data: att }, { data: profs }] = await Promise.all([
      supabase
        .from("attendance")
        .select("user_id, work_date, time_in, in_location, time_out, out_location, day_status")
        .gte("work_date", first)
        .lte("work_date", last),
      supabase.from("profiles").select("id, full_name").order("full_name"),
    ]);
    setRows((att as Attendance[]) ?? []);
    setProfiles((profs as Profile[]) ?? []);
    setLoading(false);
  }, [supabase, viewYear, viewMonth]);

  useEffect(() => {
    load();
  }, [load]);

  // Days in month that have at least one attendance record (for calendar dots)
  const daysWithData = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) if (r.time_in || r.day_status === "absent" || r.day_status === "excused") s.add(r.work_date);
    return s;
  }, [rows]);

  // Attendance for the selected date, keyed by user
  const selectedByUser = useMemo(() => {
    const m = new Map<string, Attendance>();
    for (const r of rows) if (r.work_date === selected) m.set(r.user_id, r);
    return m;
  }, [rows, selected]);

  // Build the calendar grid
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  }

  const shortDate = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(
      new Date(y, m - 1, d)
    );
  };

  // ---- Generate Report (date range -> preview -> export) --------------------
  async function generateReport() {
    if (reportBusy) return;
    const defFrom = dateKey(viewYear, viewMonth, 1);
    const { value: range } = await HomesSwal.fire({
      title: "Attendance Report",
      html: `
        <label style="display:block;text-align:left;font-size:.85rem;font-weight:600;color:#334155;margin:0 0 4px">From date</label>
        <input id="hph-from" type="date" class="swal2-input" style="margin:0 0 12px" value="${defFrom}" max="${todayKey}" />
        <label style="display:block;text-align:left;font-size:.85rem;font-weight:600;color:#334155;margin:0 0 4px">To date</label>
        <input id="hph-to" type="date" class="swal2-input" style="margin:0" value="${todayKey}" max="${todayKey}" />
      `,
      icon: "question",
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Generate",
      cancelButtonText: "Cancel",
      preConfirm: () => {
        const from = (document.getElementById("hph-from") as HTMLInputElement)?.value;
        const to = (document.getElementById("hph-to") as HTMLInputElement)?.value;
        if (!from || !to) {
          HomesSwal.showValidationMessage("Please choose both dates.");
          return false;
        }
        if (from > to) {
          HomesSwal.showValidationMessage("The 'From' date must be on or before the 'To' date.");
          return false;
        }
        return { from, to };
      },
    });
    if (!range) return;

    setReportBusy(true);
    const { data } = await supabase
      .from("attendance")
      .select("user_id, work_date, time_in, in_location, time_out, out_location, day_status")
      .gte("work_date", range.from)
      .lte("work_date", range.to)
      .order("work_date");
    const recs = (data as Attendance[]) ?? [];
    const nameById = new Map(profiles.map((p) => [p.id, p.full_name || "Team Member"]));

    const detail: ReportRow[] = [];
    const sum = new Map<string, SummaryRow>();
    let totalMinutes = 0;

    for (const a of recs) {
      const kind = statusOf(a);
      if (kind === "none") continue;
      const name = nameById.get(a.user_id) ?? "Team Member";
      const mins = workMinutes(a);
      detail.push({
        date: a.work_date,
        name,
        status: STATUS_LABEL[kind],
        timeIn: a.time_in ? formatManilaTime(new Date(a.time_in)) : "—",
        timeOut: a.time_out ? formatManilaTime(new Date(a.time_out)) : "—",
        hours: mins === null ? "—" : formatMinutes(mins),
        location: a.in_location || a.out_location || "—",
      });
      const s = sum.get(name) ?? { name, present: 0, absent: 0, excuse: 0, totalMinutes: 0 };
      if (kind === "present") s.present += 1;
      if (kind === "absent") s.absent += 1;
      if (kind === "excuse") s.excuse += 1;
      if (mins) s.totalMinutes += mins;
      sum.set(name, s);
      if (mins) totalMinutes += mins;
    }

    detail.sort((a, b) => (a.date === b.date ? a.name.localeCompare(b.name) : a.date.localeCompare(b.date)));
    const summary = Array.from(sum.values()).sort((a, b) => a.name.localeCompare(b.name));

    setReport({ from: range.from, to: range.to, detail, summary, totalMinutes });
    setReportBusy(false);
  }

  function reportTitle() {
    return `Homes.ph Attendance Report (${report ? shortDate(report.from) : ""} – ${
      report ? shortDate(report.to) : ""
    })`;
  }

  // Build a self-contained HTML document for Excel / PDF export.
  function buildReportHtml(): string {
    if (!report) return "";
    const detailRows = report.detail
      .map(
        (r) =>
          `<tr><td>${shortDate(r.date)}</td><td>${esc(r.name)}</td><td>${r.status}</td><td>${r.timeIn}</td><td>${r.timeOut}</td><td>${r.hours}</td><td>${esc(
            r.location
          )}</td></tr>`
      )
      .join("");
    const summaryRows = report.summary
      .map(
        (s) =>
          `<tr><td>${esc(s.name)}</td><td>${s.present}</td><td>${s.absent}</td><td>${s.excuse}</td><td>${formatMinutes(
            s.totalMinutes
          )}</td></tr>`
      )
      .join("");
    return `
      <h2 style="font-family:Arial,sans-serif;margin:0 0 4px">${reportTitle()}</h2>
      <p style="font-family:Arial,sans-serif;color:#555;margin:0 0 16px">Total work hours in range: <b>${formatMinutes(
        report.totalMinutes
      )}</b></p>
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;width:100%">
        <thead style="background:#eef2ff">
          <tr><th>Date</th><th>Full Name</th><th>Attendance Status</th><th>Time In</th><th>Time Out</th><th>Total Work Hours</th><th>Work Location</th></tr>
        </thead>
        <tbody>${detailRows || `<tr><td colspan="7" style="text-align:center;color:#888">No records in this range.</td></tr>`}</tbody>
      </table>
      <h3 style="font-family:Arial,sans-serif;margin:20px 0 6px">Summary — total per member</h3>
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px">
        <thead style="background:#eef2ff">
          <tr><th>Full Name</th><th>Days Present</th><th>Days Absent</th><th>Days Excuse</th><th>Total Work Hours</th></tr>
        </thead>
        <tbody>${summaryRows}</tbody>
      </table>`;
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportExcel() {
    const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8" /></head><body>${buildReportHtml()}</body></html>`;
    downloadBlob(new Blob([doc], { type: "application/vnd.ms-excel" }), `${reportTitle()}.xls`);
  }

  function exportPdf() {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<html><head><title>${reportTitle()}</title></head><body style="margin:24px">${buildReportHtml()}<script>window.onload=function(){setTimeout(function(){window.print();},250);};</scr` +
        `ipt></body></html>`
    );
    w.document.close();
  }

  function exportImage() {
    if (!report) return;
    const cols = [
      { key: "date", label: "Date", w: 110 },
      { key: "name", label: "Full Name", w: 200 },
      { key: "status", label: "Status", w: 100 },
      { key: "timeIn", label: "Time In", w: 100 },
      { key: "timeOut", label: "Time Out", w: 100 },
      { key: "hours", label: "Work Hours", w: 120 },
      { key: "location", label: "Work Location", w: 210 },
    ] as const;
    const pad = 24;
    const rowH = 30;
    const width = cols.reduce((s, c) => s + c.w, 0) + pad * 2;
    const headerTop = 90;
    const height = headerTop + rowH * (report.detail.length + 1) + 60;
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 18px Arial";
    ctx.fillText(reportTitle(), pad, 34);
    ctx.fillStyle = "#475569";
    ctx.font = "13px Arial";
    ctx.fillText(`Total work hours in range: ${formatMinutes(report.totalMinutes)}`, pad, 58);

    const clip = (t: string, w: number) => {
      let s = t;
      while (ctx.measureText(s).width > w - 10 && s.length > 1) s = s.slice(0, -2);
      return s === t ? t : s + "…";
    };

    // header
    let y = headerTop;
    ctx.fillStyle = "#eef2ff";
    ctx.fillRect(pad, y - 20, width - pad * 2, rowH);
    ctx.fillStyle = "#1e2a8c";
    ctx.font = "bold 12px Arial";
    let x = pad + 6;
    for (const c of cols) {
      ctx.fillText(c.label, x, y);
      x += c.w;
    }
    // rows
    ctx.font = "12px Arial";
    report.detail.forEach((r, i) => {
      y += rowH;
      if (i % 2 === 1) {
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(pad, y - 20, width - pad * 2, rowH);
      }
      ctx.fillStyle = "#334155";
      x = pad + 6;
      for (const c of cols) {
        ctx.fillText(clip(String((r as unknown as Record<string, string>)[c.key]), c.w), x, y);
        x += c.w;
      }
    });
    // grid line under header
    ctx.strokeStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(pad, headerTop + 10);
    ctx.lineTo(width - pad, headerTop + 10);
    ctx.stroke();

    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `${reportTitle()}.png`);
    }, "image/png");
  }

  const prettySelected = (() => {
    const [y, m, d] = selected.split("-").map(Number);
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(y, m - 1, d));
  })();

  // rows to render: every profile, with its attendance for the day (if any)
  const tableRows = profiles.map((p) => ({
    profile: p,
    att: selectedByUser.get(p.id),
  }));

  return (
    <PageContainer>
      <PageHeader
        icon={ClipboardList}
        title="Attendance Log"
        description="Pick a date to view the team's attendance for that day."
        actions={
          <Button onClick={generateReport} loading={reportBusy} disabled={reportBusy}>
            <FileText /> Generate Report
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* Calendar */}
        <div className="bg-card rounded-2xl shadow-sm border border-border p-5 h-fit">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </button>
            <h2 className="font-bold text-foreground">
              {MONTHS[viewMonth]} {viewYear}
            </h2>
            <button
              onClick={nextMonth}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d === null) return <div key={`e${i}`} />;
              const key = dateKey(viewYear, viewMonth, d);
              const isSelected = key === selected;
              const isToday = key === todayKey;
              const hasData = daysWithData.has(key);
              return (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  className={`relative aspect-square rounded-lg text-sm font-medium transition flex items-center justify-center ${
                    isSelected
                      ? "bg-brand-600 text-white shadow"
                      : isToday
                      ? "bg-brand-50 text-brand-700 border border-brand-200"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  {d}
                  {hasData && !isSelected && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-brand-500" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-brand-500" /> has records
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-brand-600" /> selected
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-bold text-foreground">{prettySelected}</h2>
            <span className="text-xs text-muted-foreground">{tableRows.length} member{tableRows.length === 1 ? "" : "s"}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Full Name</th>
                  <th className="text-left px-4 py-3 font-semibold">Attendance Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Time In</th>
                  <th className="text-left px-4 py-3 font-semibold">Time Out</th>
                  <th className="text-left px-4 py-3 font-semibold">Total Work Hours</th>
                  <th className="text-left px-6 py-3 font-semibold">Work Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No team members found.
                    </td>
                  </tr>
                ) : (
                  tableRows.map(({ profile, att }) => {
                    const kind = statusOf(att);
                    const loc = att?.in_location || att?.out_location || "—";
                    return (
                      <tr key={profile.id} className="hover:bg-muted/50">
                        <td className="px-6 py-3 font-medium text-foreground">
                          {profile.full_name || "Team Member"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[kind]}`}>
                            {STATUS_LABEL[kind]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {att?.time_in ? formatManilaTime(new Date(att.time_in)) : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {att?.time_out ? formatManilaTime(new Date(att.time_out)) : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{workHours(att)}</td>
                        <td className="px-6 py-3 text-muted-foreground">
                          {loc !== "—" ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3.5" /> {loc}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ---- Report preview + export ---- */}
      {report && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setReport(null)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl w-full max-w-4xl my-auto max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4 shrink-0 flex items-start justify-between gap-4 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-foreground">Attendance Report</h3>
                <p className="text-sm text-muted-foreground">
                  {shortDate(report.from)} – {shortDate(report.to)} · Total work hours:{" "}
                  <span className="font-semibold text-foreground">{formatMinutes(report.totalMinutes)}</span>
                </p>
              </div>
              <button
                onClick={() => setReport(null)}
                className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="px-6 py-4 overflow-auto">
              <table className="w-full text-sm border border-border">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Date</th>
                    <th className="text-left px-3 py-2 font-semibold">Full Name</th>
                    <th className="text-left px-3 py-2 font-semibold">Attendance Status</th>
                    <th className="text-left px-3 py-2 font-semibold">Time In</th>
                    <th className="text-left px-3 py-2 font-semibold">Time Out</th>
                    <th className="text-left px-3 py-2 font-semibold">Total Work Hours</th>
                    <th className="text-left px-3 py-2 font-semibold">Work Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.detail.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                        No records in this range.
                      </td>
                    </tr>
                  ) : (
                    report.detail.map((r, i) => (
                      <tr key={i} className="hover:bg-muted/50">
                        <td className="px-3 py-2 text-muted-foreground">{shortDate(r.date)}</td>
                        <td className="px-3 py-2 font-medium text-foreground">{r.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.status}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.timeIn}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.timeOut}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.hours}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.location !== "—" ? `📍 ${r.location}` : "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {report.summary.length > 0 && (
                <>
                  <h4 className="font-bold text-foreground mt-6 mb-2">Summary — total per member</h4>
                  <table className="w-full text-sm border border-border">
                    <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">Full Name</th>
                        <th className="text-left px-3 py-2 font-semibold">Days Present</th>
                        <th className="text-left px-3 py-2 font-semibold">Days Absent</th>
                        <th className="text-left px-3 py-2 font-semibold">Days Excuse</th>
                        <th className="text-left px-3 py-2 font-semibold">Total Work Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {report.summary.map((s, i) => (
                        <tr key={i} className="hover:bg-muted/50">
                          <td className="px-3 py-2 font-medium text-foreground">{s.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">{s.present}</td>
                          <td className="px-3 py-2 text-muted-foreground">{s.absent}</td>
                          <td className="px-3 py-2 text-muted-foreground">{s.excuse}</td>
                          <td className="px-3 py-2 text-muted-foreground">{formatMinutes(s.totalMinutes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>

            <div className="px-6 py-4 shrink-0 border-t border-border flex flex-wrap gap-3 justify-end">
              <Button variant="success" onClick={exportExcel}>
                <FileSpreadsheet /> Excel
              </Button>
              <Button variant="destructive" onClick={exportPdf}>
                <FileDown /> PDF
              </Button>
              <Button onClick={exportImage}>
                <FileImage /> Image
              </Button>
              <Button variant="outline" onClick={() => setReport(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
