import { NextResponse } from "next/server";
import { requireSessionUserId } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rateLimit";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getPlayerProfile, upsertPlayerProfile } from "@/lib/db/queries";
import {
  assertPayloadSize,
  validateSyncRequest,
} from "@/lib/validation/playerDataSchema";
import { MAX_SYNC_PAYLOAD_BYTES } from "@/lib/sync/syncTypes";
import { mergePlayerData } from "@/lib/sync/mergePlayerData";
import { fromCloudPlayerData, toCloudPlayerData } from "@/lib/sync/cloudProfile";
import { createDefaultPersistedData } from "@/lib/storage/gameStorage";

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

  const limited = rateLimit(`sync:${authResult.userId}`, 30, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  let bodyText: string;
  try {
    bodyText = await req.text();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  if (!assertPayloadSize(bodyText, MAX_SYNC_PAYLOAD_BYTES)) {
    return NextResponse.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = validateSyncRequest(json);
  if (!parsed.success) {
    console.error("sync_validation_failed", parsed.error.issues.slice(0, 5));
    return NextResponse.json({ error: "INVALID_PROFILE_DATA" }, { status: 400 });
  }

  const { baseRevision, data, deviceId } = parsed.data;

  try {
    const existing = await getPlayerProfile(authResult.userId);

    if (!existing) {
      const saved = await upsertPlayerProfile(authResult.userId, {
        ...data,
        deviceId: deviceId ?? data.deviceId,
      });
      return NextResponse.json({
        status: "created",
        revision: saved.revision,
        data: saved.data,
      });
    }

    if (existing.revision !== baseRevision) {
      // Auto-merge server-side then save
      const localAsPersisted = fromCloudPlayerData(data, createDefaultPersistedData());
      const cloudAsPersisted = fromCloudPlayerData(
        existing.data,
        createDefaultPersistedData()
      );
      const merge = mergePlayerData(localAsPersisted, cloudAsPersisted);
      const mergedCloud = toCloudPlayerData(merge.merged, {
        revision: existing.revision,
        deviceId: deviceId ?? data.deviceId,
      });
      const saved = await upsertPlayerProfile(
        authResult.userId,
        mergedCloud,
        existing.revision
      );
      return NextResponse.json({
        status: "merged",
        revision: saved.revision,
        data: saved.data,
        conflicts: merge.conflicts,
        strategyUsed: merge.strategyUsed,
        needsPlayerChoice: merge.needsPlayerChoice,
      });
    }

    const saved = await upsertPlayerProfile(
      authResult.userId,
      { ...data, deviceId: deviceId ?? data.deviceId },
      baseRevision
    );

    if (saved.conflict) {
      return NextResponse.json({
        status: "conflict",
        revision: saved.revision,
        data: saved.data,
      });
    }

    return NextResponse.json({
      status: "updated",
      revision: saved.revision,
      data: saved.data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "SERVER_ERROR";
    if (message === "INVALID_PROFILE_DATA") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("sync_failed", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
