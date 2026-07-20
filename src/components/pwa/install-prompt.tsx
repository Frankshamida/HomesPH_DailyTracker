"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, Plus, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "hph-install-dismissed";
const DISMISS_DAYS = 7;

function recentlyDismissed(): boolean {
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return ts > 0 && Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Register the service worker (needed for installability).
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone() || recentlyDismissed()) return;

    const ua = window.navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    setIsIOS(ios);

    // Android / desktop Chromium: capture the native prompt.
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS has no beforeinstallprompt — show manual instructions after a beat.
    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (ios) {
      iosTimer = setTimeout(() => setOpen(true), 2500);
    }

    const onInstalled = () => {
      setOpen(false);
      setDeferred(null);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setOpen(false);
    setDeferred(null);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[120] flex justify-center p-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md animate-fade-in rounded-2xl border border-border bg-card p-5 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow ring-1 ring-border">
            <Image src="/homesph-mark.png" alt="Homes.ph" width={40} height={40} className="object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-foreground">Install Daily Task Tracker</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Add it to your device for a full-screen, app-like experience — works on phone, tablet
              and desktop.
            </p>

            {isIOS ? (
              <div className="mt-3 rounded-lg bg-muted/60 p-3 text-sm text-foreground">
                <p className="font-medium">To install on iPhone / iPad:</p>
                <ol className="mt-1 space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-1.5">
                    1. Tap the <Share className="inline size-4 text-primary" /> Share button
                  </li>
                  <li className="flex items-center gap-1.5">
                    2. Choose <Plus className="inline size-4 text-primary" /> “Add to Home Screen”
                  </li>
                </ol>
              </div>
            ) : (
              <div className="mt-4 flex gap-2">
                <Button onClick={install} disabled={!deferred}>
                  <Download /> Install app
                </Button>
                <Button variant="ghost" onClick={dismiss}>
                  Not now
                </Button>
              </div>
            )}
          </div>

          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
