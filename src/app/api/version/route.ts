import { NextResponse } from "next/server";
import { APP_VERSION, CHANGELOG } from "@/lib/version";

// Always served from the latest Vercel deployment, never cached — this is how
// an older running client discovers that a new version has been deployed.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET() {
  return NextResponse.json(
    { version: APP_VERSION, changelog: CHANGELOG },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
      },
    }
  );
}
