import type { CategoryDifficultyMap, CategoryStat } from "@/types/game";
import { MAX_DIFFICULTY, MIN_DIFFICULTY } from "@/types/game";
import type { PuzzleType } from "@/types/puzzles";
import { ALL_PUZZLE_TYPES } from "@/types/puzzles";
import { clamp } from "./utils";

const RECENT_WINDOW = 3;

export function updateCategoryDifficulty(
  current: CategoryDifficultyMap,
  category: PuzzleType,
  correct: boolean,
  responseTimeMs: number,
  timeLimitMs: number | undefined,
  categoryStat: CategoryStat
): CategoryDifficultyMap {
  const recent = categoryStat.recentResults.slice(-RECENT_WINDOW);
  let next = current[category] ?? 1;

  const threeCorrect = recent.length >= 3 && recent.every((r) => r === true);
  const twoIncorrect =
    recent.length >= 3 && recent.filter((r) => !r).length >= 2;

  if (threeCorrect) {
    next += 1;
  } else if (twoIncorrect) {
    next -= 1;
  } else if (
    correct &&
    timeLimitMs &&
    responseTimeMs < timeLimitMs * 0.35 &&
    recent.filter((r) => !r).length === 0
  ) {
    if (recent.length >= 2 && recent.every(Boolean)) {
      next += 1;
    }
  }

  next = clamp(next, MIN_DIFFICULTY, MAX_DIFFICULTY);

  return {
    ...current,
    [category]: next,
  };
}

export function applyDifficultyDelta(
  map: CategoryDifficultyMap,
  delta: number
): CategoryDifficultyMap {
  const next = { ...map };
  for (const type of ALL_PUZZLE_TYPES) {
    next[type] = clamp(
      (map[type] ?? 1) + delta,
      MIN_DIFFICULTY,
      MAX_DIFFICULTY
    );
  }
  return next;
}

export function getDifficultyForCategory(
  map: CategoryDifficultyMap,
  category: PuzzleType
): number {
  return map[category] ?? 1;
}

export function getDifficultyForFloor(floor: number): number {
  return Math.min(20, 1 + Math.floor((floor - 1) / 3));
}
