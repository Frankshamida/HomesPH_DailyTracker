"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppVersion, applyUpdate } from "@/lib/use-app-version";

const DISMISS_KEY = "hph-update-dismissed"; // stores the version the user skipped

export default function UpdatePrompt() {
  const { latest, updateAvailable, whatsNew } = useAppVersion();
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  // open the popup when a newer version appears (unless already skipped)
  useEffect(() => {
    if (!updateAvailable || !latest) return;
    let skipped: string | null = null;
    try {
      skipped = localStorage.getItem(DISMISS_KEY);
    } catch {
      /* ignore */
    }
    if (skipped !== latest) setOpen(true);
  }, [updateAvailable, latest]);

  if (!open || !updateAvailable) return null;

  function cancel() {
    setOpen(false);
    try {
      if (latest) localStorage.setItem(DISMISS_KEY, latest);
    } catch {
      /* ignore */
    }
  }

  async function update() {
    setUpdating(true);
    await applyUpdate();
  }

  const features = whatsNew.flatMap((c) => c.features);

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md animate-fade-in rounded-2xl border border-border bg-card shadow-2xl">
        {/* header */}
        <div className="flex items-start gap-3 rounded-t-2xl bg-gradient-to-br from-brand-600 to-brand-800 px-5 py-4 text-white">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <Sparkles className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold">New update available!</p>
            <p className="text-xs text-white/80">
              Version {latest} is ready to install.
            </p>
          </div>
          <button
            onClick={cancel}
            aria-label="Close"
            className="rounded-md p-1 hover:bg-white/15"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* what's new */}
        <div className="max-h-[45vh] overflow-y-auto px-5 py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            What&apos;s new
          </p>
          {features.length ? (
            <ul className="space-y-2">
              {features.map((f, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground">
                  <span className="mt-0.5 shrink-0 text-brand-600">•</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Bug fixes and improvements.
            </p>
          )}
        </div>

        {/* actions */}
        <div className="flex gap-3 border-t border-border px-5 py-4">
          <Button variant="outline" className="flex-1" onClick={cancel} disabled={updating}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={update} loading={updating} disabled={updating}>
            <RefreshCw /> Update
          </Button>
        </div>
        <p className="px-5 pb-4 text-center text-[11px] text-muted-foreground">
          No reinstall needed — the app refreshes into the new version.
        </p>
      </div>
    </div>
  );
}
