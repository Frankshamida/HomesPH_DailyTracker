"use client";

import { useState } from "react";
import Image from "next/image";
import {
  CheckCircle2,
  Download,
  RefreshCw,
  Settings as SettingsIcon,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/layout/page";
import {
  useAppVersion,
  applyUpdate,
  isStandalonePWA,
} from "@/lib/use-app-version";
import { compareVersions } from "@/lib/version";

export default function SettingsClient() {
  const {
    current,
    latest,
    changelog,
    whatsNew,
    checking,
    updateAvailable,
    lastChecked,
    error,
    check,
  } = useAppVersion();
  const [updating, setUpdating] = useState(false);

  const installed = typeof window !== "undefined" ? isStandalonePWA() : false;

  async function update() {
    setUpdating(true);
    await applyUpdate();
  }

  // features to show: the pending update, else the current version's notes
  const shownEntries = updateAvailable
    ? whatsNew
    : changelog.filter((c) => compareVersions(c.version, current) === 0);

  return (
    <PageContainer className="max-w-[820px]">
      <PageHeader
        icon={SettingsIcon}
        title="Settings"
        description="App version and updates"
      />

      {/* ---- App status card ---- */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-4 border-b border-border px-6 py-5">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white p-2 shadow ring-1 ring-border">
            <Image
              src="/homesph-mark.png"
              alt="Homes.ph"
              width={44}
              height={44}
              className="object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-foreground">
              Homes.ph Daily Task Tracker
            </p>
            <p className="text-sm text-muted-foreground">
              Installed version{" "}
              <span className="font-semibold text-foreground">v{current}</span>
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              installed
                ? "bg-emerald-100 text-emerald-700"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Smartphone className="size-3.5" />
            {installed ? "Installed app" : "In browser"}
          </span>
        </div>

        {/* update row */}
        <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            {updateAvailable ? (
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <Sparkles className="size-5" />
              </span>
            ) : (
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="size-5" />
              </span>
            )}
            <div>
              <p className="font-semibold text-foreground">
                {error
                  ? "Couldn't check for updates"
                  : updateAvailable
                    ? `Update available — v${latest}`
                    : "You're up to date"}
              </p>
              <p className="text-sm text-muted-foreground">
                {error
                  ? "Check your connection and try again."
                  : checking
                    ? "Checking…"
                    : lastChecked
                      ? `Last checked ${lastChecked.toLocaleTimeString()}`
                      : "Not checked yet"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <Button variant="outline" onClick={check} loading={checking} disabled={checking || updating}>
              <RefreshCw /> Check now
            </Button>
            {updateAvailable && (
              <Button onClick={update} loading={updating} disabled={updating}>
                <Download /> Update now
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ---- What's new / changelog ---- */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-bold text-foreground">
            {updateAvailable ? "What's new in this update" : "What's new"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Features and improvements by version.
          </p>
        </div>
        <div className="divide-y divide-border">
          {(shownEntries.length ? shownEntries : changelog).map((entry) => (
            <div key={entry.version} className="px-6 py-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-bold text-brand-700">
                  v{entry.version}
                </span>
                <span className="text-xs text-muted-foreground">{entry.date}</span>
                {entry.version === current && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    installed
                  </span>
                )}
              </div>
              <ul className="space-y-1.5">
                {entry.features.map((f, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground">
                    <span className="mt-0.5 shrink-0 text-brand-600">•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <p className="text-center text-xs text-muted-foreground">
        Updates install in place — you never need to uninstall and download the
        app again.
      </p>
    </PageContainer>
  );
}
