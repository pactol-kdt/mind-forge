import type { PersistedGameData } from "@/types/profile";
import type { CloudPlayerData } from "@/lib/sync/syncTypes";
import {
  CLOUD_SCHEMA_VERSION,
  RUN_HISTORY_CLOUD_LIMIT,
  WEEKLY_HISTORY_CLOUD_LIMIT,
  PERFORMANCE_SAMPLE_LIMIT,
} from "@/lib/sync/syncTypes";
import { createDefaultSyncState } from "@/types/profile";
import { ALL_PUZZLE_TYPES } from "@/types/puzzles";

export function toCloudPlayerData(
  data: PersistedGameData,
  opts?: { revision?: number; deviceId?: string }
): CloudPlayerData {
  const revision = opts?.revision ?? data.sync.revision;
  const profile = {
    ...data.profile,
    categories: { ...data.profile.categories },
  };
  for (const type of ALL_PUZZLE_TYPES) {
    const cat = profile.categories[type];
    if (cat?.recentPerformance?.length > PERFORMANCE_SAMPLE_LIMIT) {
      profile.categories[type] = {
        ...cat,
        recentPerformance: cat.recentPerformance.slice(
          -PERFORMANCE_SAMPLE_LIMIT
        ),
      };
    }
  }
  return {
    schemaVersion: CLOUD_SCHEMA_VERSION,
    revision,
    updatedAt: data.sync.updatedAt || Date.now(),
    deviceId: opts?.deviceId ?? data.sync.deviceId,
    profile,
    lifetime: data.lifetime,
    personalBests: data.personalBests,
    milestones: data.milestones,
    settings: data.settings,
    daily: data.daily,
    meta: data.meta,
    runHistory: data.runHistory.slice(0, RUN_HISTORY_CLOUD_LIMIT),
    weeklyHistory: data.weeklyHistory.slice(0, WEEKLY_HISTORY_CLOUD_LIMIT),
    modeBests: data.modeBests,
    familyStats: data.familyStats,
    seenFamilyIntros: data.seenFamilyIntros,
  };
}

export function fromCloudPlayerData(
  cloud: CloudPlayerData,
  base?: PersistedGameData
): PersistedGameData {
  const sync = base?.sync ?? createDefaultSyncState(cloud.updatedAt);
  return {
    schemaVersion: CLOUD_SCHEMA_VERSION,
    profile: cloud.profile,
    lifetime: cloud.lifetime,
    personalBests: cloud.personalBests,
    milestones: cloud.milestones,
    settings: cloud.settings,
    daily: cloud.daily,
    meta: cloud.meta,
    runHistory: cloud.runHistory,
    weeklyHistory: cloud.weeklyHistory,
    modeBests: cloud.modeBests,
    familyStats: cloud.familyStats,
    seenFamilyIntros: cloud.seenFamilyIntros,
    sync: {
      ...sync,
      revision: cloud.revision,
      updatedAt: cloud.updatedAt,
      deviceId: cloud.deviceId ?? sync.deviceId,
      lastCloudRevision: cloud.revision,
      pendingChanges: false,
    },
  };
}
