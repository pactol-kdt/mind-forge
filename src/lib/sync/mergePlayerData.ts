import type { PersistedGameData, CategoryProfile } from "@/types/profile";
import { createDefaultSyncState } from "@/types/profile";
import { createDefaultPersistedData } from "@/lib/storage/gameStorage";
import type { MergeConflict, MergeResult } from "@/lib/sync/syncTypes";
import {
  RUN_HISTORY_CLOUD_LIMIT,
  WEEKLY_HISTORY_CLOUD_LIMIT,
  PERFORMANCE_SAMPLE_LIMIT,
} from "@/lib/sync/syncTypes";
import { ALL_PUZZLE_TYPES } from "@/types/puzzles";
import type { RunHistoryEntry, WeeklyRecord, MetaProgression } from "@/types/run";
import { ensureRunId } from "@/lib/sync/runIds";

function unionStrings(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])];
}

function maxNum(a: number, b: number): number {
  return Math.max(a || 0, b || 0);
}

function preferNewer<T>(
  localVal: T,
  cloudVal: T,
  localUpdated: number,
  cloudUpdated: number
): T {
  return localUpdated >= cloudUpdated ? localVal : cloudVal;
}

function mergeCategory(
  local: CategoryProfile,
  cloud: CategoryProfile,
  localNewer: boolean
): CategoryProfile {
  const samples = [
    ...(local.recentPerformance ?? []),
    ...(cloud.recentPerformance ?? []),
  ]
    .sort((a, b) => a.timestamp - b.timestamp)
    .filter(
      (s, i, arr) =>
        i === 0 ||
        s.timestamp !== arr[i - 1]!.timestamp ||
        s.difficulty !== arr[i - 1]!.difficulty
    )
    .slice(-PERFORMANCE_SAMPLE_LIMIT);

  // Ratings / rolling stats: prefer newer snapshot (not max)
  const base = localNewer ? local : cloud;
  return {
    ...base,
    masteryXP: maxNum(local.masteryXP, cloud.masteryXP),
    masteryLevel: maxNum(local.masteryLevel, cloud.masteryLevel),
    puzzlesAttempted: maxNum(local.puzzlesAttempted, cloud.puzzlesAttempted),
    puzzlesCorrect: maxNum(local.puzzlesCorrect, cloud.puzzlesCorrect),
    highestDifficulty: maxNum(local.highestDifficulty, cloud.highestDifficulty),
    confidence: Math.max(local.confidence, cloud.confidence),
    recentPerformance: samples,
    lastPlayedAt: maxNum(local.lastPlayedAt ?? 0, cloud.lastPlayedAt ?? 0) || undefined,
  };
}

function mergeRuns(
  local: RunHistoryEntry[],
  cloud: RunHistoryEntry[]
): RunHistoryEntry[] {
  const map = new Map<string, RunHistoryEntry>();
  for (const r of [...cloud, ...local]) {
    const entry = ensureRunId(r);
    if (!map.has(entry.id)) map.set(entry.id, entry);
  }
  return [...map.values()]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, RUN_HISTORY_CLOUD_LIMIT);
}

function mergeWeekly(
  local: WeeklyRecord[],
  cloud: WeeklyRecord[]
): WeeklyRecord[] {
  const map = new Map<string, WeeklyRecord>();
  for (const w of [...cloud, ...local]) {
    const prev = map.get(w.weekId);
    if (!prev) {
      map.set(w.weekId, w);
      continue;
    }
    map.set(w.weekId, {
      weekId: w.weekId,
      attempts: maxNum(prev.attempts, w.attempts),
      bestScore: maxNum(prev.bestScore, w.bestScore),
      highestFloor: maxNum(prev.highestFloor, w.highestFloor),
      bestAccuracy: Math.max(prev.bestAccuracy, w.bestAccuracy),
      completed: prev.completed || w.completed,
    });
  }
  return [...map.values()]
    .sort((a, b) => b.weekId.localeCompare(a.weekId))
    .slice(0, WEEKLY_HISTORY_CLOUD_LIMIT);
}

function mergeMeta(local: MetaProgression, cloud: MetaProgression): MetaProgression {
  const completed: Record<string, number> = { ...cloud.completedChallenges };
  for (const [k, v] of Object.entries(local.completedChallenges)) {
    completed[k] = maxNum(completed[k] ?? 0, v);
  }
  return {
    unlockedChallengeIds: unionStrings(
      local.unlockedChallengeIds,
      cloud.unlockedChallengeIds
    ),
    unlockedModifierIds: unionStrings(
      local.unlockedModifierIds,
      cloud.unlockedModifierIds
    ),
    unlockedBossIds: unionStrings(local.unlockedBossIds, cloud.unlockedBossIds),
    unlockedUpgradeIds: unionStrings(
      local.unlockedUpgradeIds,
      cloud.unlockedUpgradeIds
    ),
    difficultyTiersUnlocked: unionStrings(
      local.difficultyTiersUnlocked,
      cloud.difficultyTiersUnlocked
    ) as MetaProgression["difficultyTiersUnlocked"],
    completedChallenges: completed,
    pendingUnlockNotices: unionStrings(
      local.pendingUnlockNotices,
      cloud.pendingUnlockNotices
    ),
  };
}

/**
 * Field-aware merge. Counters use max (not sum) to avoid double-counting
 * previously synced progress. Ratings prefer the newer revision snapshot.
 */
export function mergePlayerData(
  local: PersistedGameData,
  cloud: PersistedGameData,
  opts?: { preferLocalOnAmbiguity?: boolean }
): MergeResult {
  const conflicts: MergeConflict[] = [];
  const strategyUsed: string[] = [];
  const localUpdated = local.sync?.updatedAt ?? local.profile.updatedAt ?? 0;
  const cloudUpdated = cloud.sync?.updatedAt ?? cloud.profile.updatedAt ?? 0;
  const localNewer = localUpdated >= cloudUpdated;
  const localRev = local.sync?.revision ?? 0;
  const cloudRev = cloud.sync?.revision ?? 0;

  if (localRev > 0 && cloudRev > 0 && localRev < cloudRev && local.sync?.pendingChanges) {
    conflicts.push({
      field: "revision",
      reason: "Local has pending changes against a newer cloud revision",
      localValue: localRev,
      cloudValue: cloudRev,
    });
  }

  strategyUsed.push("personalBests:max");
  const personalBests = {
    highestScore: maxNum(
      local.personalBests.highestScore,
      cloud.personalBests.highestScore
    ),
    highestFloor: maxNum(
      local.personalBests.highestFloor,
      cloud.personalBests.highestFloor
    ),
    bestStreak: maxNum(
      local.personalBests.bestStreak,
      cloud.personalBests.bestStreak
    ),
    mostCorrectInRun: maxNum(
      local.personalBests.mostCorrectInRun,
      cloud.personalBests.mostCorrectInRun
    ),
    fastestCorrectMs:
      local.personalBests.fastestCorrectMs == null
        ? cloud.personalBests.fastestCorrectMs
        : cloud.personalBests.fastestCorrectMs == null
          ? local.personalBests.fastestCorrectMs
          : Math.min(
              local.personalBests.fastestCorrectMs,
              cloud.personalBests.fastestCorrectMs
            ),
    bestDifficulty: { ...cloud.personalBests.bestDifficulty },
  };
  for (const t of ALL_PUZZLE_TYPES) {
    personalBests.bestDifficulty[t] = maxNum(
      local.personalBests.bestDifficulty[t] ?? 1,
      cloud.personalBests.bestDifficulty[t] ?? 1
    );
  }

  strategyUsed.push("lifetime:max-not-sum");
  const lifetime = {
    gamesPlayed: maxNum(local.lifetime.gamesPlayed, cloud.lifetime.gamesPlayed),
    totalPuzzlesSolved: maxNum(
      local.lifetime.totalPuzzlesSolved,
      cloud.lifetime.totalPuzzlesSolved
    ),
    bestScore: maxNum(local.lifetime.bestScore, cloud.lifetime.bestScore),
    highestFloor: maxNum(local.lifetime.highestFloor, cloud.lifetime.highestFloor),
    bestStreak: maxNum(local.lifetime.bestStreak, cloud.lifetime.bestStreak),
    categoryStats: { ...cloud.lifetime.categoryStats },
  };
  for (const t of ALL_PUZZLE_TYPES) {
    const a = local.lifetime.categoryStats[t];
    const b = cloud.lifetime.categoryStats[t];
    lifetime.categoryStats[t] = {
      attempted: maxNum(a?.attempted ?? 0, b?.attempted ?? 0),
      correct: maxNum(a?.correct ?? 0, b?.correct ?? 0),
      totalResponseMs: maxNum(a?.totalResponseMs ?? 0, b?.totalResponseMs ?? 0),
      highestDifficulty: maxNum(
        a?.highestDifficulty ?? 1,
        b?.highestDifficulty ?? 1
      ),
      scoreContribution: maxNum(
        a?.scoreContribution ?? 0,
        b?.scoreContribution ?? 0
      ),
    };
  }

  strategyUsed.push("xp:prefer-newer-revision-snapshot");
  const xpSource = localNewer ? local.profile : cloud.profile;
  const other = localNewer ? cloud.profile : local.profile;

  strategyUsed.push("ratings:prefer-newer-snapshot");
  strategyUsed.push("mastery:max");
  const categories = { ...xpSource.categories };
  for (const t of ALL_PUZZLE_TYPES) {
    categories[t] = mergeCategory(
      local.profile.categories[t],
      cloud.profile.categories[t],
      localNewer
    );
  }

  const profile = {
    ...xpSource,
    lifetimeXP: maxNum(local.profile.lifetimeXP, cloud.profile.lifetimeXP),
    playerLevel: maxNum(local.profile.playerLevel, cloud.profile.playerLevel),
    currentXP: preferNewer(
      local.profile.currentXP,
      cloud.profile.currentXP,
      localUpdated,
      cloudUpdated
    ),
    totalRuns: maxNum(local.profile.totalRuns, cloud.profile.totalRuns),
    totalPuzzles: maxNum(local.profile.totalPuzzles, cloud.profile.totalPuzzles),
    dailyTrainingsCompleted: maxNum(
      local.profile.dailyTrainingsCompleted,
      cloud.profile.dailyTrainingsCompleted
    ),
    unlockedVariants: unionStrings(
      local.profile.unlockedVariants,
      cloud.profile.unlockedVariants
    ),
    categories,
    createdAt: Math.min(local.profile.createdAt, cloud.profile.createdAt),
    updatedAt: Math.max(localUpdated, cloudUpdated),
  };

  // If levels diverge meaningfully with both pending, flag for UI
  if (
    Math.abs(local.profile.playerLevel - cloud.profile.playerLevel) >= 2 &&
    local.sync?.pendingChanges &&
    cloudRev !== localRev
  ) {
    conflicts.push({
      field: "playerLevel",
      reason: "Both devices have newer progress",
      localValue: local.profile.playerLevel,
      cloudValue: cloud.profile.playerLevel,
    });
  }

  strategyUsed.push("milestones:union");
  strategyUsed.push("unlocks:union");
  strategyUsed.push("runs:dedupe-by-id");
  strategyUsed.push("settings:prefer-newer");

  const settings = preferNewer(
    local.settings,
    cloud.settings,
    localUpdated,
    cloudUpdated
  );

  const daily = preferNewer(local.daily, cloud.daily, localUpdated, cloudUpdated);

  const familyStats = { ...cloud.familyStats };
  for (const [k, v] of Object.entries(local.familyStats)) {
    const prev = familyStats[k];
    if (!prev) {
      familyStats[k] = v;
      continue;
    }
    familyStats[k] = {
      attempts: maxNum(prev.attempts, v.attempts),
      correct: maxNum(prev.correct, v.correct),
      totalResponseMs: maxNum(prev.totalResponseMs, v.totalResponseMs),
      highestDifficulty: maxNum(prev.highestDifficulty, v.highestDifficulty),
    };
  }

  const modeBests = { ...cloud.modeBests };
  for (const [k, v] of Object.entries(local.modeBests)) {
    const prev = modeBests[k];
    if (!prev) {
      modeBests[k] = v;
      continue;
    }
    modeBests[k] = {
      highestScore: maxNum(prev.highestScore, v.highestScore),
      highestFloor: maxNum(prev.highestFloor, v.highestFloor),
    };
  }

  const now = Date.now();
  const merged: PersistedGameData = {
    schemaVersion: Math.max(local.schemaVersion, cloud.schemaVersion),
    profile,
    lifetime,
    personalBests,
    milestones: unionStrings(local.milestones, cloud.milestones),
    settings,
    daily,
    meta: mergeMeta(local.meta, cloud.meta),
    runHistory: mergeRuns(local.runHistory, cloud.runHistory),
    weeklyHistory: mergeWeekly(local.weeklyHistory, cloud.weeklyHistory),
    modeBests,
    familyStats,
    seenFamilyIntros: unionStrings(
      local.seenFamilyIntros,
      cloud.seenFamilyIntros
    ),
    sync: {
      ...createDefaultSyncState(now),
      revision: maxNum(localRev, cloudRev),
      updatedAt: now,
      deviceId: local.sync?.deviceId ?? cloud.sync?.deviceId,
      lastCloudRevision: maxNum(
        local.sync?.lastCloudRevision ?? 0,
        cloud.sync?.lastCloudRevision ?? 0
      ),
      lastSuccessfulSync: null,
      pendingChanges: true,
    },
  };

  void other;
  void opts;

  return {
    merged,
    conflicts,
    strategyUsed,
    needsPlayerChoice:
      conflicts.some((c) => c.field === "playerLevel") &&
      !(opts?.preferLocalOnAmbiguity === true),
  };
}

export function emptyCloudAsPersisted(): PersistedGameData {
  return createDefaultPersistedData();
}
