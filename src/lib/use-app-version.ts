"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  APP_VERSION,
  CHANGELOG,
  compareVersions,
  type ChangelogEntry,
} from "@/lib/version";

export interface AppVersionState {
  /** Version baked into the currently-running app. */
  current: string;
  /** Latest version deployed on the server (null until first check). */
  latest: string | null;
  /** Full changelog from the server (falls back to the bundled one). */
  changelog: ChangelogEntry[];
  /** Only the entries newer than the running version. */
  whatsNew: ChangelogEntry[];
  checking: boolean;
  updateAvailable: boolean;
  lastChecked: Date | null;
  error: boolean;
}

const DEFAULT_POLL_MS = 15 * 60 * 1000; // 15 min

export function useAppVersion(pollMs: number = DEFAULT_POLL_MS) {
  const [state, setState] = useState<AppVersionState>({
    current: APP_VERSION,
    latest: null,
    changelog: CHANGELOG,
    whatsNew: [],
    checking: false,
    updateAvailable: false,
    lastChecked: null,
    error: false,
  });

  const inFlight = useRef(false);

  const check = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setState((s) => ({ ...s, checking: true }));
    try {
      const res = await fetch(`/api/version?ts=${Date.now()}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as {
        version: string;
        changelog?: ChangelogEntry[];
      };
      const latest = json.version;
      const changelog = json.changelog ?? CHANGELOG;
      const updateAvailable = compareVersions(latest, APP_VERSION) > 0;
      const whatsNew = changelog.filter(
        (c) => compareVersions(c.version, APP_VERSION) > 0
      );
      setState({
        current: APP_VERSION,
        latest,
        changelog,
        whatsNew,
        checking: false,
        updateAvailable,
        lastChecked: new Date(),
        error: false,
      });
    } catch {
      setState((s) => ({ ...s, checking: false, error: true }));
    } finally {
      inFlight.current = false;
    }
  }, []);

  // check on mount, when the app regains focus, and on an interval
  useEffect(() => {
    check();
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    const id = setInterval(check, pollMs);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(id);
    };
  }, [check, pollMs]);

  return { ...state, check };
}

/** Clear caches + update the service worker, then reload into the new version. */
export async function applyUpdate() {
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg?.update().catch(() => {});
    }
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* ignore — reload will still fetch fresh from the network */
  } finally {
    // reload=true forces a fresh fetch past the bfcache
    window.location.reload();
  }
}

/** True when running as an installed PWA (standalone display mode). */
export function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}
