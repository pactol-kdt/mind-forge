import type {
  CategoryStat,
  LifetimeStats,
  PuzzleAttempt,
} from "@/types/game";
import { createEmptyLifetimeCategoryStat, DEFAULT_STATS } from "@/types/game";
import type { PuzzleType } from "@/types/puzzles";
import { ALL_PUZZLE_TYPES, PUZZLE_TYPE_LABELS } from "@/types/puzzles";
import { emptyCategoryRecord } from "@/types/categories";

export function accuracyOf(stat: {
  attempted: number;
  correct: number;
}): number {
  if (stat.attempted === 0) return 0;
  return Math.round((stat.correct / stat.attempted) * 100);
}

export function averageResponseMs(stat: {
  attempted: number;
  totalResponseMs: number;
}): number | null {
  if (stat.attempted === 0) return null;
  return Math.round(stat.totalResponseMs / stat.attempted);
}

export function formatSeconds(ms: number | null): string {
  if (ms === null) return "—";
  return `${(ms / 1000).toFixed(1)}s`;
}

export function categoryStrength(stat: CategoryStat): number {
  if (stat.attempted === 0) return 0;
  const acc = stat.correct / stat.attempted;
  const diff = Math.min(1, (stat.highestDifficulty - 1) / 19);
  return Math.round(Math.min(10, Math.max(0, (acc * 0.7 + diff * 0.3) * 10)));
}

export function strongestCategory(
  stats: Record<PuzzleType, CategoryStat>
): PuzzleType | null {
  let best: PuzzleType | null = null;
  let bestScore = -1;
  for (const type of ALL_PUZZLE_TYPES) {
    const s = stats[type];
    if (!s || s.attempted === 0) continue;
    const score = categoryStrength(s);
    if (score > bestScore) {
      bestScore = score;
      best = type;
    }
  }
  return best;
}

export function mostChallengingCategory(
  stats: Record<PuzzleType, CategoryStat>
): PuzzleType | null {
  let worst: PuzzleType | null = null;
  let worstScore = 11;
  for (const type of ALL_PUZZLE_TYPES) {
    const s = stats[type];
    if (!s || s.attempted < 2) continue;
    const score = categoryStrength(s);
    if (score < worstScore) {
      worstScore = score;
      worst = type;
    }
  }
  return worst;
}

export function fastestCategory(
  stats: Record<PuzzleType, CategoryStat>
): PuzzleType | null {
  let best: PuzzleType | null = null;
  let bestMs = Infinity;
  for (const type of ALL_PUZZLE_TYPES) {
    const avg = averageResponseMs(stats[type]);
    if (avg === null) continue;
    if (avg < bestMs) {
      bestMs = avg;
      best = type;
    }
  }
  return best;
}

export function labelFor(type: PuzzleType): string {
  return PUZZLE_TYPE_LABELS[type];
}

export function mergeLifetimeStats(
  current: LifetimeStats,
  run: {
    score: number;
    floor: number;
    bestStreak: number;
    correctAnswers: number;
    categoryStats: Record<PuzzleType, CategoryStat>;
  }
): LifetimeStats {
  const categoryStats = emptyCategoryRecord(createEmptyLifetimeCategoryStat);
  for (const type of ALL_PUZZLE_TYPES) {
    const src = run.categoryStats[type] ?? createEmptyLifetimeCategoryStat();
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

  return {
    gamesPlayed: current.gamesPlayed + 1,
    totalPuzzlesSolved: current.totalPuzzlesSolved + run.correctAnswers,
    bestScore: Math.max(current.bestScore, run.score),
    highestFloor: Math.max(current.highestFloor, run.floor),
    bestStreak: Math.max(current.bestStreak, run.bestStreak),
    categoryStats,
  };
}

export function summarizeAttempts(attempts: PuzzleAttempt[]): {
  byCategory: Record<PuzzleType, number>;
} {
  const byCategory = emptyCategoryRecord(() => 0);
  for (const a of attempts) {
    byCategory[a.category] += 1;
  }
  return { byCategory };
}

export { DEFAULT_STATS };
