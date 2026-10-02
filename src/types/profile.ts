import type { PuzzleType } from "./puzzles";
import { emptyCategoryRecord } from "./categories";

export const PROFILE_SCHEMA_VERSION = 6;

export interface PerformanceSample {
  correct: boolean;
  difficulty: number;
  responseTimeMs: number;
  timestamp: number;
}

export interface CategoryProfile {
  rating: number;
  masteryXP: number;
  masteryLevel: number;
  confidence: number;
  puzzlesAttempted: number;
  puzzlesCorrect: number;
  rollingAccuracy: number;
  rollingResponseTimeMs: number;
  highestDifficulty: number;
  recentPerformance: PerformanceSample[];
  lastPlayedAt?: number;
}

export interface BrainProfile {
  version: number;
  playerLevel: number;
  currentXP: number;
  lifetimeXP: number;
  categories: Record<PuzzleType, CategoryProfile>;
  totalRuns: number;
  totalPuzzles: number;
  dailyTrainingsCompleted: number;
  unlockedVariants: string[];
  createdAt: number;
  updatedAt: number;
}

export interface PersonalBests {
  highestScore: number;
  highestFloor: number;
  bestStreak: number;
  mostCorrectInRun: number;
  fastestCorrectMs: number | null;
  bestDifficulty: Record<PuzzleType, number>;
}

export interface GameSettings {
  sound: boolean;
  haptics: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
}

export interface DailyProgress {
  dateKey: string;
  completed: boolean;
  correct: number;
  total: number;
}

export interface SyncState {
  revision: number;
  updatedAt: number;
  deviceId?: string;
  lastCloudRevision: number;
  lastSuccessfulSync: number | null;
  pendingChanges: boolean;
}

export interface PersistedGameData {
  schemaVersion: number;
  profile: BrainProfile;
  lifetime: import("./game").LifetimeStats;
  personalBests: PersonalBests;
  milestones: string[];
  settings: GameSettings;
  daily: DailyProgress | null;
  meta: import("./run").MetaProgression;
  runHistory: import("./run").RunHistoryEntry[];
  weeklyHistory: import("./run").WeeklyRecord[];
  modeBests: Record<string, import("./run").ModePersonalBest>;
  /** v0.5 — bounded family performance summaries */
  familyStats: Record<
    string,
    { attempts: number; correct: number; totalResponseMs: number; highestDifficulty: number }
  >;
  seenFamilyIntros: string[];
  /** v0.6 — cloud sync metadata (local) */
  sync: SyncState;
}

export function createDefaultSyncState(now = Date.now()): SyncState {
  return {
    revision: 0,
    updatedAt: now,
    lastCloudRevision: 0,
    lastSuccessfulSync: null,
    pendingChanges: false,
  };
}

export const DEFAULT_RATING = 40;
export const MIN_RATING = 1;
export const MAX_RATING = 100;

export function createCategoryProfile(
  overrides: Partial<CategoryProfile> = {}
): CategoryProfile {
  return {
    rating: DEFAULT_RATING,
    masteryXP: 0,
    masteryLevel: 1,
    confidence: 0,
    puzzlesAttempted: 0,
    puzzlesCorrect: 0,
    rollingAccuracy: 0,
    rollingResponseTimeMs: 0,
    highestDifficulty: 1,
    recentPerformance: [],
    ...overrides,
  };
}

export function createBrainProfile(now = Date.now()): BrainProfile {
  return {
    version: PROFILE_SCHEMA_VERSION,
    playerLevel: 1,
    currentXP: 0,
    lifetimeXP: 0,
    categories: emptyCategoryRecord(() => createCategoryProfile()),
    totalRuns: 0,
    totalPuzzles: 0,
    dailyTrainingsCompleted: 0,
    unlockedVariants: [
      "sequence",
      "odd",
      "arithmetic",
      "pattern-sequence",
      "rotation",
      "memory-math",
    ],
    createdAt: now,
    updatedAt: now,
  };
}

export function createPersonalBests(): PersonalBests {
  return {
    highestScore: 0,
    highestFloor: 0,
    bestStreak: 0,
    mostCorrectInRun: 0,
    fastestCorrectMs: null,
    bestDifficulty: emptyCategoryRecord(() => 1),
  };
}

export function createDefaultSettings(): GameSettings {
  return {
    sound: true,
    haptics: true,
    reducedMotion: false,
    highContrast: false,
  };
}
