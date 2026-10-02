import { clamp } from "@/lib/game/utils";
import type { BrainProfile, CategoryProfile } from "@/types/profile";
import type { PuzzleType } from "@/types/puzzles";

/** XP needed to go from `level` → `level + 1`. */
export function xpToNextLevel(level: number): number {
  const n = Math.max(1, level);
  return Math.round(100 * Math.pow(1.35, n - 1));
}

export function puzzleXp(difficulty: number, correct: boolean): number {
  if (!correct) return 2;
  return 8 + difficulty * 2;
}

export function runBonusXp(floor: number, accuracy: number): number {
  return Math.round(floor * 3 + accuracy * 40);
}

export function masteryXpGain(difficulty: number, correct: boolean): number {
  if (!correct) return 1;
  return 5 + difficulty;
}

export function masteryXpToNext(level: number): number {
  return Math.round(60 * Math.pow(1.3, Math.max(0, level - 1)));
}

export function applyMasteryXp(
  cat: CategoryProfile,
  gain: number
): { profile: CategoryProfile; leveled: boolean; from: number; to: number } {
  let masteryXP = Math.max(0, cat.masteryXP + gain);
  let masteryLevel = cat.masteryLevel;
  const from = masteryLevel;
  let leveled = false;
  while (masteryXP >= masteryXpToNext(masteryLevel)) {
    masteryXP -= masteryXpToNext(masteryLevel);
    masteryLevel += 1;
    leveled = true;
  }
  return {
    profile: { ...cat, masteryXP, masteryLevel },
    leveled,
    from,
    to: masteryLevel,
  };
}

export function applyPlayerXp(
  profile: BrainProfile,
  gain: number
): { profile: BrainProfile; levelsGained: number[] } {
  let currentXP = Math.max(0, profile.currentXP + gain);
  let playerLevel = profile.playerLevel;
  const lifetimeXP = Math.max(0, profile.lifetimeXP + gain);
  const levelsGained: number[] = [];

  while (currentXP >= xpToNextLevel(playerLevel)) {
    currentXP -= xpToNextLevel(playerLevel);
    playerLevel += 1;
    levelsGained.push(playerLevel);
  }

  return {
    profile: {
      ...profile,
      currentXP,
      playerLevel,
      lifetimeXP,
      updatedAt: Date.now(),
    },
    levelsGained,
  };
}

/** Variants unlocked by mastery / player level. */
export function computeUnlockedVariants(profile: BrainProfile): string[] {
  const unlocked = new Set(profile.unlockedVariants);
  const add = (...ids: string[]) => ids.forEach((id) => unlocked.add(id));

  add("sequence", "odd", "arithmetic", "pattern-sequence", "rotation", "memory-math");

  if (profile.categories.memory.masteryLevel >= 2) add("reverse", "missing");
  if (profile.categories.memory.masteryLevel >= 3) add("chunk");
  if (profile.categories.memory.masteryLevel >= 4) add("position");
  if (profile.categories.memory.masteryLevel >= 5)
    add("ordered-groups", "interference");
  if (profile.categories.memory.masteryLevel >= 6 || profile.playerLevel >= 6)
    add("transform-recall");

  if (profile.categories.attention.masteryLevel >= 2)
    add("direction", "symbol-count");
  if (profile.categories.attention.masteryLevel >= 3) add("stroop", "find-two");
  if (profile.categories.attention.masteryLevel >= 4) add("multi-target");
  if (profile.categories.attention.masteryLevel >= 5)
    add("alternating", "rule-switch");

  if (profile.categories.math.masteryLevel >= 2)
    add("missing-operator", "comparison");
  if (profile.categories.math.masteryLevel >= 3)
    add("number-sequence", "estimation");
  if (profile.categories.math.masteryLevel >= 4)
    add("target", "equation-chain");
  if (profile.categories.math.masteryLevel >= 5 || profile.playerLevel >= 6)
    add("constraint");

  if (profile.categories.logic.masteryLevel >= 1)
    add("symbol-pattern", "odd-rule");
  if (profile.categories.logic.masteryLevel >= 3)
    add("ordering", "conditional", "set-membership");
  if (profile.categories.logic.masteryLevel >= 4 || profile.playerLevel >= 4)
    add("rule-matrix", "deduction-lite");
  if (profile.categories.logic.masteryLevel >= 6 || profile.playerLevel >= 8)
    add("boolean-rule");

  if (profile.categories.spatial.masteryLevel >= 1) add("mirror", "grid-move");
  if (profile.categories.spatial.masteryLevel >= 2) add("orientation");
  if (profile.categories.spatial.masteryLevel >= 3)
    add("missing-tile", "transform");
  if (profile.categories.spatial.masteryLevel >= 4)
    add("path-trace", "shape-assembly");
  if (profile.categories.spatial.masteryLevel >= 5) add("block-shift");

  if (profile.playerLevel >= 3) add("memory-logic");
  if (profile.playerLevel >= 5) add("attention-math");
  if (profile.playerLevel >= 6) add("attention-logic", "logic-math");
  if (profile.playerLevel >= 7) add("memory-spatial");
  if (profile.playerLevel >= 8) add("boss", "spatial-logic");

  return [...unlocked];
}

export function syncUnlocks(profile: BrainProfile): BrainProfile {
  return {
    ...profile,
    unlockedVariants: computeUnlockedVariants(profile),
  };
}

export function applyCategoryMasteryGains(
  profile: BrainProfile,
  gains: Partial<Record<PuzzleType, number>>
): {
  profile: BrainProfile;
  masteryLevelUps: Partial<Record<PuzzleType, { from: number; to: number }>>;
} {
  const categories = { ...profile.categories };
  const masteryLevelUps: Partial<
    Record<PuzzleType, { from: number; to: number }>
  > = {};

  for (const [key, gain] of Object.entries(gains) as Array<[PuzzleType, number]>) {
    if (!gain) continue;
    const result = applyMasteryXp(categories[key], gain);
    categories[key] = result.profile;
    if (result.leveled) {
      masteryLevelUps[key] = { from: result.from, to: result.to };
    }
  }

  return {
    profile: syncUnlocks({ ...profile, categories, updatedAt: Date.now() }),
    masteryLevelUps,
  };
}

export function xpProgress(profile: BrainProfile): {
  current: number;
  needed: number;
  ratio: number;
} {
  const needed = xpToNextLevel(profile.playerLevel);
  return {
    current: profile.currentXP,
    needed,
    ratio: clamp(profile.currentXP / needed, 0, 1),
  };
}
