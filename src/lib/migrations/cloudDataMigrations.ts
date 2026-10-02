import type { CloudPlayerData } from "@/lib/sync/syncTypes";
import { CLOUD_SCHEMA_VERSION } from "@/lib/sync/syncTypes";
import { ensureRunId } from "@/lib/sync/runIds";

/** Deterministic cloud payload migrations. */
export function migrateCloudPlayerData(
  data: unknown,
  fromVersion: number,
  toVersion: number
): CloudPlayerData {
  let current = data as Record<string, unknown>;
  let version = fromVersion;

  if (version < 5) {
    // Pre-v5 is not expected in cloud; wrap best-effort
    version = 5;
  }

  if (version === 5 && toVersion >= 6) {
    const runs = Array.isArray(current.runHistory)
      ? (current.runHistory as Array<Record<string, unknown>>).map((r) =>
          ensureRunId({
            id: typeof r.id === "string" ? r.id : undefined,
            timestamp: Number(r.timestamp) || Date.now(),
            mode: (r.mode as never) || "standard",
            seed: typeof r.seed === "string" ? r.seed : undefined,
            score: Number(r.score) || 0,
            floorReached: Number(r.floorReached) || 0,
            accuracy: Number(r.accuracy) || 0,
            bestStreak:
              typeof r.bestStreak === "number" ? r.bestStreak : undefined,
            archetype:
              typeof r.archetype === "string" ? r.archetype : undefined,
            challengeId:
              typeof r.challengeId === "string" ? r.challengeId : undefined,
            difficultyTier: (r.difficultyTier as never) || "standard",
            weeklyId: typeof r.weeklyId === "string" ? r.weeklyId : undefined,
          })
        )
      : [];
    current = {
      ...current,
      schemaVersion: 6,
      revision: typeof current.revision === "number" ? current.revision : 0,
      updatedAt:
        typeof current.updatedAt === "number" ? current.updatedAt : Date.now(),
      runHistory: runs,
      familyStats:
        current.familyStats && typeof current.familyStats === "object"
          ? current.familyStats
          : {},
      seenFamilyIntros: Array.isArray(current.seenFamilyIntros)
        ? current.seenFamilyIntros
        : [],
    };
    version = 6;
  }

  return {
    ...(current as unknown as CloudPlayerData),
    schemaVersion: Math.min(version, toVersion) || CLOUD_SCHEMA_VERSION,
  };
}
