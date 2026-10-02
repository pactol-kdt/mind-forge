import type { FloorType } from "@/types/game";
import type { PuzzleType } from "@/types/puzzles";
import { CATEGORY_CONFIG, STANDARD_TRAINING_CATEGORIES } from "@/types/categories";
import type { Rng } from "./seededRandom";

/**
 * Weighted puzzle selection with anti-repetition and unlock awareness.
 * Optional rng enables seeded runs.
 */
export function selectPuzzleType(
  recentTypes: PuzzleType[],
  options: {
    floor: number;
    floorType: FloorType;
    forceMemory?: boolean;
    forceCategory?: PuzzleType;
    maxConsecutive?: number;
    allowCombined?: boolean;
    unlockedVariants?: string[];
    categoryWeightBoost?: Partial<Record<PuzzleType, number>>;
    forceCategoryShare?: { category: PuzzleType; share: number };
    combinedBias?: number;
    rng?: Rng;
  }
): PuzzleType {
  const {
    floor,
    floorType,
    forceMemory,
    forceCategory,
    maxConsecutive = 2,
    allowCombined = floor >= 8,
    categoryWeightBoost,
    forceCategoryShare,
    combinedBias = 0.08,
    rng,
  } = options;

  const rand = () => (rng ? rng() : Math.random());

  if (forceCategory) return forceCategory;
  if (forceMemory) return "memory";

  if (floorType === "boss") {
    const bosses: PuzzleType[] = ["memory", "logic", "spatial", "math", "attention"];
    const last = recentTypes[recentTypes.length - 1];
    const pool = bosses.filter((b) => b !== last);
    return pool[Math.floor(rand() * pool.length)]!;
  }

  if (forceCategoryShare && rand() < forceCategoryShare.share) {
    return forceCategoryShare.category;
  }

  if (allowCombined && rand() < combinedBias) return "combined";

  const last = recentTypes[recentTypes.length - 1];
  let consecutive = 0;
  for (let i = recentTypes.length - 1; i >= 0; i--) {
    if (recentTypes[i] === last) consecutive++;
    else break;
  }

  const weights = STANDARD_TRAINING_CATEGORIES.map((type) => {
    let w = CATEGORY_CONFIG[type].baseWeight;
    if (categoryWeightBoost?.[type]) w *= categoryWeightBoost[type]!;
    if (last && type === last && consecutive >= maxConsecutive) w = 0;
    else if (last && type === last) w *= 0.35;
    const recentCount = recentTypes.filter((t) => t === type).length;
    w *= Math.max(0.4, 1 - recentCount * 0.15);
    return { type, w };
  }).filter((x) => x.w > 0);

  const total = weights.reduce((s, x) => s + x.w, 0);
  let roll = rand() * total;
  for (const item of weights) {
    roll -= item.w;
    if (roll <= 0) return item.type;
  }
  return weights[weights.length - 1]?.type ?? "memory";
}
