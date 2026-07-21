"use client";

// ---------------------------------------------------------------------------
// Floating Task List (desktop / laptop)
//
// Opens a real always-on-top window using the Document Picture-in-Picture API.
// The window floats over ANY other window (including other browsers), can be
// dragged and minimised by the OS, and shows the live task list for today.
//
// Alarm: for the task you are currently on, it fires 3 consecutive alarms in
// the final 15 minutes — at 15, 10 and 5 minutes before the task ends — each
// as a sound (triple beep) + a system notification + an on-widget flash.
//
// Requires a Chromium browser (Chrome / Edge) — including this app installed
// as a PWA. Gracefully no-ops elsewhere.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PictureInPicture2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { manilaMinutes, slotLabel } from "@/lib/attendance";

interface FloatTask {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  start_hour: number;
  end_hour: number;
}

interface Props {
  tasks: FloatTask[];
  now: Date | null;
  currentHour: number;
  typeLabel: (t: string) => string;
  statusMeta: (s: string) => { label: string; badge: string };
  onNotSupported: () => void;
}

// Minutes before a task ends at which we alarm (3 consecutive, 5 min apart).
const ALARM_THRESHOLDS = [15, 10, 5];

export default function FloatingTasks({
  tasks,
  now,
  currentHour,
  typeLabel,
  statusMeta,
  onNotSupported,
}: Props) {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  // remembers which (taskId|threshold) alarms have already fired
  const firedRef = useRef<Set<string>>(new Set());

  const supported =
    typeof window !== "undefined" && "documentPictureInPicture" in window;

  // ---- the task you're on right now -------------------------------------
  const currentTask = useMemo(
    () =>
      tasks.find((t) => t.start_hour <= currentHour && currentHour < t.end_hour) ??
      null,
    [tasks, currentHour]
  );

  // minutes until the current task ends (end_hour is on the hour)
  const minutesLeft = useMemo(() => {
    if (!currentTask || !now) return null;
    return currentTask.end_hour * 60 - manilaMinutes(now);
  }, [currentTask, now]);

  // ---- alarm sound (triple beep) ----------------------------------------
  const beep = useCallback(() => {
    const ctx = audioRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    // three short beeps => "3 consecutive alarm"
    [0, 0.45, 0.9].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      const t0 = ctx.currentTime + offset;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.32);
    });
  }, []);

  const fireAlarm = useCallback(
    (task: FloatTask, minsRemaining: number) => {
      beep();
      setFlashing(true);
      setTimeout(() => setFlashing(false), 4000);
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification("⏰ Task ending soon", {
          body: `“${task.title}” ends in about ${minsRemaining} minute${
            minsRemaining === 1 ? "" : "s"
          }.`,
          tag: `hph-alarm-${task.id}-${minsRemaining}`,
        });
      }
    },
    [beep]
  );

  // reset the fired-set whenever the current task changes
  useEffect(() => {
    firedRef.current = new Set();
  }, [currentTask?.id]);

  // ---- check the alarm thresholds every tick ----------------------------
  useEffect(() => {
    if (!currentTask || minutesLeft == null) return;
    for (const t of ALARM_THRESHOLDS) {
      // fire once when we enter the (t-5, t] window for this task
      if (minutesLeft <= t && minutesLeft > t - 5) {
        const key = `${currentTask.id}|${t}`;
        if (!firedRef.current.has(key)) {
          firedRef.current.add(key);
          fireAlarm(currentTask, t);
        }
      }
    }
  }, [currentTask, minutesLeft, fireAlarm]);

  // ---- copy the app's styles into the floating window -------------------
  const copyStyles = useCallback((target: Window) => {
    // Tailwind + theme variables live in the main document's stylesheets.
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const css = Array.from(sheet.cssRules)
          .map((r) => r.cssText)
          .join("");
        const style = target.document.createElement("style");
        style.textContent = css;
        target.document.head.appendChild(style);
      } catch {
        // cross-origin sheet — re-link it instead
        if (sheet.href) {
          const link = target.document.createElement("link");
          link.rel = "stylesheet";
          link.href = sheet.href;
          target.document.head.appendChild(link);
        }
      }
    }
    // carry the light/dark theme over
    target.document.documentElement.className =
      document.documentElement.className;
  }, []);

  // ---- open / close ------------------------------------------------------
  const openFloat = useCallback(async () => {
    if (!supported) {
      onNotSupported();
      return;
    }
    try {
      // unlock audio while we still have the click gesture
      if (!audioRef.current) {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        audioRef.current = new Ctx();
      }
      audioRef.current?.resume().catch(() => {});

      // ask for notification permission so alarms can pop system toasts
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }

      const dp = (
        window as unknown as {
          documentPictureInPicture: {
            requestWindow: (o: {
              width: number;
              height: number;
            }) => Promise<Window>;
          };
        }
      ).documentPictureInPicture;

      const w = await dp.requestWindow({ width: 360, height: 480 });
      copyStyles(w);
      w.document.body.className = "bg-background text-foreground";
      w.document.title = "Live Tasks";
      w.addEventListener("pagehide", () => setPipWindow(null));
      setCollapsed(false);
      setPipWindow(w);
    } catch {
      onNotSupported();
    }
  }, [supported, onNotSupported, copyStyles]);

  const closeFloat = useCallback(() => {
    pipWindow?.close();
    setPipWindow(null);
  }, [pipWindow]);

  // resize the OS window when collapsing / expanding
  useEffect(() => {
    if (!pipWindow) return;
    try {
      pipWindow.resizeTo(360, collapsed ? 150 : 480);
    } catch {
      /* some builds block resizeTo — harmless */
    }
  }, [collapsed, pipWindow]);

  // close the float if the page goes away
  useEffect(() => {
    return () => {
      if (pipWindow) pipWindow.close();
    };
  }, [pipWindow]);

  // ---- the widget rendered inside the floating window -------------------
  const widget = (
    <div
      className={`min-h-screen w-full font-sans transition-colors ${
        flashing ? "bg-red-500/20 animate-pulse" : "bg-background"
      }`}
    >
      {/* header */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-gradient-to-r from-brand-600 to-brand-800 px-3 py-2 text-white">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <p className="text-sm font-bold truncate">Live Tasks</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="rounded px-2 py-0.5 text-xs font-semibold hover:bg-white/15"
          >
            {collapsed ? "Expand" : "Minimize"}
          </button>
          <button
            onClick={closeFloat}
            aria-label="Close"
            className="rounded p-1 hover:bg-white/15"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* current task + countdown */}
      <div className="p-3">
        {currentTask ? (
          <div className="rounded-xl border border-brand-300 bg-brand-50/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-brand-700">
                Now · {slotLabel(currentTask.start_hour, currentTask.end_hour)}
              </span>
              {minutesLeft != null && minutesLeft >= 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    minutesLeft <= 15
                      ? "bg-red-600 text-white"
                      : "bg-brand-600 text-white"
                  }`}
                >
                  {minutesLeft} min left
                </span>
              )}
            </div>
            <p className="mt-1 font-semibold text-foreground">
              {currentTask.title}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
                {typeLabel(currentTask.type)}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  statusMeta(currentTask.status).badge
                }`}
              >
                {statusMeta(currentTask.status).label}
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-3 text-center text-sm text-muted-foreground">
            No task set for this hour.
          </div>
        )}
      </div>

      {/* full list (hidden when collapsed) */}
      {!collapsed && (
        <div className="px-3 pb-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Today
          </p>
          {tasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No tasks logged yet today.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {tasks.map((t) => {
                const isNow = currentTask?.id === t.id;
                return (
                  <li
                    key={t.id}
                    className={`rounded-lg border p-2 ${
                      isNow
                        ? "border-brand-400 bg-brand-50/50"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-28 shrink-0 text-[11px] font-semibold text-brand-700">
                        {slotLabel(t.start_hour, t.end_hour)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                        {t.title}
                      </span>
                      {isNow && (
                        <span className="shrink-0 rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          NOW
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          statusMeta(t.status).badge
                        }`}
                      >
                        {statusMeta(t.status).label}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-center text-[10px] text-muted-foreground">
            Alarms at 15 · 10 · 5 min before each task ends.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {pipWindow ? (
        <Button variant="secondary" size="sm" onClick={closeFloat}>
          <PictureInPicture2 /> Close Float
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={openFloat}
          title={
            supported
              ? "Pop out a floating task list that stays on top of every window"
              : "Floating window needs Chrome or Edge (or this app installed)"
          }
        >
          <PictureInPicture2 /> Float Tasks
        </Button>
      )}
      {pipWindow && createPortal(widget, pipWindow.document.body)}
    </>
  );
}
