import { NextResponse } from "next/server";
import { authProvidersAvailable } from "@/lib/auth/auth";
import { isDatabaseConfigured } from "@/lib/db/client";

export const dynamic = "force-dynamic";

/** Public config for Account UI (no secrets). */
export async function GET() {
  return NextResponse.json(
    {
      cloudEnabled: isDatabaseConfigured() && Boolean(process.env.AUTH_SECRET),
      providers: authProvidersAvailable(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
