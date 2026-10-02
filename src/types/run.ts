import type { PuzzleType } from "@/types/puzzles";

export type RunMode =
  | "standard"
  | "daily"
  | "challenge"
  | "weekly"
  | "seeded";

export type DifficultyTier = "standard" | "advanced" | "expert" | "master";

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

export type UpgradeRarityV4 = "common" | "rare" | "epic" | "legendary";

export interface ModifierEffect {
  scoreMultiplier?: number;
  xpMultiplier?: number;
  timerMultiplier?: number;
  startingLivesDelta?: number;
  maxLivesDelta?: number;
  mistakeLifeCost?: number;
  upgradeEveryN?: number;
  specialEveryN?: number;
  eliteEveryN?: number;
  bossEveryN?: number;
  startingDifficultyDelta?: number;
  categoryWeightBoost?: Partial<Record<PuzzleType, number>>;
  forceCategoryShare?: { category: PuzzleType; share: number };
  speedTrialBias?: number;
  streakOnMissKeep?: number; // 0–1 fraction kept
  eliteChanceBonus?: number;
}

export interface RunModifierDef {
  id: string;
  name: string;
  description: string;
  effects: ModifierEffect;
}

export type ChallengeObjective =
  | { type: "reach-floor"; value: number }
  | { type: "score"; value: number }
  | { type: "accuracy"; value: number }
  | { type: "bosses-defeated"; value: number }
  | { type: "elite-cleared"; value: number };

export interface ChallengeDefinition {
  id: string;
  name: string;
  description: string;
  rules: string[];
  modifierIds: string[];
  rewardMultiplier: number;
  unlockPlayerLevel: number;
  objectives?: ChallengeObjective[];
  specialistPick?: boolean;
}

export interface DifficultyTierDef {
  id: DifficultyTier;
  name: string;
  description: string;
  unlockPlayerLevel: number;
  effects: ModifierEffect;
}

export interface RunConfig {
  mode: RunMode;
  challengeId?: string;
  difficultyTier: DifficultyTier;
  seed: string;
  specialistCategory?: PuzzleType;
  weeklyId?: string;
}

export interface RunHistoryEntry {
  /** Stable id for idempotent cloud sync (v0.6+) */
  id: string;
  timestamp: number;
  mode: RunMode;
  seed?: string;
  score: number;
  floorReached: number;
  accuracy: number;
  bestStreak?: number;
  archetype?: string;
  challengeId?: string;
  difficultyTier: DifficultyTier;
  weeklyId?: string;
}

export interface WeeklyRecord {
  weekId: string;
  attempts: number;
  bestScore: number;
  highestFloor: number;
  bestAccuracy: number;
  completed: boolean;
}

export interface MetaProgression {
  unlockedChallengeIds: string[];
  unlockedModifierIds: string[];
  unlockedBossIds: string[];
  unlockedUpgradeIds: string[];
  difficultyTiersUnlocked: DifficultyTier[];
  completedChallenges: Record<string, number>;
  pendingUnlockNotices: string[];
}

export interface ModePersonalBest {
  highestScore: number;
  highestFloor: number;
}

export type EliteType =
  | "rapid-fire"
  | "perfect-recall"
  | "logic-chain"
  | "spatial-shift"
  | "mixed-trial";

export type SpecialFloorV4 =
  | "double-score"
  | "perfect-mind"
  | "speed-trial"
  | "memory-trial"
  | "upgrade-forge"
  | "recovery"
  | "gamble"
  | "category-trial"
  | "mystery";

export interface FloorConfiguration {
  floor: number;
  type: "normal" | "upgrade" | "special" | "elite" | "boss" | "choice";
  specialType?: SpecialFloorV4;
  eliteType?: EliteType;
  bossId?: string;
  rewardMultiplier: number;
  announcement?: string;
}
