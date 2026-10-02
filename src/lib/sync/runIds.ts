import type { RunHistoryEntry } from "@/types/run";

export function ensureRunId(
  entry: Partial<RunHistoryEntry> & {
    timestamp: number;
    mode: RunHistoryEntry["mode"];
    score: number;
    floorReached: number;
    accuracy: number;
    difficultyTier: RunHistoryEntry["difficultyTier"];
  }
): RunHistoryEntry {
  return {
    id:
      typeof entry.id === "string" && entry.id.length > 0
        ? entry.id
        : `run_${entry.timestamp}_${entry.score}_${entry.floorReached}`,
    timestamp: entry.timestamp,
    mode: entry.mode,
    seed: entry.seed,
    score: entry.score,
    floorReached: entry.floorReached,
    accuracy: entry.accuracy,
    bestStreak: entry.bestStreak,
    archetype: entry.archetype,
    challengeId: entry.challengeId,
    difficultyTier: entry.difficultyTier,
    weeklyId: entry.weeklyId,
  };
}

export function createRunId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `run_${crypto.randomUUID()}`;
  }
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
