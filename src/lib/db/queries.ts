import { eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "./client";
import {
  playerProfiles,
  runSummaries,
  challengeRecords,
  users,
  accounts,
  sessions,
} from "./schema";
import type { CloudPlayerData } from "@/lib/sync/syncTypes";
import { validateCloudPayload } from "@/lib/validation/playerDataSchema";
import { CLOUD_SCHEMA_VERSION } from "@/lib/sync/syncTypes";
import { migrateCloudPlayerData } from "@/lib/migrations/cloudDataMigrations";

export async function getPlayerProfile(userId: string): Promise<{
  revision: number;
  data: CloudPlayerData;
  updatedAt: Date;
} | null> {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();
  const rows = await db
    .select()
    .from(playerProfiles)
    .where(eq(playerProfiles.userId, userId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const migrated = migrateCloudPlayerData(
    row.payload,
    row.schemaVersion,
    CLOUD_SCHEMA_VERSION
  );
  const parsed = validateCloudPayload(migrated);
  if (!parsed.success) {
    console.error("cloud_profile_invalid", userId, parsed.error.issues.slice(0, 5));
    return null;
  }
  return {
    revision: row.revision,
    data: parsed.data as CloudPlayerData,
    updatedAt: row.updatedAt,
  };
}

export async function upsertPlayerProfile(
  userId: string,
  data: CloudPlayerData,
  expectedBaseRevision?: number
): Promise<{ revision: number; data: CloudPlayerData; conflict?: boolean }> {
  const db = getDb();
  const existing = await getPlayerProfile(userId);

  if (
    expectedBaseRevision != null &&
    existing &&
    existing.revision !== expectedBaseRevision
  ) {
    return {
      revision: existing.revision,
      data: existing.data,
      conflict: true,
    };
  }

  const nextRevision = (existing?.revision ?? 0) + 1;
  const payload: CloudPlayerData = {
    ...data,
    schemaVersion: CLOUD_SCHEMA_VERSION,
    revision: nextRevision,
    updatedAt: Date.now(),
  };

  const parsed = validateCloudPayload(payload);
  if (!parsed.success) {
    throw new Error("INVALID_PROFILE_DATA");
  }

  if (existing) {
    await db
      .update(playerProfiles)
      .set({
        payload: parsed.data as CloudPlayerData,
        revision: nextRevision,
        schemaVersion: CLOUD_SCHEMA_VERSION,
        updatedAt: new Date(),
      })
      .where(eq(playerProfiles.userId, userId));
  } else {
    await db.insert(playerProfiles).values({
      userId,
      payload: parsed.data as CloudPlayerData,
      revision: nextRevision,
      schemaVersion: CLOUD_SCHEMA_VERSION,
    });
  }

  // Upsert run summaries (idempotent by PK)
  for (const run of payload.runHistory.slice(0, 80)) {
    try {
      await db
        .insert(runSummaries)
        .values({
          id: run.id,
          userId,
          timestamp: run.timestamp,
          mode: run.mode,
          seed: run.seed ?? null,
          score: Math.round(run.score),
          floorReached: run.floorReached,
          accuracy: Math.round(run.accuracy * 10000),
          bestStreak: run.bestStreak ?? null,
          difficultyTier: run.difficultyTier,
          archetype: run.archetype ?? null,
          challengeId: run.challengeId ?? null,
          weeklyId: run.weeklyId ?? null,
        })
        .onConflictDoNothing();
    } catch {
      console.error("run_summary_upsert_failed", run.id);
    }
  }

  // Sync challenge completion counts
  for (const [challengeId, completions] of Object.entries(
    payload.meta.completedChallenges
  )) {
    await db
      .insert(challengeRecords)
      .values({ userId, challengeId, completions })
      .onConflictDoUpdate({
        target: [challengeRecords.userId, challengeRecords.challengeId],
        set: { completions, updatedAt: new Date() },
      });
  }

  return { revision: nextRevision, data: parsed.data as CloudPlayerData };
}

export async function deleteUserAccount(userId: string): Promise<void> {
  const db = getDb();
  // Cascades handle profiles/runs/challenges/accounts/sessions
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await db.delete(accounts).where(eq(accounts.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}

export async function updateDisplayName(
  userId: string,
  displayName: string | null
): Promise<void> {
  const db = getDb();
  await db
    .update(users)
    .set({ displayName, updatedAt: new Date(), name: displayName })
    .where(eq(users.id, userId));
}
