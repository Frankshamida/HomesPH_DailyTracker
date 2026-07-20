"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/dashboard");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        if (data.session) {
          router.replace("/dashboard");
          router.refresh();
        } else {
          setNotice("Account created! Please check your email to confirm, then sign in.");
          setMode("signin");
        }
      }
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-white mb-4 shadow-lg p-3">
            <Image src="/homesph-mark.png" alt="Homes.ph" width={56} height={56} className="object-contain" priority />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Homes.ph</h1>
          <p className="text-brand-100 font-medium">Daily Task Tracker</p>
        </div>

        <div className="rounded-2xl bg-card p-8 shadow-2xl">
          <div className="mb-6 flex rounded-xl bg-muted p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                  setNotice(null);
                }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                  mode === m ? "bg-card text-primary shadow" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Full name</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-lg border border-input bg-card py-2.5 pl-9 pr-3 outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                    placeholder="Juan Dela Cruz"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card py-2.5 pl-9 pr-3 outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                  placeholder="you@homes.ph"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPw ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card py-2.5 pl-9 pr-10 outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" /> {error}
              </div>
            )}
            {notice && (
              <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/10 px-3 py-2 text-sm text-success">
                <CheckCircle2 className="size-4 shrink-0" /> {notice}
              </div>
            )}

            <Button type="submit" size="lg" loading={loading} className="w-full">
              {mode === "signin" ? "Sign In" : "Create Account"}
            </Button>
          </form>
        </div>

        <p className="text-center text-brand-100 text-xs mt-6">
          © {new Date().getFullYear()} Homes.ph · Daily Task Tracker
        </p>
      </div>
    </div>
  );
}
