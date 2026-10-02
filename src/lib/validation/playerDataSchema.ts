import { z } from "zod";
import { ALL_PUZZLE_TYPES } from "@/types/puzzles";
import type { CloudPlayerData } from "@/lib/sync/syncTypes";
import {
  CLOUD_SCHEMA_VERSION,
  EXPORT_VERSION,
  MAX_IMPORT_BYTES,
  PERFORMANCE_SAMPLE_LIMIT,
  RUN_HISTORY_CLOUD_LIMIT,
  WEEKLY_HISTORY_CLOUD_LIMIT,
} from "@/lib/sync/syncTypes";

const puzzleTypeSchema = z.enum(
  ALL_PUZZLE_TYPES as unknown as [string, ...string[]]
);

const performanceSampleSchema = z.object({
  correct: z.boolean(),
  difficulty: z.number().min(1).max(30),
  responseTimeMs: z.number().min(0).max(600_000),
  timestamp: z.number().min(0),
});

const categoryProfileSchema = z.object({
  rating: z.number().min(1).max(100),
  masteryXP: z.number().min(0).max(10_000_000),
  masteryLevel: z.number().min(1).max(100),
  confidence: z.number().min(0).max(1),
  puzzlesAttempted: z.number().min(0).max(10_000_000),
  puzzlesCorrect: z.number().min(0).max(10_000_000),
  rollingAccuracy: z.number().min(0).max(1),
  rollingResponseTimeMs: z.number().min(0).max(600_000),
  highestDifficulty: z.number().min(1).max(30),
  recentPerformance: z
    .array(performanceSampleSchema)
    .max(PERFORMANCE_SAMPLE_LIMIT)
    .default([]),
  lastPlayedAt: z.number().min(0).optional(),
});

const brainProfileSchema = z.object({
  version: z.number().int().min(1).max(20),
  playerLevel: z.number().int().min(1).max(10_000),
  currentXP: z.number().min(0).max(100_000_000),
  lifetimeXP: z.number().min(0).max(100_000_000),
  categories: z.record(puzzleTypeSchema, categoryProfileSchema),
  totalRuns: z.number().min(0).max(10_000_000),
  totalPuzzles: z.number().min(0).max(100_000_000),
  dailyTrainingsCompleted: z.number().min(0).max(10_000_000),
  unlockedVariants: z.array(z.string().max(64)).max(200),
  createdAt: z.number().min(0),
  updatedAt: z.number().min(0),
});

const lifetimeCategorySchema = z.object({
  attempted: z.number().min(0).max(10_000_000),
  correct: z.number().min(0).max(10_000_000),
  totalResponseMs: z.number().min(0).max(1e15),
  highestDifficulty: z.number().min(1).max(30),
  scoreContribution: z.number().min(0).max(1e15),
});

const lifetimeSchema = z.object({
  gamesPlayed: z.number().min(0).max(10_000_000),
  totalPuzzlesSolved: z.number().min(0).max(100_000_000),
  bestScore: z.number().min(0).max(1e12),
  highestFloor: z.number().min(0).max(100_000),
  bestStreak: z.number().min(0).max(100_000),
  categoryStats: z.record(puzzleTypeSchema, lifetimeCategorySchema),
});

const personalBestsSchema = z.object({
  highestScore: z.number().min(0).max(1e12),
  highestFloor: z.number().min(0).max(100_000),
  bestStreak: z.number().min(0).max(100_000),
  mostCorrectInRun: z.number().min(0).max(100_000),
  fastestCorrectMs: z.number().min(0).max(600_000).nullable(),
  bestDifficulty: z.record(puzzleTypeSchema, z.number().min(1).max(30)),
});

const settingsSchema = z.object({
  sound: z.boolean(),
  haptics: z.boolean(),
  reducedMotion: z.boolean(),
  highContrast: z.boolean(),
});

const dailySchema = z
  .object({
    dateKey: z.string().max(32),
    completed: z.boolean(),
    correct: z.number().min(0).max(10_000),
    total: z.number().min(0).max(10_000),
  })
  .nullable();

const metaSchema = z.object({
  unlockedChallengeIds: z.array(z.string().max(64)).max(100),
  unlockedModifierIds: z.array(z.string().max(64)).max(100),
  unlockedBossIds: z.array(z.string().max(64)).max(100),
  unlockedUpgradeIds: z.array(z.string().max(64)).max(200),
  difficultyTiersUnlocked: z
    .array(z.enum(["standard", "advanced", "expert", "master"]))
    .max(10),
  completedChallenges: z.record(z.string(), z.number().min(0).max(10_000)),
  pendingUnlockNotices: z.array(z.string().max(200)).max(50),
});

const runHistoryEntrySchema = z.object({
  id: z.string().min(1).max(80),
  timestamp: z.number().min(0),
  mode: z.enum(["standard", "daily", "challenge", "weekly", "seeded"]),
  seed: z.string().max(128).optional(),
  score: z.number().min(0).max(1e12),
  floorReached: z.number().min(0).max(100_000),
  accuracy: z.number().min(0).max(1),
  bestStreak: z.number().min(0).max(100_000).optional(),
  archetype: z.string().max(64).optional(),
  challengeId: z.string().max(64).optional(),
  difficultyTier: z.enum(["standard", "advanced", "expert", "master"]),
  weeklyId: z.string().max(32).optional(),
});

const weeklyRecordSchema = z.object({
  weekId: z.string().max(32),
  attempts: z.number().min(0).max(10_000),
  bestScore: z.number().min(0).max(1e12),
  highestFloor: z.number().min(0).max(100_000),
  bestAccuracy: z.number().min(0).max(1),
  completed: z.boolean(),
});

export const cloudPlayerDataSchema = z.object({
  schemaVersion: z.number().int().min(5).max(CLOUD_SCHEMA_VERSION + 2),
  revision: z.number().int().min(0).max(1e12),
  updatedAt: z.number().min(0),
  deviceId: z.string().max(80).optional(),
  profile: brainProfileSchema,
  lifetime: lifetimeSchema,
  personalBests: personalBestsSchema,
  milestones: z.array(z.string().max(64)).max(200),
  settings: settingsSchema,
  daily: dailySchema,
  meta: metaSchema,
  runHistory: z.array(runHistoryEntrySchema).max(RUN_HISTORY_CLOUD_LIMIT),
  weeklyHistory: z.array(weeklyRecordSchema).max(WEEKLY_HISTORY_CLOUD_LIMIT),
  modeBests: z.record(
    z.string().max(128),
    z.object({
      highestScore: z.number().min(0).max(1e12),
      highestFloor: z.number().min(0).max(100_000),
    })
  ),
  familyStats: z.record(
    z.string().max(64),
    z.object({
      attempts: z.number().min(0).max(10_000_000),
      correct: z.number().min(0).max(10_000_000),
      totalResponseMs: z.number().min(0).max(1e15),
      highestDifficulty: z.number().min(1).max(30),
    })
  ),
  seenFamilyIntros: z.array(z.string().max(64)).max(200),
});

export const syncRequestSchema = z.object({
  baseRevision: z.number().int().min(0).max(1e12),
  clientRevision: z.number().int().min(0).max(1e12),
  deviceId: z.string().max(80).optional(),
  data: cloudPlayerDataSchema,
});

export const exportSchema = z.object({
  exportVersion: z.number().int().min(1).max(EXPORT_VERSION + 5),
  exportedAt: z.string().max(64),
  profile: z.object({
    schemaVersion: z.number(),
    profile: brainProfileSchema,
    lifetime: lifetimeSchema,
    personalBests: personalBestsSchema,
    milestones: z.array(z.string()).max(200),
    settings: settingsSchema,
    daily: dailySchema,
    meta: metaSchema,
    runHistory: z.array(runHistoryEntrySchema).max(RUN_HISTORY_CLOUD_LIMIT),
    weeklyHistory: z.array(weeklyRecordSchema).max(WEEKLY_HISTORY_CLOUD_LIMIT),
    modeBests: z.record(z.string(), z.any()),
    familyStats: z.record(z.string(), z.any()).optional(),
    seenFamilyIntros: z.array(z.string()).optional(),
    sync: z.any().optional(),
  }),
});

export const displayNameSchema = z
  .string()
  .min(2)
  .max(24)
  .regex(/^[a-zA-Z0-9 _.-]+$/);

export function validateCloudPayload(raw: unknown) {
  const result = cloudPlayerDataSchema.safeParse(raw);
  if (!result.success) return result;
  return {
    success: true as const,
    data: result.data as unknown as CloudPlayerData,
  };
}

export function validateSyncRequest(raw: unknown) {
  const result = syncRequestSchema.safeParse(raw);
  if (!result.success) return result;
  return {
    success: true as const,
    data: {
      ...result.data,
      data: result.data.data as unknown as CloudPlayerData,
    },
  };
}

export function validateExport(raw: unknown) {
  return exportSchema.safeParse(raw);
}

export function assertPayloadSize(json: string, max = MAX_IMPORT_BYTES): boolean {
  return new TextEncoder().encode(json).length <= max;
}
