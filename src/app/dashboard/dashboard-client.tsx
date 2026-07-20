"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  FileText,
  Hand,
  LogIn,
  LogOut,
  MapPin,
  Moon,
  Sunrise,
  TimerOff,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/page";
import HomesSwal from "@/lib/swal";
import {
  evaluateTimeIn,
  evaluateTimeOut,
  formatMinutes,
  formatManilaTime,
  getSchedule,
  manilaDateKey,
  manilaMinutes,
} from "@/lib/attendance";
import {
  ALLOWED_SITES,
  RADIUS_M,
  getCurrentPosition,
  nearestSite,
} from "@/lib/geofence";

interface Props {
  userId: string;
  email: string;
  initialFullName: string;
}

interface Attendance {
  id: string;
  work_date: string;
  time_in: string | null;
  in_status: string | null;
  in_minutes: number | null;
  in_location: string | null;
  time_out: string | null;
  out_status: string | null;
  out_minutes: number | null;
  out_location: string | null;
  early_out_reason: string | null;
  day_status: "present" | "absent" | "excused" | null;
  absence_reason: string | null;
}

interface Excuse {
  id: string;
  work_date: string;
  reason: string;
  approved_by: string;
  excused_at: string;
  resumed_at: string | null;
}

const APPROVERS = ["Sir Hernan Malubay", "Sir Johnry Fibra", "Miss Michaela Lagdamen"];

const badgeColor: Record<string, string> = {
  early: "bg-sky-100 text-sky-700",
  on_time: "bg-emerald-100 text-emerald-700",
  late: "bg-amber-100 text-amber-700",
  early_out: "bg-rose-100 text-rose-700",
  overtime: "bg-violet-100 text-violet-700",
};

export default function DashboardClient({ userId, email, initialFullName }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [fullName, setFullName] = useState(initialFullName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [today, setToday] = useState<Attendance | null>(null);
  const [history, setHistory] = useState<Attendance[]>([]);
  const [excuses, setExcuses] = useState<Excuse[]>([]);
  const [now, setNow] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // AI greeting + goodbye
  const [greeting, setGreeting] = useState<string | null>(null);
  const [byeQuote, setByeQuote] = useState<string | null>(null);
  const [showBye, setShowBye] = useState(false);

  const todayKey = now ? manilaDateKey(now) : manilaDateKey(new Date());

  // Live clock
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadAll = useCallback(async () => {
    const key = manilaDateKey(new Date());

    const [{ data: prof }, { data: att }, { data: hist }, { data: exc }] = await Promise.all([
      supabase.from("profiles").select("full_name, avatar_url").eq("id", userId).maybeSingle(),
      supabase.from("attendance").select("*").eq("user_id", userId).eq("work_date", key).maybeSingle(),
      supabase
        .from("attendance")
        .select("*")
        .eq("user_id", userId)
        .order("work_date", { ascending: false })
        .limit(14),
      supabase
        .from("attendance_excuse")
        .select("*")
        .eq("user_id", userId)
        .eq("work_date", key)
        .order("excused_at", { ascending: true }),
    ]);

    if (prof) {
      if (prof.full_name) setFullName(prof.full_name);
      setAvatarUrl(prof.avatar_url ?? null);
    }
    // Backfill the profile name (so public share pages show the real name, not "Team Member")
    if (initialFullName && !prof?.full_name) {
      await supabase
        .from("profiles")
        .upsert({ id: userId, full_name: initialFullName }, { onConflict: "id" });
      setFullName(initialFullName);
    }
    setToday((att as Attendance) ?? null);
    setHistory((hist as Attendance[]) ?? []);
    setExcuses((exc as Excuse[]) ?? []);
  }, [supabase, userId, initialFullName]);

  useEffect(() => {
    loadAll();
    // ensure a profile row exists
    supabase
      .from("profiles")
      .upsert({ id: userId, full_name: initialFullName }, { onConflict: "id", ignoreDuplicates: true })
      .then(() => {});
  }, [loadAll, supabase, userId, initialFullName]);

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 4000);
  };

  async function fetchQuote(mode: "morning" | "timeout"): Promise<string> {
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, name: fullName || email }),
      });
      const data = await res.json();
      return data.quote as string;
    } catch {
      return mode === "morning"
        ? "Good morning! Wishing you a productive and wonderful day ahead."
        : "Thank you for your hard work today. Rest well!";
    }
  }

  // Morning greeting — once per day, only before noon (Manila)
  useEffect(() => {
    if (!now) return;
    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Manila",
        hour: "2-digit",
        hour12: false,
      }).format(now)
    );
    if (hour >= 12) return;
    const key = `hph-greeted-${todayKey}`;
    if (typeof window === "undefined" || localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    fetchQuote("morning").then(setGreeting);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now && todayKey]);

  // Verify the user is at an approved site. Returns the nearest site when
  // allowed, or null (after showing an explanatory dialog) when blocked.
  async function verifyLocation(action: "time in" | "time out") {
    HomesSwal.fire({
      title: "Checking your location…",
      html: `Please allow location access to ${action}.`,
      allowOutsideClick: false,
      didOpen: () => HomesSwal.showLoading(),
    });

    let coords: GeolocationCoordinates;
    try {
      const pos = await getCurrentPosition();
      coords = pos.coords;
    } catch (err) {
      HomesSwal.close();
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? (err as GeolocationPositionError).code
          : 0;
      let title = "Unable to get your location";
      let html =
        "Something went wrong while reading your location. Please check your device settings and try again.";
      if (code === 1) {
        // PERMISSION_DENIED
        title = "Location access blocked";
        html = `Location permission is turned off, so we can't confirm you're at an approved site to ${action}.<br/><br/>Enable location for this site in your browser (tap the 🔒/ⓘ icon in the address bar → <b>Location → Allow</b>), then try again.`;
      } else if (code === 2) {
        // POSITION_UNAVAILABLE
        title = "Location unavailable";
        html = `Your device couldn't determine your position right now. Please turn on GPS / Location Services, move to a spot with a clearer signal, then try to ${action} again.`;
      } else if (code === 3) {
        // TIMEOUT
        title = "Location request timed out";
        html = `Getting your location took too long. Please check your internet/GPS signal and try to ${action} again.`;
      } else if (!("geolocation" in navigator)) {
        title = "Location not supported";
        html = "This device or browser doesn't support location. Please use a device with GPS to time in and out.";
      }
      await HomesSwal.fire({ title, html, icon: "error", confirmButtonText: "OK" });
      return null;
    }

    const near = nearestSite(coords.latitude, coords.longitude);
    HomesSwal.close();
    if (!near.allowed) {
      await HomesSwal.fire({
        title: "You're not at an approved location",
        html: `You need to be within <b>${RADIUS_M} m</b> of an approved Homes.ph site to ${action}.<br/><br/>Nearest: <b>${
          near.site.name
        }</b> — about <b>${Math.round(near.distance)} m</b> away.<br/><span style="color:hsl(var(--muted-foreground))">Approved sites: ${ALLOWED_SITES.map(
          (s) => s.name
        ).join(", ")}.</span>`,
        icon: "warning",
        confirmButtonText: "OK",
      });
      return null;
    }
    return near;
  }

  async function handleTimeIn() {
    if (busy) return;
    const d = new Date();
    if (getSchedule(d).dayType === "sunday") {
      flash("Today is Sunday — no scheduled work.");
      return;
    }
    // --- Location check: must be at (or very near) an approved Homes.ph site ---
    const near = await verifyLocation("time in");
    if (!near) return;

    // Resuming after a temporary excuse — just close the open excuse.
    if (openExcuse) {
      const confirm = await HomesSwal.fire({
        title: "Resume work?",
        footer: `📍 At ${near.site.name} (~${Math.round(near.distance)} m away)`,
        html: `Welcome back! You'll end your excuse (approved by <b>${openExcuse.approved_by}</b>) and continue working.`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, resume",
        cancelButtonText: "Cancel",
      });
      if (!confirm.isConfirmed) return;
      setBusy(true);
      const { error } = await supabase
        .from("attendance_excuse")
        .update({ resumed_at: d.toISOString() })
        .eq("id", openExcuse.id);
      setBusy(false);
      if (error) return flash(error.message);
      flash("Resumed work — welcome back!");
      loadAll();
      return;
    }

    const preview = evaluateTimeIn(d);
    const confirm = await HomesSwal.fire({
      title: "Time In?",
      footer: `📍 At ${near.site.name} (~${Math.round(near.distance)} m away)`,
      html: `You're timing in at <b>${formatManilaTime(d)}</b>.<br/><span style="color:hsl(var(--muted-foreground))">Status: <b>${preview.label}</b>${
        preview.minutes ? ` (${formatMinutes(preview.minutes)})` : ""
      }</span>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, time in",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;

    setBusy(true);
    const r = evaluateTimeIn(d);
    const { error } = await supabase.from("attendance").upsert(
      {
        user_id: userId,
        work_date: manilaDateKey(d),
        time_in: d.toISOString(),
        in_status: r.status,
        in_minutes: r.minutes,
        in_location: near.site.name,
      },
      { onConflict: "user_id,work_date" }
    );
    setBusy(false);
    if (error) return flash(error.message);
    flash(
      `Timed in at ${formatManilaTime(d)} — ${r.label}${
        r.minutes ? ` (${formatMinutes(r.minutes)})` : ""
      }`
    );
    loadAll();
  }

  async function handleTimeOut() {
    if (busy) return;
    const d = new Date();
    // --- Location check: must be at (or very near) an approved Homes.ph site ---
    const near = await verifyLocation("time out");
    if (!near) return;

    const r = evaluateTimeOut(d);
    let reason: string | null = null;

    if (r.requiresReason) {
      const res = await HomesSwal.fire({
        title: "Early Time Out",
        html: `You're timing out <b>${formatMinutes(r.minutes)}</b> before schedule.<br/>Please provide a reason:`,
        footer: `📍 At ${near.site.name} (~${Math.round(near.distance)} m away)`,
        icon: "warning",
        input: "textarea",
        inputPlaceholder: "Reason for leaving early…",
        inputAttributes: { "aria-label": "Reason" },
        showCancelButton: true,
        confirmButtonText: "Time out",
        cancelButtonText: "Cancel",
        inputValidator: (value) => (!value.trim() ? "A reason is required for early time-out." : undefined),
      });
      if (!res.isConfirmed) return;
      reason = (res.value as string).trim();
    } else {
      const confirm = await HomesSwal.fire({
        title: "Time Out?",
        html: `You're timing out at <b>${formatManilaTime(d)}</b>.<br/><span style="color:hsl(var(--muted-foreground))">Status: <b>${r.label}</b>${
          r.minutes ? ` (${formatMinutes(r.minutes)})` : ""
        }</span>`,
        footer: `📍 At ${near.site.name} (~${Math.round(near.distance)} m away)`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, time out",
        cancelButtonText: "Cancel",
      });
      if (!confirm.isConfirmed) return;
    }

    setBusy(true);
    const { error } = await supabase
      .from("attendance")
      .update({
        time_out: d.toISOString(),
        out_status: r.status,
        out_minutes: r.minutes,
        out_location: near.site.name,
        early_out_reason: reason,
      })
      .eq("user_id", userId)
      .eq("work_date", manilaDateKey(d));
    setBusy(false);
    if (error) return flash(error.message);
    // Archive today's hourly tasks -> they move to "Past Tasks" and the tracker clears.
    await supabase
      .from("daily_task")
      .update({ archived: true })
      .eq("user_id", userId)
      .eq("work_date", manilaDateKey(d));
    loadAll();
    // Warm goodbye with an AI-generated appreciation quote
    setByeQuote(null);
    setShowBye(true);
    fetchQuote("timeout").then(setByeQuote);
  }

  // Temporary excuse — step out for a while, with manager approval.
  async function handleExcuse() {
    if (busy) return;
    const approverOptions = APPROVERS.map(
      (a) => `<option value="${a}">${a}</option>`
    ).join("");
    const { value: form } = await HomesSwal.fire({
      title: "Excuse for a while",
      html: `
        <label style="display:block;text-align:left;font-size:.85rem;font-weight:600;color:#334155;margin:0 0 4px">Approved by</label>
        <select id="hph-approver" class="swal2-select" style="display:block;width:100%;margin:0 0 12px">
          <option value="">Select approver…</option>
          ${approverOptions}
        </select>
        <label style="display:block;text-align:left;font-size:.85rem;font-weight:600;color:#334155;margin:0 0 4px">Reason</label>
        <textarea id="hph-excuse-reason" class="swal2-textarea" style="display:block;width:100%;margin:0" placeholder="Reason for your excuse…"></textarea>
      `,
      icon: "question",
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Request excuse",
      cancelButtonText: "Cancel",
      preConfirm: () => {
        const approved_by = (document.getElementById("hph-approver") as HTMLSelectElement)?.value ?? "";
        const reason = ((document.getElementById("hph-excuse-reason") as HTMLTextAreaElement)?.value ?? "").trim();
        if (!approved_by) {
          HomesSwal.showValidationMessage("Please select who approved your excuse.");
          return false;
        }
        if (!reason) {
          HomesSwal.showValidationMessage("Please provide a reason for your excuse.");
          return false;
        }
        return { approved_by, reason };
      },
    });
    if (!form) return;

    setBusy(true);
    const d = new Date();
    const { error } = await supabase.from("attendance_excuse").insert({
      user_id: userId,
      work_date: manilaDateKey(d),
      reason: form.reason,
      approved_by: form.approved_by,
      excused_at: d.toISOString(),
    });
    setBusy(false);
    if (error) return flash(error.message);
    flash(`You're on excuse — approved by ${form.approved_by}. Time in again when you're back.`);
    loadAll();
  }

  async function markDay(status: "absent" | "excused") {
    if (busy) return;
    const d = new Date();
    const res = await HomesSwal.fire({
      title: status === "excused" ? "Mark as Excused" : "Mark as Absent",
      html:
        status === "excused"
          ? "Please provide your excuse / reason:"
          : "You can add a reason for your absence (optional):",
      icon: "warning",
      input: "textarea",
      inputPlaceholder: status === "excused" ? "Reason for being excused…" : "Reason (optional)…",
      showCancelButton: true,
      confirmButtonText: status === "excused" ? "Mark Excused" : "Mark Absent",
      cancelButtonText: "Cancel",
      inputValidator:
        status === "excused"
          ? (value) => (!value.trim() ? "A reason is required for an excused day." : undefined)
          : undefined,
    });
    if (!res.isConfirmed) return;
    const reason = ((res.value as string) || "").trim();
    setBusy(true);
    const { error } = await supabase.from("attendance").upsert(
      {
        user_id: userId,
        work_date: manilaDateKey(d),
        day_status: status,
        absence_reason: reason?.trim() || null,
        time_in: null,
        in_status: null,
        in_minutes: null,
        in_location: null,
        time_out: null,
        out_status: null,
        out_minutes: null,
        out_location: null,
      },
      { onConflict: "user_id,work_date" }
    );
    setBusy(false);
    if (error) return flash(error.message);
    flash(status === "excused" ? "Marked as Excused for today." : "Marked as Absent for today.");
    loadAll();
  }

  async function undoMark() {
    if (busy) return;
    setBusy(true);
    await supabase
      .from("attendance")
      .update({ day_status: "present", absence_reason: null })
      .eq("user_id", userId)
      .eq("work_date", todayKey);
    setBusy(false);
    loadAll();
  }

  const sched = now ? getSchedule(now) : null;
  const hasIn = !!today?.time_in;
  const hasOut = !!today?.time_out;
  const dayStatus = today?.day_status ?? "present";
  const isOff = dayStatus === "absent" || dayStatus === "excused";

  // Temporary-excuse state (step out for a while, then resume)
  const openExcuse = excuses.find((e) => !e.resumed_at) ?? null;
  const onExcuse = !!openExcuse;
  const nowMin = now ? manilaMinutes(now) : 0;
  const endMin = sched?.endMinutes ?? 18 * 60; // scheduled end (6:00 PM weekdays)
  // Time Out is only available exactly at/after the scheduled end.
  const canTimeOut = hasIn && !hasOut && !onExcuse && nowMin >= endMin;
  const canEarlyOut = hasIn && !hasOut && !onExcuse && nowMin < endMin;
  const canExcuse = hasIn && !hasOut && !onExcuse;

  // Rolling totals from history
  const totals = history.reduce(
    (acc, a) => {
      if (a.in_status === "late") acc.late += a.in_minutes ?? 0;
      if (a.in_status === "early") acc.early += a.in_minutes ?? 0;
      if (a.out_status === "overtime") acc.ot += a.out_minutes ?? 0;
      if (a.out_status === "early_out") acc.earlyOut += a.out_minutes ?? 0;
      return acc;
    },
    { late: 0, early: 0, ot: 0, earlyOut: 0 }
  );

  return (
    <div className="min-h-screen">
      <PageContainer>
        {msg && (
          <div className="animate-fade-in rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
            {msg}
          </div>
        )}

        {greeting && (
          <div className="animate-fade-in flex items-start gap-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-4 text-white shadow-lg">
            <Sunrise className="size-6 shrink-0" />
            <div>
              <p className="font-bold">
                Good Morning, {(fullName || email).split(" ")[0]}!
              </p>
              <p className="text-sm text-amber-50">{greeting}</p>
            </div>
            <button
              onClick={() => setGreeting(null)}
              className="ml-auto rounded-md p-0.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
              aria-label="Dismiss"
            >
              <X className="size-5" />
            </button>
          </div>
        )}

        {/* Greeting + Profile */}
        <Card className="flex flex-col items-center gap-6 p-6 sm:flex-row">
          <Avatar
            userId={userId}
            url={avatarUrl}
            fullName={fullName || email}
            size={96}
            editable
            onUploaded={(u) => {
              setAvatarUrl(u);
              flash("Profile photo updated!");
            }}
          />
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-bold text-foreground">
              Hi, {(fullName || email).split(" ")[0]} 👋
            </h2>
            <p className="text-muted-foreground">
              {now
                ? new Intl.DateTimeFormat("en-US", {
                    timeZone: "Asia/Manila",
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }).format(now)
                : "…"}
            </p>
            {sched && (
              <p className="text-sm mt-1 text-muted-foreground">
                {sched.dayType === "sunday"
                  ? "Rest day — no scheduled work."
                  : `Schedule: 9:00 AM – ${
                      sched.dayType === "saturday" ? "12:00 PM" : "6:00 PM"
                    }${sched.hasLunch ? " (lunch 12–1)" : ""}`}
              </p>
            )}
          </div>
        </Card>

        {/* Time clock */}
        <section className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-900 p-6 text-white shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <p className="text-brand-100 text-sm font-medium">Current time (Manila)</p>
              <p className="text-5xl font-bold tabular-nums tracking-tight">
                {now ? formatManilaTime(now) : "—"}
              </p>
              <div className="flex gap-4 mt-3 text-sm">
                <span>
                  In:{" "}
                  <strong>
                    {today?.time_in ? formatManilaTime(new Date(today.time_in)) : "—"}
                  </strong>
                  {today?.in_location && (
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-brand-100">
                      <MapPin className="size-3" /> {today.in_location}
                    </span>
                  )}
                </span>
                <span>
                  Out:{" "}
                  <strong>
                    {today?.time_out ? formatManilaTime(new Date(today.time_out)) : "—"}
                  </strong>
                  {today?.out_location && (
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-brand-100">
                      <MapPin className="size-3" /> {today.out_location}
                    </span>
                  )}
                </span>
              </div>
              {isOff ? (
                <div className="mt-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 border border-white/30">
                    {dayStatus === "excused" ? "🟡 Excused today" : "🔴 Absent today"}
                  </span>
                  {today?.absence_reason && (
                    <p className="text-xs text-brand-100 mt-1">Reason: {today.absence_reason}</p>
                  )}
                </div>
              ) : (
                today?.in_status && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeColor[today.in_status]}`}>
                      {today.in_status === "early" ? "Early In" : today.in_status === "late" ? "Late" : "On Time"}
                      {today.in_minutes ? ` · ${formatMinutes(today.in_minutes)}` : ""}
                    </span>
                    {today.out_status && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeColor[today.out_status]}`}>
                        {today.out_status === "early_out"
                          ? "Early Out"
                          : today.out_status === "overtime"
                          ? "Overtime"
                          : "On Time"}
                        {today.out_minutes ? ` · ${formatMinutes(today.out_minutes)}` : ""}
                      </span>
                    )}
                    {onExcuse && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                        <Hand className="size-3" /> Excuse · approved by {openExcuse!.approved_by}
                      </span>
                    )}
                  </div>
                )
              )}
              {excuses.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {excuses.map((e) => (
                    <p key={e.id} className="flex items-center gap-1 text-xs text-brand-100">
                      <Hand className="size-3 shrink-0" /> {formatManilaTime(new Date(e.excused_at))}
                      {e.resumed_at ? ` – ${formatManilaTime(new Date(e.resumed_at))}` : " – now"} ·{" "}
                      {e.approved_by} · {e.reason}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col items-stretch gap-3">
              {isOff ? (
                <button
                  onClick={undoMark}
                  disabled={busy}
                  className="bg-white text-brand-700 font-bold px-8 py-3 rounded-xl shadow disabled:opacity-50 hover:bg-brand-50 transition"
                >
                  Undo — I&apos;m present
                </button>
              ) : (
                <>
                  <div className="flex gap-3">
                    <button
                      onClick={handleTimeIn}
                      disabled={busy || hasOut || (hasIn && !onExcuse)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 font-bold text-brand-700 shadow transition-all hover:bg-brand-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <LogIn className="size-5" />
                      {!hasIn ? "Time In" : onExcuse ? "Time In (Resume)" : "Timed In"}
                    </button>
                    <button
                      onClick={handleTimeOut}
                      disabled={busy || !canTimeOut}
                      title={
                        hasIn && !hasOut && !onExcuse && nowMin < endMin
                          ? "Time Out unlocks at your scheduled end time. Use Early Out to leave before then."
                          : undefined
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-brand-900/40 px-8 py-4 font-bold text-white shadow transition-all hover:bg-brand-900/60 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <LogOut className="size-5" />
                      {hasOut ? "Timed Out" : "Time Out"}
                    </button>
                  </div>

                  {/* Already timed in & working: early-out + excuse actions */}
                  {hasIn && !hasOut && !onExcuse && (
                    <div className="flex flex-wrap gap-3 justify-center">
                      <button
                        onClick={handleTimeOut}
                        disabled={busy || !canEarlyOut}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/90 px-4 py-2 text-sm font-semibold text-white shadow transition-all hover:bg-rose-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <TimerOff className="size-4" /> Early Out
                      </button>
                      <button
                        onClick={handleExcuse}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400/90 px-4 py-2 text-sm font-semibold text-amber-950 shadow transition-all hover:bg-amber-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Hand className="size-4" /> Excuse for a while
                      </button>
                    </div>
                  )}

                  {onExcuse && !hasOut && (
                    <p className="text-center text-xs text-amber-100">
                      You&apos;re on excuse — time in again to resume.
                    </p>
                  )}

                  {!hasIn && (
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => markDay("absent")}
                        disabled={busy}
                        className="text-xs font-semibold text-white/90 hover:text-white underline underline-offset-2"
                      >
                        Mark Absent
                      </button>
                      <button
                        onClick={() => markDay("excused")}
                        disabled={busy}
                        className="text-xs font-semibold text-white/90 hover:text-white underline underline-offset-2"
                      >
                        Mark Excused
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Early-in (last 14d)" value={formatMinutes(totals.early)} tone="brand" icon={Sunrise} />
          <StatCard label="Late (last 14d)" value={formatMinutes(totals.late)} tone="amber" icon={Clock} />
          <StatCard label="Overtime (last 14d)" value={formatMinutes(totals.ot)} tone="violet" icon={TrendingUp} />
          <StatCard label="Early-out (last 14d)" value={formatMinutes(totals.earlyOut)} tone="rose" icon={TimerOff} />
        </section>

        {/* History */}
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border px-6 py-4">
            <h3 className="font-bold text-foreground">Attendance History</h3>
            <p className="text-xs text-muted-foreground">Last 14 work days</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Date</th>
                  <th className="text-left px-4 py-3 font-semibold">Time In</th>
                  <th className="text-left px-4 py-3 font-semibold">In Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Time Out</th>
                  <th className="text-left px-4 py-3 font-semibold">Out Status</th>
                  <th className="text-left px-6 py-3 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No records yet.
                    </td>
                  </tr>
                )}
                {history.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/50">
                    <td className="px-6 py-3 font-medium text-foreground">{a.work_date}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {a.time_in ? formatManilaTime(new Date(a.time_in)) : "—"}
                      {a.in_location && (
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground/70">
                          <MapPin className="size-3" /> {a.in_location}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {a.day_status === "absent" ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                          Absent
                        </span>
                      ) : a.day_status === "excused" ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                          Excused
                        </span>
                      ) : a.in_status ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeColor[a.in_status]}`}>
                          {a.in_status === "early" ? "Early" : a.in_status === "late" ? "Late" : "On time"}
                          {a.in_minutes ? ` ${formatMinutes(a.in_minutes)}` : ""}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {a.time_out ? formatManilaTime(new Date(a.time_out)) : "—"}
                      {a.out_location && (
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground/70">
                          <MapPin className="size-3" /> {a.out_location}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {a.out_status ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeColor[a.out_status]}`}>
                          {a.out_status === "early_out"
                            ? "Early out"
                            : a.out_status === "overtime"
                            ? "OT"
                            : "On time"}
                          {a.out_minutes ? ` ${formatMinutes(a.out_minutes)}` : ""}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground max-w-xs truncate">
                      {a.absence_reason || a.early_out_reason || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <p className="text-center text-muted-foreground text-xs py-4">
          © {new Date().getFullYear()} Homes.ph · Daily Task Tracker
        </p>
      </PageContainer>

      {/* Goodbye modal (after time-out) */}
      {showBye && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="w-full max-w-md animate-scale-in rounded-2xl bg-card p-8 text-center text-card-foreground shadow-xl">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Moon className="size-7" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">See you tomorrow!</h3>
            <p className="mt-1 text-muted-foreground">
              Get some rest, {(fullName || email).split(" ")[0]}. You did great today.
            </p>
            <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/5 px-5 py-4">
              <p className="flex min-h-[2.5rem] items-center justify-center font-medium italic text-primary">
                {byeQuote ? `“${byeQuote}”` : "Loading a little appreciation for you…"}
              </p>
            </div>
            <Button
              onClick={() => {
                if (typeof window !== "undefined") sessionStorage.setItem("hph-autoreport", "1");
                router.push("/dashboard/daily-task");
              }}
              size="lg"
              className="mt-6 w-full"
            >
              <FileText className="size-5" /> Create Report
            </Button>
            <Button variant="ghost" onClick={() => setShowBye(false)} className="mt-2 w-full">
              Maybe later
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone: "brand" | "amber" | "violet" | "rose";
  icon: LucideIcon;
}) {
  const tones: Record<string, string> = {
    brand: "bg-brand-500/10 text-brand-600 dark:text-brand-300",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  };
  return (
    <Card className="p-4 transition-shadow hover:shadow-md">
      <div className={`mb-3 flex size-9 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon className="size-5" />
      </div>
      <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}
