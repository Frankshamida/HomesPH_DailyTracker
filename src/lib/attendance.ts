// ---------------------------------------------------------------------------
// Homes.ph Daily Tracker — Attendance rules
//
// Schedule (Asia/Manila):
//   Monday – Friday : 09:00 – 18:00  (lunch 12:00 – 13:00, unpaid)
//   Saturday        : 09:00 – 12:00  (no lunch break)
//   Sunday          : no work
//
// Time-in:
//   before 09:00        -> EARLY IN  (minutes counted before 09:00)
//   exactly 09:00       -> ON TIME
//   09:01 and later     -> LATE      (minutes counted after 09:00)
//
// Time-out:
//   before scheduled end -> EARLY OUT (reason required, minutes counted)
//   after  scheduled end -> OVERTIME  (minutes counted after end)
// ---------------------------------------------------------------------------

export type DayType = "weekday" | "saturday" | "sunday";

export interface Schedule {
  dayType: DayType;
  startMinutes: number; // minutes from midnight
  endMinutes: number | null; // null on Sunday
  hasLunch: boolean;
}

const START = 9 * 60; // 09:00
const WEEKDAY_END = 18 * 60; // 18:00
const SATURDAY_END = 12 * 60; // 12:00

/** Convert a Date to minutes-from-midnight in Asia/Manila. */
export function manilaMinutes(date: Date): number {
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

/** Weekday index (0 = Sunday .. 6 = Saturday) in Asia/Manila. */
export function manilaWeekday(date: Date): number {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    weekday: "short",
  }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

/** YYYY-MM-DD work-date in Asia/Manila (used as the daily key). */
export function manilaDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getSchedule(date: Date): Schedule {
  const wd = manilaWeekday(date);
  if (wd === 0) {
    return { dayType: "sunday", startMinutes: START, endMinutes: null, hasLunch: false };
  }
  if (wd === 6) {
    return { dayType: "saturday", startMinutes: START, endMinutes: SATURDAY_END, hasLunch: false };
  }
  return { dayType: "weekday", startMinutes: START, endMinutes: WEEKDAY_END, hasLunch: true };
}

export type InStatus = "early" | "on_time" | "late";
export type OutStatus = "early_out" | "on_time" | "overtime";

export interface InResult {
  status: InStatus;
  minutes: number; // early minutes OR late minutes (0 when on time)
  label: string;
}

export interface OutResult {
  status: OutStatus;
  minutes: number; // early-out minutes OR overtime minutes (0 when on time)
  requiresReason: boolean;
  label: string;
}

export function evaluateTimeIn(date: Date): InResult {
  const now = manilaMinutes(date);
  if (now < START) {
    return { status: "early", minutes: START - now, label: "Early In" };
  }
  if (now === START) {
    return { status: "on_time", minutes: 0, label: "On Time" };
  }
  return { status: "late", minutes: now - START, label: "Late" };
}

export function evaluateTimeOut(date: Date): OutResult {
  const sched = getSchedule(date);
  const now = manilaMinutes(date);
  const end = sched.endMinutes ?? WEEKDAY_END;

  if (now < end) {
    return {
      status: "early_out",
      minutes: end - now,
      requiresReason: true,
      label: "Early Out",
    };
  }
  if (now === end) {
    return { status: "on_time", minutes: 0, requiresReason: false, label: "On Time" };
  }
  return {
    status: "overtime",
    minutes: now - end,
    requiresReason: false,
    label: "Overtime",
  };
}

/** "1h 25m" / "45m" / "0m" */
export function formatMinutes(mins: number): string {
  const m = Math.max(0, Math.round(mins));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h > 0 && r > 0) return `${h}h ${r}m`;
  if (h > 0) return `${h}h`;
  return `${r}m`;
}

/** Work-slot START hours for a given date (Asia/Manila). Lunch 12–13 excluded. */
export function getWorkSlots(date: Date): number[] {
  const sched = getSchedule(date);
  if (sched.dayType === "sunday") return [];
  if (sched.dayType === "saturday") return [9, 10, 11];
  // weekday: 9–18, skip 12 (lunch)
  return [9, 10, 11, 13, 14, 15, 16, 17];
}

/** 9 -> "9:00 AM", 13 -> "1:00 PM" */
export function formatHour(hour24: number): string {
  const period = hour24 >= 12 ? "PM" : "AM";
  const h = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${h}:00 ${period}`;
}

/** 9,10 -> "9:00 AM – 10:00 AM" */
export function slotLabel(start: number, end: number): string {
  return `${formatHour(start)} – ${formatHour(end)}`;
}

/** Current hour (0–23) in Asia/Manila. */
export function manilaHour(date: Date): number {
  return Math.floor(manilaMinutes(date) / 60);
}

export function formatManilaTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
