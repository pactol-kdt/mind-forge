import { NextResponse } from "next/server";
import { requireSessionUserId } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rateLimit";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getPlayerProfile, upsertPlayerProfile } from "@/lib/db/queries";
import {
  assertPayloadSize,
  validateExport,
} from "@/lib/validation/playerDataSchema";
import { MAX_IMPORT_BYTES } from "@/lib/sync/syncTypes";
import { mergePlayerData } from "@/lib/sync/mergePlayerData";
import { fromCloudPlayerData, toCloudPlayerData } from "@/lib/sync/cloudProfile";
import {
  createDefaultPersistedData,
  normalizeData,
} from "@/lib/storage/gameStorage";
import { createDefaultSyncState } from "@/types/profile";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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

  const limited = rateLimit(`import:${authResult.userId}`, 5, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const bodyText = await req.text();
  if (!assertPayloadSize(bodyText, MAX_IMPORT_BYTES)) {
    return NextResponse.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const mode =
    typeof (json as { mode?: string })?.mode === "string"
      ? (json as { mode: string }).mode
      : "merge";

  const exportPayload =
    (json as { export?: unknown }).export ??
    (json as { exportVersion?: number }).exportVersion != null
      ? json
      : null;

  if (!exportPayload) {
    return NextResponse.json({ error: "INVALID_EXPORT" }, { status: 400 });
  }

  const parsed = validateExport(exportPayload);
  if (!parsed.success) {
    console.error("import_validation_failed", parsed.error.issues.slice(0, 5));
    return NextResponse.json({ error: "INVALID_EXPORT" }, { status: 400 });
  }

  try {
    const imported = normalizeData({
      ...(parsed.data.profile as unknown as Parameters<typeof normalizeData>[0]),
      sync: createDefaultSyncState(Date.now()),
    });

    const existing = await getPlayerProfile(authResult.userId);
    if (!existing || mode === "replace") {
      const cloud = toCloudPlayerData(imported);
      const saved = await upsertPlayerProfile(authResult.userId, cloud);
      return NextResponse.json({
        status: mode === "replace" ? "replaced" : "created",
        revision: saved.revision,
        data: saved.data,
      });
    }

    const cloudLocal = fromCloudPlayerData(
      existing.data,
      createDefaultPersistedData()
    );
    const merge = mergePlayerData(imported, cloudLocal);
    const cloud = toCloudPlayerData(merge.merged);
    const saved = await upsertPlayerProfile(
      authResult.userId,
      cloud,
      existing.revision
    );
    return NextResponse.json({
      status: "merged",
      revision: saved.revision,
      data: saved.data,
      conflicts: merge.conflicts,
    });
  } catch (err) {
    console.error("import_failed", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
