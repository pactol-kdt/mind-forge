import type { PuzzleType } from "@/types/puzzles";
import { PUZZLE_TYPE_LABELS } from "@/types/puzzles";
import { createSeededRng, deriveSeed } from "./seededRandom";

/** Categories offered on Choice Path / Specialist upgrade (excludes combined). */
export const FOCUS_CATEGORY_OPTS: PuzzleType[] = [
  "memory",
  "attention",
  "math",
  "logic",
  "spatial",
];

function countRecent(
  recent: PuzzleType[],
  cat: PuzzleType
): number {
  return recent.filter((c) => c === cat).length;
}

/**
 * Pick 2 distinct path trials from the 5 focus categories.
 * Seeded by run seed + floor; underplayed categories get higher weight.
 */
export function pickChoicePathOptions(
  seed: string,
  floor: number,
  recentCategories: PuzzleType[] = [],
  categoryAttempted?: Partial<Record<PuzzleType, number>>
): [PuzzleType, PuzzleType] {
  const rng = createSeededRng(deriveSeed(seed, "choice", floor));
  const scored = FOCUS_CATEGORY_OPTS.map((cat) => {
    const recentHits = countRecent(recentCategories, cat);
    const attempted = categoryAttempted?.[cat] ?? 0;
    // Prefer underplayed: fewer recent + fewer attempts → higher weight
    const w = Math.max(0.35, 3 - recentHits * 0.75 - attempted * 0.15);
    return { cat, w };
  });

  const pickOne = (pool: { cat: PuzzleType; w: number }[]): PuzzleType => {
    const total = pool.reduce((s, x) => s + x.w, 0);
    let roll = rng() * total;
    for (const item of pool) {
      roll -= item.w;
      if (roll <= 0) return item.cat;
    }
    return pool[pool.length - 1]!.cat;
  };

  const first = pickOne(scored);
  const remaining = scored.filter((x) => x.cat !== first);
  const second = pickOne(remaining);
  return [first, second];
}

export function choiceTrialLabel(category: PuzzleType): string {
  return `${PUZZLE_TYPE_LABELS[category]} Trial`;
}
