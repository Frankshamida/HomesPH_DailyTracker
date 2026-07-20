"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarCheck,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import ThemeToggle from "@/components/ui/theme-toggle";
import HomesSwal from "@/lib/swal";
import { cn } from "@/lib/utils";

interface Props {
  userId: string;
  email: string;
  fullName: string;
  children: React.ReactNode;
}

const nav: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/daily-task", label: "My Daily Task", icon: CalendarCheck },
  { href: "/dashboard/attendance-log", label: "Attendance Log", icon: ClipboardList },
];

export default function Shell({ userId, email, fullName, children }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();
  const router = useRouter();

  const [name, setName] = useState(fullName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setName(data.full_name);
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      });
  }, [supabase, userId]);

  async function logout() {
    const res = await HomesSwal.fire({
      title: "Log out?",
      text: "You'll need to sign in again to access your tracker.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, log out",
      cancelButtonText: "Stay",
    });
    if (!res.isConfirmed) return;
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const SidebarBody = (
    <>
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1.5 shadow">
          <Image src="/homesph-mark.png" alt="Homes.ph" width={32} height={32} className="object-contain" />
        </div>
        <div>
          <p className="font-bold leading-tight">Homes.ph</p>
          <p className="text-xs text-white/60 leading-tight">Daily Task Tracker</p>
        </div>
        <ThemeToggle className="ml-auto text-white" />
      </div>

      <div className="flex flex-col items-center border-b border-white/10 px-5 py-5">
        <Avatar userId={userId} url={avatarUrl} fullName={name || email} size={72} />
        <p className="mt-3 text-center text-sm font-semibold">{name || email}</p>
        <p className="break-all text-center text-xs text-white/60">{email}</p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {nav.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-white text-primary shadow-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
            >
              {active && (
                <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent" />
              )}
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-destructive/80 hover:text-white"
        >
          <LogOut className="size-5" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-brand-900 text-white lg:flex">
        {SidebarBody}
      </aside>

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-brand-900 text-white shadow-xl transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {SidebarBody}
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 animate-fade-in lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur lg:hidden">
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <Image src="/homesph-mark.png" alt="Homes.ph" width={26} height={26} className="object-contain" />
          <span className="font-bold text-foreground">Homes.ph Daily Task Tracker</span>
          <ThemeToggle className="ml-auto text-foreground hover:bg-muted" />
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
