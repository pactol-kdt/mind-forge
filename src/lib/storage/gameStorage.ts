import type { LifetimeStats } from "@/types/game";
import { DEFAULT_STATS, createEmptyLifetimeCategoryStat } from "@/types/game";
import type {
  BrainProfile,
  DailyProgress,
  GameSettings,
  PersistedGameData,
  PersonalBests,
  SyncState,
} from "@/types/profile";
import {
  PROFILE_SCHEMA_VERSION,
  createBrainProfile,
  createDefaultSettings,
  createPersonalBests,
  createCategoryProfile,
  createDefaultSyncState,
} from "@/types/profile";
import { ALL_PUZZLE_TYPES } from "@/types/puzzles";
import { emptyCategoryRecord } from "@/types/categories";
import { syncUnlocks } from "@/lib/game/progression";
import { createDefaultMeta } from "@/lib/progression/unlocks";
import type {
  MetaProgression,
  ModePersonalBest,
  RunHistoryEntry,
  WeeklyRecord,
} from "@/types/run";
import { getOrCreateDeviceId } from "@/lib/storage/deviceId";
import { ensureRunId } from "@/lib/sync/runIds";

const STORAGE_KEY = "mindforge:data:v6";
const LEGACY_V5 = "mindforge:data:v5";
const LEGACY_V4 = "mindforge:data:v4";
const LEGACY_V3 = "mindforge:data:v3";
const LEGACY_V2 = "mindforge:stats:v2";
const LEGACY_V1 = "mindforge:stats:v1";
const LEGACY_MUTE = "mindforge:mute:v1";

const RUN_HISTORY_LIMIT = 40;
const WEEKLY_HISTORY_LIMIT = 16;

let cachedRaw: string | null | undefined;
let cachedData: PersistedGameData | null = null;

const SERVER_DEFAULT_DATA: PersistedGameData = {
  schemaVersion: PROFILE_SCHEMA_VERSION,
  profile: createBrainProfile(0),
  lifetime: {
    ...DEFAULT_STATS,
    categoryStats: emptyCategoryRecord(createEmptyLifetimeCategoryStat),
  },
  personalBests: createPersonalBests(),
  milestones: [],
  settings: createDefaultSettings(),
  daily: null,
  meta: createDefaultMeta(),
  runHistory: [],
  weeklyHistory: [],
  modeBests: {},
  familyStats: {},
  seenFamilyIntros: [],
  sync: createDefaultSyncState(0),
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function emptyLifetimeCategories(): LifetimeStats["categoryStats"] {
  return emptyCategoryRecord(createEmptyLifetimeCategoryStat);
}

function parseLifetimePartial(raw: unknown): LifetimeStats {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_STATS, categoryStats: emptyLifetimeCategories() };
  }
  const parsed = raw as Partial<LifetimeStats> & {
    highestScore?: number;
    totalGamesPlayed?: number;
  };
  const gamesPlayed =
    typeof parsed.gamesPlayed === "number"
      ? parsed.gamesPlayed
      : typeof parsed.totalGamesPlayed === "number"
        ? parsed.totalGamesPlayed
        : 0;
  const bestScore =
    typeof parsed.bestScore === "number"
      ? parsed.bestScore
      : typeof parsed.highestScore === "number"
        ? parsed.highestScore
        : 0;

  const categoryStats = emptyLifetimeCategories();
  if (parsed.categoryStats) {
    for (const type of ALL_PUZZLE_TYPES) {
      const src = parsed.categoryStats[type];
      if (!src) continue;
      categoryStats[type] = {
        attempted: src.attempted ?? 0,
        correct: src.correct ?? 0,
        totalResponseMs: src.totalResponseMs ?? 0,
        highestDifficulty: src.highestDifficulty ?? 1,
        scoreContribution: src.scoreContribution ?? 0,
      };
    }
  }

  return {
    gamesPlayed,
    totalPuzzlesSolved:
      typeof parsed.totalPuzzlesSolved === "number"
        ? parsed.totalPuzzlesSolved
        : 0,
    bestScore,
    highestFloor:
      typeof parsed.highestFloor === "number" ? parsed.highestFloor : 0,
    bestStreak: typeof parsed.bestStreak === "number" ? parsed.bestStreak : 0,
    categoryStats,
  };
}

function migrateLifetimeToProfile(lifetime: LifetimeStats): BrainProfile {
  const profile = createBrainProfile();
  profile.totalRuns = lifetime.gamesPlayed;
  profile.totalPuzzles = lifetime.totalPuzzlesSolved;
  for (const type of ALL_PUZZLE_TYPES) {
    const src = lifetime.categoryStats[type];
    if (!src || src.attempted === 0) continue;
    const accuracy = src.correct / Math.max(1, src.attempted);
    const rating = Math.round(30 + accuracy * 40 + src.highestDifficulty * 1.5);
    profile.categories[type] = createCategoryProfile({
      rating: Math.min(100, Math.max(1, rating)),
      puzzlesAttempted: src.attempted,
      puzzlesCorrect: src.correct,
      rollingAccuracy: accuracy,
      rollingResponseTimeMs:
        src.attempted > 0
          ? Math.round(src.totalResponseMs / src.attempted)
          : 0,
      highestDifficulty: src.highestDifficulty,
      confidence: Math.min(1, src.attempted / 30),
      masteryXP: src.correct * 3,
      masteryLevel: Math.max(1, Math.floor(src.correct / 25) + 1),
    });
  }
  return syncUnlocks(profile);
}

function parseMeta(raw: unknown): MetaProgression {
  const base = createDefaultMeta();
  if (!raw || typeof raw !== "object") return base;
  const m = raw as Partial<MetaProgression>;
  return {
    unlockedChallengeIds: Array.isArray(m.unlockedChallengeIds)
      ? m.unlockedChallengeIds
      : base.unlockedChallengeIds,
    unlockedModifierIds: Array.isArray(m.unlockedModifierIds)
      ? m.unlockedModifierIds
      : [],
    unlockedBossIds: Array.isArray(m.unlockedBossIds)
      ? m.unlockedBossIds
      : base.unlockedBossIds,
    unlockedUpgradeIds: Array.isArray(m.unlockedUpgradeIds)
      ? m.unlockedUpgradeIds
      : [],
    difficultyTiersUnlocked: Array.isArray(m.difficultyTiersUnlocked)
      ? m.difficultyTiersUnlocked
      : base.difficultyTiersUnlocked,
    completedChallenges:
      m.completedChallenges && typeof m.completedChallenges === "object"
        ? m.completedChallenges
        : {},
    pendingUnlockNotices: Array.isArray(m.pendingUnlockNotices)
      ? m.pendingUnlockNotices
      : [],
  };
}

export function createDefaultPersistedData(): PersistedGameData {
  const now = Date.now();
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    profile: createBrainProfile(),
    lifetime: { ...DEFAULT_STATS, categoryStats: emptyLifetimeCategories() },
    personalBests: createPersonalBests(),
    milestones: [],
    settings: createDefaultSettings(),
    daily: null,
    meta: createDefaultMeta(),
    runHistory: [],
    weeklyHistory: [],
    modeBests: {},
    familyStats: {},
    seenFamilyIntros: [],
    sync: createDefaultSyncState(now),
  };
}

function parseSync(raw: unknown, now = Date.now()): SyncState {
  const base = createDefaultSyncState(now);
  if (!raw || typeof raw !== "object") return base;
  const s = raw as Partial<SyncState>;
  return {
    revision: typeof s.revision === "number" ? s.revision : 0,
    updatedAt: typeof s.updatedAt === "number" ? s.updatedAt : now,
    deviceId: typeof s.deviceId === "string" ? s.deviceId : undefined,
    lastCloudRevision:
      typeof s.lastCloudRevision === "number" ? s.lastCloudRevision : 0,
    lastSuccessfulSync:
      typeof s.lastSuccessfulSync === "number" ? s.lastSuccessfulSync : null,
    pendingChanges: Boolean(s.pendingChanges),
  };
}

function normalizeData(data: Partial<PersistedGameData>): PersistedGameData {
  const base = createDefaultPersistedData();
  const lifetime = parseLifetimePartial(data.lifetime ?? base.lifetime);
  let profile = data.profile
    ? {
        ...createBrainProfile(),
        ...data.profile,
        categories: {
          ...createBrainProfile().categories,
          ...data.profile.categories,
        },
      }
    : migrateLifetimeToProfile(lifetime);

  for (const type of ALL_PUZZLE_TYPES) {
    if (!profile.categories[type]) {
      profile.categories[type] = createCategoryProfile();
    }
  }
  profile = syncUnlocks(profile);

  const personalBests: PersonalBests = {
    ...createPersonalBests(),
    ...data.personalBests,
    bestDifficulty: {
      ...createPersonalBests().bestDifficulty,
      ...(data.personalBests?.bestDifficulty ?? {}),
    },
  };

  const settings: GameSettings = {
    ...createDefaultSettings(),
    ...data.settings,
  };

  const runHistory = Array.isArray(data.runHistory)
    ? data.runHistory.map((e) => ensureRunId(e)).slice(0, RUN_HISTORY_LIMIT)
    : [];
  const weeklyHistory = Array.isArray(data.weeklyHistory)
    ? data.weeklyHistory.slice(0, WEEKLY_HISTORY_LIMIT)
    : [];
  const modeBests =
    data.modeBests && typeof data.modeBests === "object" ? data.modeBests : {};
  const familyStats =
    data.familyStats && typeof data.familyStats === "object"
      ? data.familyStats
      : {};
  const seenFamilyIntros = Array.isArray(data.seenFamilyIntros)
    ? data.seenFamilyIntros
    : [];

  const sync = parseSync(data.sync);
  if (typeof window !== "undefined" && !sync.deviceId) {
    sync.deviceId = getOrCreateDeviceId();
  }

  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    profile,
    lifetime,
    personalBests,
    milestones: Array.isArray(data.milestones) ? data.milestones : [],
    settings,
    daily: (data.daily as DailyProgress | null) ?? null,
    meta: parseMeta(data.meta),
    runHistory,
    weeklyHistory,
    modeBests: modeBests as Record<string, ModePersonalBest>,
    familyStats,
    seenFamilyIntros,
    sync,
  };
}

function migrateFromV5(): PersistedGameData | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(LEGACY_V5);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedGameData>;
    return normalizeData({
      ...parsed,
      schemaVersion: PROFILE_SCHEMA_VERSION,
      sync: createDefaultSyncState(Date.now()),
    });
  } catch {
    return null;
  }
}

function migrateFromV4(): PersistedGameData | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(LEGACY_V4);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedGameData>;
    return normalizeData({
      ...parsed,
      schemaVersion: PROFILE_SCHEMA_VERSION,
      familyStats: {},
      seenFamilyIntros: [],
      sync: createDefaultSyncState(Date.now()),
    });
  } catch {
    return null;
  }
}

function migrateFromV3(): PersistedGameData | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(LEGACY_V3);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedGameData>;
    const data = normalizeData({
      ...parsed,
      schemaVersion: PROFILE_SCHEMA_VERSION,
      meta: createDefaultMeta(),
      runHistory: [],
      weeklyHistory: [],
      modeBests: {},
      familyStats: {},
      seenFamilyIntros: [],
      sync: createDefaultSyncState(Date.now()),
    });
    return data;
  } catch {
    return null;
  }
}

function migrateFromLegacy(): PersistedGameData | null {
  if (!isBrowser()) return null;
  const v2 = localStorage.getItem(LEGACY_V2) ?? localStorage.getItem(LEGACY_V1);
  if (!v2) return null;
  try {
    const lifetime = parseLifetimePartial(JSON.parse(v2));
    const data = createDefaultPersistedData();
    data.lifetime = lifetime;
    data.profile = migrateLifetimeToProfile(lifetime);
    data.personalBests.highestScore = lifetime.bestScore;
    data.personalBests.highestFloor = lifetime.highestFloor;
    data.personalBests.bestStreak = lifetime.bestStreak;
    const muted = localStorage.getItem(LEGACY_MUTE) === "1";
    data.settings.sound = !muted;
    return data;
  } catch {
    return null;
  }
}

export function loadGameData(): PersistedGameData {
  if (!isBrowser()) return SERVER_DEFAULT_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fromV5 = migrateFromV5();
      if (fromV5) {
        saveGameData(fromV5);
        return loadGameData();
      }
      const fromV4 = migrateFromV4();
      if (fromV4) {
        saveGameData(fromV4);
        return loadGameData();
      }
      const fromV3 = migrateFromV3();
      if (fromV3) {
        saveGameData(fromV3);
        return loadGameData();
      }
      const migrated = migrateFromLegacy();
      if (migrated) {
        saveGameData(migrated);
        return loadGameData();
      }
      if (cachedRaw === null && cachedData) return cachedData;
      const empty = createDefaultPersistedData();
      cachedRaw = null;
      cachedData = empty;
      return empty;
    }
    if (raw === cachedRaw && cachedData) return cachedData;
    const parsed = JSON.parse(raw) as Partial<PersistedGameData>;
    const normalized = normalizeData(parsed);
    cachedRaw = raw;
    cachedData = normalized;
    return normalized;
  } catch {
    if (cachedData) return cachedData;
    const empty = createDefaultPersistedData();
    cachedRaw = null;
    cachedData = empty;
    return empty;
  }
}

export function getGameDataSnapshot(): PersistedGameData {
  return loadGameData();
}

export function getServerGameDataSnapshot(): PersistedGameData {
  return SERVER_DEFAULT_DATA;
}

export function subscribeGameData(onChange: () => void): () => void {
  const handler = () => {
    cachedRaw = undefined;
    cachedData = null;
    onChange();
  };
  window.addEventListener("storage", handler);
  window.addEventListener("mindforge:data", handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("mindforge:data", handler);
  };
}

export function saveGameData(data: PersistedGameData): void {
  if (!isBrowser()) return;
  const normalized = normalizeData(data);
  const raw = JSON.stringify(normalized);
  localStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedData = normalized;
  window.dispatchEvent(new Event("mindforge:data"));
}

export function appendRunHistory(
  entry: Omit<RunHistoryEntry, "id"> & { id?: string },
  data?: PersistedGameData
): PersistedGameData {
  const current = data ?? loadGameData();
  const withId = ensureRunId(entry);
  const runHistory = [withId, ...current.runHistory].slice(0, RUN_HISTORY_LIMIT);
  const next = { ...current, runHistory };
  saveGameData(next);
  return next;
}

export function upsertModeBest(
  key: string,
  score: number,
  floor: number,
  data?: PersistedGameData
): PersistedGameData {
  const current = data ?? loadGameData();
  const prev = current.modeBests[key] ?? { highestScore: 0, highestFloor: 0 };
  const modeBests = {
    ...current.modeBests,
    [key]: {
      highestScore: Math.max(prev.highestScore, score),
      highestFloor: Math.max(prev.highestFloor, floor),
    },
  };
  const next = { ...current, modeBests };
  saveGameData(next);
  return next;
}

export function upsertWeeklyHistory(
  record: WeeklyRecord,
  data?: PersistedGameData
): PersistedGameData {
  const current = data ?? loadGameData();
  const filtered = current.weeklyHistory.filter((w) => w.weekId !== record.weekId);
  const weeklyHistory = [record, ...filtered].slice(0, WEEKLY_HISTORY_LIMIT);
  const next = { ...current, weeklyHistory };
  saveGameData(next);
  return next;
}

export function loadProfile(): BrainProfile {
  return loadGameData().profile;
}

export function saveProfile(profile: BrainProfile): void {
  const data = loadGameData();
  saveGameData({ ...data, profile: syncUnlocks(profile) });
}

export function loadSettings(): GameSettings {
  return loadGameData().settings;
}

export function saveSettings(settings: GameSettings): void {
  const data = loadGameData();
  saveGameData({ ...data, settings });
  if (typeof window !== "undefined") {
    void import("@/stores/syncStore").then(({ notifyProgressSaved }) => {
      notifyProgressSaved();
    });
  }
}

export function loadStats(): LifetimeStats {
  return loadGameData().lifetime;
}

export function getStatsSnapshot(): LifetimeStats {
  return loadStats();
}

export function getServerStatsSnapshot(): LifetimeStats {
  return SERVER_DEFAULT_DATA.lifetime;
}

export function subscribeStats(onChange: () => void): () => void {
  return subscribeGameData(onChange);
}

export function saveStats(stats: LifetimeStats): void {
  const data = loadGameData();
  saveGameData({ ...data, lifetime: stats });
}

export function updateStatsAfterRun(result: {
  score: number;
  floor: number;
  bestStreak: number;
  correctAnswers: number;
  categoryStats: Record<
    string,
    {
      attempted: number;
      correct: number;
      totalResponseMs: number;
      highestDifficulty: number;
      scoreContribution: number;
    }
  >;
}): LifetimeStats {
  const data = loadGameData();
  const current = data.lifetime;
  const categoryStats = emptyLifetimeCategories();
  for (const type of ALL_PUZZLE_TYPES) {
    const src = result.categoryStats[type] ?? createEmptyLifetimeCategoryStat();
    const dst = current.categoryStats[type] ?? createEmptyLifetimeCategoryStat();
    categoryStats[type] = {
      attempted: dst.attempted + src.attempted,
      correct: dst.correct + src.correct,
      totalResponseMs: dst.totalResponseMs + src.totalResponseMs,
      highestDifficulty: Math.max(
        dst.highestDifficulty,
        src.highestDifficulty
      ),
      scoreContribution: dst.scoreContribution + src.scoreContribution,
    };
  }
  const lifetime: LifetimeStats = {
    gamesPlayed: current.gamesPlayed + 1,
    totalPuzzlesSolved: current.totalPuzzlesSolved + result.correctAnswers,
    bestScore: Math.max(current.bestScore, result.score),
    highestFloor: Math.max(current.highestFloor, result.floor),
    bestStreak: Math.max(current.bestStreak, result.bestStreak),
    categoryStats,
  };
  saveGameData({ ...data, lifetime });
  return lifetime;
}

export function resetAllProgress(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_V5);
  localStorage.removeItem(LEGACY_V4);
  localStorage.removeItem(LEGACY_V3);
  cachedRaw = undefined;
  cachedData = null;
  window.dispatchEvent(new Event("mindforge:data"));
}

export function loadMuted(): boolean {
  return !loadSettings().sound;
}

export function saveMuted(muted: boolean): void {
  const settings = loadSettings();
  saveSettings({ ...settings, sound: !muted });
}

export const STORAGE_LIMITS = {
  RUN_HISTORY_LIMIT,
  WEEKLY_HISTORY_LIMIT,
};

export {
  migrateLifetimeToProfile,
  normalizeData,
  parseLifetimePartial,
  migrateFromV3,
  migrateFromV4,
  migrateFromV5,
};
export { ensureRunId } from "@/lib/sync/runIds";
