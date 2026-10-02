import { clamp } from "@/lib/game/utils";
import type { PuzzleType } from "@/types/puzzles";
import type {
  BrainProfile,
  CategoryProfile,
  PerformanceSample,
} from "@/types/profile";
import {
  MAX_RATING,
  MIN_RATING,
  createCategoryProfile,
} from "@/types/profile";
import { MAX_DIFFICULTY, MIN_DIFFICULTY } from "@/types/game";

const SAMPLE_LIMIT = 20;
const SMOOTH = 0.1;

/** Map rating 1–100 → starting difficulty 1–20 conservatively. */
export function profileRatingToDifficulty(rating: number, confidence: number): number {
  const safeRating = clamp(rating, MIN_RATING, MAX_RATING);
  // Confidence softens extremes for new players
  const blended = 40 + (safeRating - 40) * (0.4 + confidence * 0.6);
  const raw = 1 + ((blended - 1) / 99) * 14; // maps roughly into 1–15
  return clamp(Math.round(raw), MIN_DIFFICULTY, Math.min(15, MAX_DIFFICULTY));
}

/** Estimate instantaneous performance 1–100 from a single attempt. */
export function estimatePerformance(sample: {
  correct: boolean;
  difficulty: number;
  responseTimeMs: number;
  timeLimitMs?: number;
}): number {
  if (!sample.correct) {
    return clamp(25 - sample.difficulty, 5, 40);
  }
  const diffFactor = (sample.difficulty / MAX_DIFFICULTY) * 55;
  let speed = 15;
  if (sample.timeLimitMs && sample.timeLimitMs > 0) {
    const ratio = sample.responseTimeMs / sample.timeLimitMs;
    speed = clamp(25 * (1 - ratio), 5, 25);
  }
  return clamp(40 + diffFactor + speed, 45, 100);
}

export function updateCategoryFromAttempt(
  profile: CategoryProfile,
  attempt: {
    correct: boolean;
    difficulty: number;
    responseTimeMs: number;
    timeLimitMs?: number;
  }
): CategoryProfile {
  const estimate = estimatePerformance(attempt);
  const nextRating = clamp(
    profile.rating * (1 - SMOOTH) + estimate * SMOOTH,
    MIN_RATING,
    MAX_RATING
  );

  const attempted = profile.puzzlesAttempted + 1;
  const correct = profile.puzzlesCorrect + (attempt.correct ? 1 : 0);
  const sample: PerformanceSample = {
    correct: attempt.correct,
    difficulty: attempt.difficulty,
    responseTimeMs: attempt.responseTimeMs,
    timestamp: Date.now(),
  };
  const recent = [...profile.recentPerformance, sample].slice(-SAMPLE_LIMIT);
  const windowCorrect = recent.filter((s) => s.correct).length;
  const rollingAccuracy =
    recent.length === 0 ? 0 : windowCorrect / recent.length;
  const rollingResponseTimeMs =
    recent.length === 0
      ? 0
      : Math.round(
          recent.reduce((s, x) => s + x.responseTimeMs, 0) / recent.length
        );

  const confidence = clamp(attempted / 30, 0, 1);

  return {
    ...profile,
    rating: Math.round(nextRating * 10) / 10,
    puzzlesAttempted: attempted,
    puzzlesCorrect: correct,
    rollingAccuracy,
    rollingResponseTimeMs,
    highestDifficulty: Math.max(
      profile.highestDifficulty,
      attempt.correct ? attempt.difficulty : profile.highestDifficulty
    ),
    recentPerformance: recent,
    lastPlayedAt: Date.now(),
    confidence,
  };
}

export function applyRunToProfile(
  profile: BrainProfile,
  attempts: Array<{
    category: PuzzleType;
    correct: boolean;
    difficulty: number;
    responseTimeMs: number;
    timeLimitMs?: number;
  }>
): {
  profile: BrainProfile;
  ratingDeltas: Partial<Record<PuzzleType, { from: number; to: number }>>;
} {
  const ratingDeltas: Partial<Record<PuzzleType, { from: number; to: number }>> =
    {};
  const categories = { ...profile.categories };

  for (const attempt of attempts) {
    const prev = categories[attempt.category] ?? createCategoryProfile();
    const from = prev.rating;
    const next = updateCategoryFromAttempt(prev, attempt);
    categories[attempt.category] = next;
    ratingDeltas[attempt.category] = { from, to: next.rating };
  }

  return {
    profile: {
      ...profile,
      categories,
      totalPuzzles: profile.totalPuzzles + attempts.length,
      updatedAt: Date.now(),
    },
    ratingDeltas,
  };
}

export function startingDifficultiesFromProfile(
  profile: BrainProfile
): Record<PuzzleType, number> {
  const out = {} as Record<PuzzleType, number>;
  for (const [key, cat] of Object.entries(profile.categories) as Array<
    [PuzzleType, CategoryProfile]
  >) {
    out[key] = profileRatingToDifficulty(cat.rating, cat.confidence);
  }
  return out;
}
