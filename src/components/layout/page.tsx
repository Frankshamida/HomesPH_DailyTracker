import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Standardized page container used by every dashboard page.
 * Controls max-width, responsive horizontal padding, vertical rhythm and
 * section spacing so no page stretches to the browser edges.
 */
export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-5 sm:py-8 md:px-6 lg:px-8 space-y-6",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Page header: title (with optional icon), description, and a right-aligned
 * actions slot. Stacks vertically on mobile.
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
          {Icon && (
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-5" />
            </span>
          )}
          {title}
        </h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Small section heading used inside cards/sections. */
export function SectionHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div>
        <h2 className="font-bold text-foreground">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
