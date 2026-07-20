import { SearchX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import LiveStatus from "./live-status";

export const dynamic = "force-dynamic";

// "Frank Dweezel Gomez" -> "frankdweezelgomez"
function slugify(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default async function LiveStatusPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    /* keep raw slug if it isn't valid percent-encoding */
  }
  const target = slugify(decoded);
  const supabase = await createClient();

  // Resolve the slug against every profile's full name.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url");

  const match =
    (profiles ?? []).find((p) => p.full_name && slugify(p.full_name) === target) ?? null;

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <SearchX className="size-7" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Person not found</h1>
          <p className="text-muted-foreground">No Homes.ph team member matches this link.</p>
        </div>
      </div>
    );
  }

  return (
    <LiveStatus
      userId={match.id}
      name={match.full_name || "Team Member"}
      avatar={match.avatar_url ?? null}
    />
  );
}
