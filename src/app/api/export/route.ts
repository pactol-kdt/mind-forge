import { NextResponse } from "next/server";
import { requireSessionUserId } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rateLimit";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getPlayerProfile } from "@/lib/db/queries";
import { EXPORT_VERSION } from "@/lib/sync/syncTypes";
import { fromCloudPlayerData } from "@/lib/sync/cloudProfile";
import { createDefaultPersistedData } from "@/lib/storage/gameStorage";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "CLOUD_DISABLED" }, { status: 503 });
  }

  const authResult = await requireSessionUserId();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const limited = rateLimit(`export:${authResult.userId}`, 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  try {
    const profile = await getPlayerProfile(authResult.userId);
    const data = profile
      ? fromCloudPlayerData(profile.data, createDefaultPersistedData())
      : createDefaultPersistedData();

    // Strip sync internals that are not meaningful in exports
    const { sync: _sync, ...rest } = data;
    void _sync;

    return NextResponse.json(
      {
        exportVersion: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        profile: {
          ...rest,
          sync: {
            revision: 0,
            updatedAt: Date.now(),
            lastCloudRevision: 0,
            lastSuccessfulSync: null,
            pendingChanges: false,
          },
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("export_failed", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
