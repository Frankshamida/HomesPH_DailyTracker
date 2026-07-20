import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DailyTaskClient from "./daily-task-client";

export default async function DailyTaskPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <DailyTaskClient userId={user.id} />;
}
