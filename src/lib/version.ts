// ===========================================================================
// APP VERSION — single source of truth for the in-app updater.
// ---------------------------------------------------------------------------
// HOW UPDATES WORK (no uninstall / reinstall needed):
//   1. Bump APP_VERSION below every time you ship new features.
//   2. Add a CHANGELOG entry describing what changed (this is the "what's new"
//      list users see in the update popup and on the Settings page).
//   3. Commit & deploy to Vercel.
//
// The running (old) app polls /api/version — which Vercel always serves from
// the LATEST deployment — sees the new version, and shows the update popup.
// Tapping "Update" clears caches and reloads into the new version.
// ===========================================================================

export interface ChangelogEntry {
  version: string;
  date: string; // YYYY-MM-DD
  features: string[];
}

/** ⬆️ Bump this on every release. */
export const APP_VERSION = "1.2.0";

/** Newest first. Add a new entry above the previous one on each release. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.2.0",
    date: "2026-07-21",
    features: [
      "🎬 New \"Video Listing Posting\" task type — add one or more listing titles + YouTube links to a task after it's created, with an embedded video preview.",
      "📊 \"Auditing\" now supports a reference link too, shown as \"View Google Sheet\" alongside Quality Assurance.",
      "✨ Video Listing Posting tasks auto-fill a ready-made description.",
      "🔗 Daily reports now automatically include your shareable link at the end.",
      "🖼️ Sharing your link on Messenger/Facebook now shows a proper preview card — \"Homes.ph - Daily Task\" with your name, date, and photo.",
      "💅 Nicer-looking reference links and listing previews on your public live-status page.",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-07-21",
    features: [
      "🪟 Floating task list that stays on top of any window (desktop).",
      "⏰ Alarms 15, 10 and 5 minutes before each task ends.",
      "🔗 Public live-status page at /your-name — no login needed to view.",
      "🔄 In-app updates — get new features without uninstalling/reinstalling.",
      "⚙️ New Settings page showing your app version and update status.",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-07-20",
    features: ["🎉 First release of the Homes.ph Daily Task Tracker."],
  },
];

/** Compare two dotted version strings. >0 if a is newer than b. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}
