import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Shell from "@/components/Shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <Shell
      userId={user.id}
      email={user.email ?? ""}
      fullName={(user.user_metadata?.full_name as string) ?? ""}
    >
      {children}
    </Shell>
  );
}
