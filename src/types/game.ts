import type { PuzzleType, MemorySymbol } from "./puzzles";
import { emptyCategoryRecord } from "./categories";

export type GameStatus =
  | "idle"
  | "playing"
  | "feedback"
  | "upgrade"
  | "announce"
  | "game-over"
  | "daily";

export type FloorType =
  | "normal"
  | "upgrade"
  | "special"
  | "elite"
  | "boss"
  | "choice";

export type SpecialModifier =
  | "double-score"
  | "perfect-mind"
  | "speed-trial"
  | "memory-trial"
  | "upgrade-forge"
  | "recovery"
  | "gamble"
  | "category-trial"
  | "mystery";

export type UpgradeRarity = "common" | "rare" | "epic" | "legendary";

export type UpgradeTag =
  | "memory"
  | "attention"
  | "math"
  | "logic"
  | "spatial"
  | "score"
  | "streak"
  | "survival"
  | "speed"
  | "risk"
  | "balanced";

export type UpgradeEffect =
  | { kind: "time_bonus"; pct: number }
  | { kind: "second_chance" }
  | { kind: "memory_display"; ms: number }
  | { kind: "category_score"; category: PuzzleType; pct: number }
  | { kind: "streak_bonus"; pct: number }
  | { kind: "life_every_n_floors"; n: number }
  | { kind: "momentum"; every: number; bonusPct: number }
  | { kind: "high_risk"; difficultyDelta: number; scorePct: number }
  | { kind: "calm_mind"; reliefPct: number }
  | { kind: "logic_spatial_time"; pct: number }
  | { kind: "balanced_mind"; bonusPct: number }
  | { kind: "specialist" }
  | { kind: "xp_bonus"; pct: number }
  | { kind: "precision_speed"; windowPct: number; bonusPct: number; cap: number }
  | { kind: "glass_mind"; scorePct: number; maxLivesDelta: number }
  | { kind: "steady_hand"; keepFraction: number }
  | { kind: "diversity"; bonusPct: number }
  | { kind: "phoenix" }
  | { kind: "perfect_memory"; displayMs: number; scorePct: number }
  | { kind: "adaptive_focus"; bonusPct: number };

export interface UpgradeLevelDefinition {
  level: number;
  description: string;
  effect: UpgradeEffect;
}

export interface GameUpgrade {
  id: string;
  name: string;
  description: string;
  rarity: UpgradeRarity;
  effect: UpgradeEffect;
  tags: UpgradeTag[];
  levels: UpgradeLevelDefinition[];
  maxLevel: number;
  unlockRequired?: boolean;
}

export interface ActiveUpgrade {
  upgradeId: string;
  level: number;
  charges?: number;
  specialistCategory?: PuzzleType;
  consumed?: boolean;
}

export interface CategoryStat {
  attempted: number;
  correct: number;
  totalResponseMs: number;
  highestDifficulty: number;
  scoreContribution: number;
  recentResults: boolean[];
}

export type CategoryDifficultyMap = Record<PuzzleType, number>;

export interface PuzzleAttempt {
  puzzleType: PuzzleType;
  category: PuzzleType;
  variant: string;
  difficulty: number;
  correct: boolean;
  responseTimeMs: number;
  scoreEarned: number;
  floor: number;
  timestamp: number;
}

export interface GameRun {
  floor: number;
  score: number;
  lives: number;
  maxLives: number;
  streak: number;
  bestStreak: number;
  correctAnswers: number;
  totalAnswers: number;
  puzzlesCompleted: number;
  status: GameStatus;
  upgrades: ActiveUpgrade[];
  categoryDifficulty: CategoryDifficultyMap;
  categoryStats: Record<PuzzleType, CategoryStat>;
  attempts: PuzzleAttempt[];
  floorType: FloorType;
  specialModifier: SpecialModifier | null;
  pendingUpgradeChoices: GameUpgrade[];
  announcement: string | null;
  perfectMindArmed: boolean;
  secondChanceUsedThisAnswer: boolean;
  mode: "run" | "daily";
  recentCategories: PuzzleType[];
  xpEarned: number;
  pendingLevelUps: number[];
  pendingMilestones: string[];
  ratingDeltas: Partial<Record<PuzzleType, { from: number; to: number }>>;
  masteryLevelUps: Partial<Record<PuzzleType, { from: number; to: number }>>;
  newPersonalBests: string[];
  /** v0.4 */
  seed: string;
  challengeId?: string;
  difficultyTier: import("./run").DifficultyTier;
  runMode: import("./run").RunMode;
  weeklyId?: string;
  specialistCategory?: PuzzleType;
  scoreMultiplier: number;
  xpMultiplier: number;
  timerMultiplier: number;
  mistakeLifeCost: number;
  upgradeRerolls: number;
  bossesDefeated: number;
  elitesCleared: number;
  bossId?: string;
  bossStageIndex: number;
  /** Archivist: sequence memorized in stage 1, recalled in stage 3 */
  bossMemory?: {
    sequence: MemorySymbol[];
    symbolPool: MemorySymbol[];
  };
  eliteType?: import("./run").EliteType;
  choiceCategory?: PuzzleType;
  gambleRisk?: boolean;
  archetype?: string;
  pendingUnlocks: string[];
  objectiveComplete?: boolean;
  recentFamilies: string[];
}

export interface CategoryLifetimeStats {
  attempted: number;
  correct: number;
  totalResponseMs: number;
  highestDifficulty: number;
  scoreContribution: number;
}

export interface LifetimeStats {
  gamesPlayed: number;
  totalPuzzlesSolved: number;
  bestScore: number;
  highestFloor: number;
  bestStreak: number;
  categoryStats: Record<PuzzleType, CategoryLifetimeStats>;
}

export type GameStats = LifetimeStats;

/** Decided at submit time so last-stage clears cannot re-announce. */
export type BossAdvance = "continue" | "retry" | "clear";

export interface FeedbackState {
  correct: boolean;
  pointsEarned: number;
  correctAnswerDisplay?: string;
  streak: number;
  secondChanceSaved?: boolean;
  xpGained?: number;
  /** Boss-only: which transition to take after feedback. */
  bossAdvance?: BossAdvance;
}

export type PuzzlePhase =
  | "presenting"
  | "distraction"
  | "answering"
  | "feedback";

export const INITIAL_LIVES = 3;
export const MAX_LIVES = 5;
export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 20;

export function createEmptyCategoryStat(): CategoryStat {
  return {
    attempted: 0,
    correct: 0,
    totalResponseMs: 0,
    highestDifficulty: 1,
    scoreContribution: 0,
    recentResults: [],
  };
}

export function createEmptyCategoryStats(): Record<PuzzleType, CategoryStat> {
  return emptyCategoryRecord(createEmptyCategoryStat);
}

export function createEmptyLifetimeCategoryStat(): CategoryLifetimeStats {
  return {
    attempted: 0,
    correct: 0,
    totalResponseMs: 0,
    highestDifficulty: 1,
    scoreContribution: 0,
  };
}

export function createInitialCategoryDifficulty(
  seed: Partial<CategoryDifficultyMap> = {}
): CategoryDifficultyMap {
  return {
    memory: seed.memory ?? 1,
    attention: seed.attention ?? 1,
    math: seed.math ?? 1,
    logic: seed.logic ?? 1,
    spatial: seed.spatial ?? 1,
    combined: seed.combined ?? 1,
  };
}

export function createInitialRun(
  overrides: Partial<GameRun> = {}
): GameRun {
  return {
    floor: 1,
    score: 0,
    lives: INITIAL_LIVES,
    maxLives: INITIAL_LIVES,
    streak: 0,
    bestStreak: 0,
    correctAnswers: 0,
    totalAnswers: 0,
    puzzlesCompleted: 0,
    status: "idle",
    upgrades: [],
    categoryDifficulty: createInitialCategoryDifficulty(),
    categoryStats: createEmptyCategoryStats(),
    attempts: [],
    floorType: "normal",
    specialModifier: null,
    pendingUpgradeChoices: [],
    announcement: null,
    perfectMindArmed: false,
    secondChanceUsedThisAnswer: false,
    mode: "run",
    recentCategories: [],
    xpEarned: 0,
    pendingLevelUps: [],
    pendingMilestones: [],
    ratingDeltas: {},
    masteryLevelUps: {},
    newPersonalBests: [],
    seed: "MINDFORGE-DEFAULT",
    difficultyTier: "standard",
    runMode: "standard",
    scoreMultiplier: 1,
    xpMultiplier: 1,
    timerMultiplier: 1,
    mistakeLifeCost: 1,
    upgradeRerolls: 1,
    bossesDefeated: 0,
    elitesCleared: 0,
    bossStageIndex: 0,
    pendingUnlocks: [],
    recentFamilies: [],
    ...overrides,
  };
}

export const DEFAULT_STATS: LifetimeStats = {
  gamesPlayed: 0,
  totalPuzzlesSolved: 0,
  bestScore: 0,
  highestFloor: 0,
  bestStreak: 0,
  categoryStats: emptyCategoryRecord(createEmptyLifetimeCategoryStat),
};
