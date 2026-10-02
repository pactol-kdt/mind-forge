import { NextResponse } from "next/server";
import { requireSessionUserId } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rateLimit";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getPlayerProfile } from "@/lib/db/queries";
import { authProvidersAvailable } from "@/lib/auth/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        error: "CLOUD_DISABLED",
        providers: authProvidersAvailable(),
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  const authResult = await requireSessionUserId();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status, headers: { "Cache-Control": "no-store" } }
    );
  }

  const limited = rateLimit(`profile:${authResult.userId}`, 60, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "RATE_LIMITED" },
      { status: 429, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const profile = await getPlayerProfile(authResult.userId);
    return NextResponse.json(
      {
        user: {
          id: authResult.userId,
          email: authResult.email,
          displayName: authResult.name,
          avatarUrl: authResult.image,
        },
        profile: profile
          ? {
              revision: profile.revision,
              updatedAt: profile.updatedAt.toISOString(),
              data: profile.data,
            }
          : null,
        providers: authProvidersAvailable(),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("profile_get_failed", err);
    return NextResponse.json(
      { error: "SERVER_ERROR" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
