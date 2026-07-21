// Instant fallback shown while a dashboard page renders on the server.
// This is what makes navigation feel immediate — the click swaps to this
// skeleton right away instead of freezing on the previous page.
export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-5 sm:py-8 md:px-6 lg:px-8 space-y-6">
      {/* header */}
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-lg bg-muted animate-pulse" />
        <div className="space-y-2">
          <div className="h-6 w-48 rounded-md bg-muted animate-pulse" />
          <div className="h-3 w-64 rounded bg-muted/70 animate-pulse" />
        </div>
      </div>

      {/* content cards */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="h-5 w-40 rounded bg-muted animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 w-32 rounded bg-muted/80 animate-pulse" />
              <div className="h-10 flex-1 rounded-xl bg-muted/60 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
