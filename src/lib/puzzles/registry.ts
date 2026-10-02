import type { PuzzleType } from "@/types/puzzles";
import type { PuzzleTag } from "@/types/puzzles";

export interface FamilyEligibilityContext {
  difficulty: number;
  floor: number;
  unlockedFamilies: string[];
  floorType?: string;
  eliteType?: string;
  challengeId?: string;
  mode?: string;
}

export interface PuzzleFamilyMeta {
  id: string;
  category: PuzzleType;
  name: string;
  minDifficulty: number;
  maxDifficulty: number;
  tags: PuzzleTag[];
  cooldownFloors: number;
  weight: number;
  unlockPlayerLevel?: number;
  unlockMastery?: number;
  eliteOnly?: boolean;
  bossOnly?: boolean;
  intro?: string;
  minTimeLimitMs?: number;
}

/** Central catalog of puzzle families (ids match variant strings). */
export const PUZZLE_FAMILY_META: PuzzleFamilyMeta[] = [
  // Memory
  { id: "sequence", category: "memory", name: "Sequence Recall", minDifficulty: 1, maxDifficulty: 20, tags: ["memory"], cooldownFloors: 1, weight: 1.2, intro: "Remember symbols, then recreate the order." },
  { id: "reverse", category: "memory", name: "Reverse Recall", minDifficulty: 3, maxDifficulty: 20, tags: ["memory"], cooldownFloors: 2, weight: 1, unlockMastery: 2 },
  { id: "missing", category: "memory", name: "Missing Item", minDifficulty: 4, maxDifficulty: 20, tags: ["memory"], cooldownFloors: 2, weight: 1, unlockMastery: 2 },
  { id: "position", category: "memory", name: "Position Recall", minDifficulty: 5, maxDifficulty: 20, tags: ["memory", "spatial"], cooldownFloors: 2, weight: 0.9, unlockMastery: 4 },
  { id: "chunk", category: "memory", name: "Chunk Recall", minDifficulty: 4, maxDifficulty: 20, tags: ["memory"], cooldownFloors: 2, weight: 0.95, unlockMastery: 3, intro: "Remember short groups, then pick which chunk appeared." },
  { id: "ordered-groups", category: "memory", name: "Ordered Groups", minDifficulty: 6, maxDifficulty: 20, tags: ["memory"], cooldownFloors: 3, weight: 0.85, unlockMastery: 5, intro: "Remember which group came first." },
  { id: "interference", category: "memory", name: "Interference Recall", minDifficulty: 7, maxDifficulty: 20, tags: ["memory", "multi-stage"], cooldownFloors: 3, weight: 0.8, unlockMastery: 5, intro: "Memorize, solve a short distraction, then recall." },
  { id: "transform-recall", category: "memory", name: "Transform Recall", minDifficulty: 10, maxDifficulty: 20, tags: ["memory"], cooldownFloors: 3, weight: 0.7, unlockMastery: 6, unlockPlayerLevel: 6, intro: "Recall with a simple transformation applied." },
  { id: "boss", category: "memory", name: "Memory Boss", minDifficulty: 8, maxDifficulty: 20, tags: ["memory", "boss", "multi-stage"], cooldownFloors: 0, weight: 0, bossOnly: true },

  // Attention
  { id: "odd", category: "attention", name: "Odd Symbol", minDifficulty: 1, maxDifficulty: 20, tags: ["visual", "speed"], cooldownFloors: 1, weight: 1.2 },
  { id: "direction", category: "attention", name: "Direction Mismatch", minDifficulty: 3, maxDifficulty: 20, tags: ["visual"], cooldownFloors: 2, weight: 1, unlockMastery: 2 },
  { id: "stroop", category: "attention", name: "Stroop Conflict", minDifficulty: 4, maxDifficulty: 20, tags: ["attention"], cooldownFloors: 2, weight: 0.95, unlockMastery: 3 },
  { id: "find-two", category: "attention", name: "Find Two", minDifficulty: 6, maxDifficulty: 20, tags: ["visual"], cooldownFloors: 2, weight: 0.9, unlockMastery: 3 },
  { id: "multi-target", category: "attention", name: "Multi-Target Scan", minDifficulty: 5, maxDifficulty: 20, tags: ["visual", "speed"], cooldownFloors: 2, weight: 0.95, unlockMastery: 4, intro: "Tap every matching target." },
  { id: "alternating", category: "attention", name: "Alternating Target", minDifficulty: 7, maxDifficulty: 20, tags: ["attention"], cooldownFloors: 3, weight: 0.8, unlockMastery: 5, intro: "Tap targets in alternating order." },
  { id: "symbol-count", category: "attention", name: "Symbol Count", minDifficulty: 3, maxDifficulty: 20, tags: ["visual"], cooldownFloors: 2, weight: 1, unlockMastery: 2 },
  { id: "rule-switch", category: "attention", name: "Rule Switch", minDifficulty: 8, maxDifficulty: 20, tags: ["attention", "multi-stage"], cooldownFloors: 3, weight: 0.75, unlockMastery: 5, unlockPlayerLevel: 5, intro: "The rule changes between short stages." },

  // Math
  { id: "arithmetic", category: "math", name: "Basic Arithmetic", minDifficulty: 1, maxDifficulty: 20, tags: ["math"], cooldownFloors: 1, weight: 1.2 },
  { id: "missing-operator", category: "math", name: "Missing Operator", minDifficulty: 3, maxDifficulty: 20, tags: ["math"], cooldownFloors: 2, weight: 1, unlockMastery: 2 },
  { id: "comparison", category: "math", name: "Number Comparison", minDifficulty: 3, maxDifficulty: 20, tags: ["math"], cooldownFloors: 2, weight: 1, unlockMastery: 2 },
  { id: "target", category: "math", name: "Target Number", minDifficulty: 5, maxDifficulty: 20, tags: ["math"], cooldownFloors: 2, weight: 0.95, unlockMastery: 4 },
  { id: "equation-chain", category: "math", name: "Equation Chain", minDifficulty: 6, maxDifficulty: 20, tags: ["math"], cooldownFloors: 2, weight: 0.9, unlockMastery: 4, intro: "Follow the chain and fill the missing step." },
  { id: "number-sequence", category: "math", name: "Number Sequence", minDifficulty: 4, maxDifficulty: 20, tags: ["math", "logic"], cooldownFloors: 2, weight: 1, unlockMastery: 3 },
  { id: "estimation", category: "math", name: "Estimation", minDifficulty: 5, maxDifficulty: 20, tags: ["math"], cooldownFloors: 2, weight: 0.9, unlockMastery: 3 },
  { id: "constraint", category: "math", name: "Constraint Math", minDifficulty: 9, maxDifficulty: 20, tags: ["math", "logic"], cooldownFloors: 3, weight: 0.75, unlockMastery: 5, unlockPlayerLevel: 6 },

  // Logic
  { id: "pattern-sequence", category: "logic", name: "Pattern Sequence", minDifficulty: 1, maxDifficulty: 20, tags: ["logic"], cooldownFloors: 1, weight: 1.2 },
  { id: "symbol-pattern", category: "logic", name: "Symbol Pattern", minDifficulty: 2, maxDifficulty: 20, tags: ["logic", "visual"], cooldownFloors: 2, weight: 1, unlockMastery: 1 },
  { id: "odd-rule", category: "logic", name: "Odd Rule", minDifficulty: 3, maxDifficulty: 20, tags: ["logic"], cooldownFloors: 2, weight: 1, unlockMastery: 1 },
  { id: "ordering", category: "logic", name: "Logical Ordering", minDifficulty: 4, maxDifficulty: 20, tags: ["logic"], cooldownFloors: 2, weight: 0.95, unlockMastery: 3 },
  { id: "conditional", category: "logic", name: "Conditional Logic", minDifficulty: 5, maxDifficulty: 20, tags: ["logic"], cooldownFloors: 2, weight: 0.9, unlockMastery: 3 },
  { id: "rule-matrix", category: "logic", name: "Rule Matrix", minDifficulty: 6, maxDifficulty: 20, tags: ["logic", "visual"], cooldownFloors: 3, weight: 0.85, unlockMastery: 4, unlockPlayerLevel: 4, intro: "Find the row rule and complete the missing tile." },
  { id: "set-membership", category: "logic", name: "Set Membership", minDifficulty: 5, maxDifficulty: 20, tags: ["logic"], cooldownFloors: 2, weight: 0.9, unlockMastery: 3 },
  { id: "deduction-lite", category: "logic", name: "Deduction Lite", minDifficulty: 7, maxDifficulty: 20, tags: ["logic"], cooldownFloors: 3, weight: 0.8, unlockMastery: 4, unlockPlayerLevel: 5 },
  { id: "boolean-rule", category: "logic", name: "Boolean Rules", minDifficulty: 10, maxDifficulty: 20, tags: ["logic"], cooldownFloors: 3, weight: 0.7, unlockMastery: 6, unlockPlayerLevel: 8 },

  // Spatial
  { id: "rotation", category: "spatial", name: "Rotation Match", minDifficulty: 1, maxDifficulty: 20, tags: ["spatial"], cooldownFloors: 1, weight: 1.2 },
  { id: "mirror", category: "spatial", name: "Mirror Match", minDifficulty: 2, maxDifficulty: 20, tags: ["spatial"], cooldownFloors: 2, weight: 1, unlockMastery: 1 },
  { id: "grid-move", category: "spatial", name: "Grid Movement", minDifficulty: 3, maxDifficulty: 20, tags: ["spatial"], cooldownFloors: 2, weight: 1, unlockMastery: 1 },
  { id: "missing-tile", category: "spatial", name: "Missing Tile", minDifficulty: 4, maxDifficulty: 20, tags: ["spatial", "logic"], cooldownFloors: 2, weight: 0.95, unlockMastery: 3 },
  { id: "transform", category: "spatial", name: "Position Transform", minDifficulty: 5, maxDifficulty: 20, tags: ["spatial"], cooldownFloors: 2, weight: 0.9, unlockMastery: 3 },
  { id: "path-trace", category: "spatial", name: "Path Trace", minDifficulty: 5, maxDifficulty: 20, tags: ["spatial", "memory"], cooldownFloors: 3, weight: 0.85, unlockMastery: 4, intro: "Watch the path, then pick the end cell." },
  { id: "shape-assembly", category: "spatial", name: "Shape Assembly", minDifficulty: 6, maxDifficulty: 20, tags: ["spatial"], cooldownFloors: 3, weight: 0.8, unlockMastery: 4, unlockPlayerLevel: 5 },
  { id: "block-shift", category: "spatial", name: "Block Shift", minDifficulty: 7, maxDifficulty: 20, tags: ["spatial"], cooldownFloors: 3, weight: 0.8, unlockMastery: 5 },
  { id: "orientation", category: "spatial", name: "Orientation Tracking", minDifficulty: 4, maxDifficulty: 20, tags: ["spatial"], cooldownFloors: 2, weight: 0.95, unlockMastery: 2 },

  // Combined
  { id: "memory-math", category: "combined", name: "Memory + Math", minDifficulty: 5, maxDifficulty: 20, tags: ["combined", "memory", "math"], cooldownFloors: 4, weight: 1 },
  { id: "memory-logic", category: "combined", name: "Memory + Logic", minDifficulty: 6, maxDifficulty: 20, tags: ["combined", "memory", "logic"], cooldownFloors: 4, weight: 0.9, unlockPlayerLevel: 3 },
  { id: "attention-math", category: "combined", name: "Attention + Math", minDifficulty: 6, maxDifficulty: 20, tags: ["combined", "attention", "math"], cooldownFloors: 4, weight: 0.9, unlockPlayerLevel: 5 },
  { id: "memory-spatial", category: "combined", name: "Memory + Spatial", minDifficulty: 8, maxDifficulty: 20, tags: ["combined", "memory", "spatial"], cooldownFloors: 5, weight: 0.75, unlockPlayerLevel: 7, unlockMastery: 4 },
  { id: "attention-logic", category: "combined", name: "Attention + Logic", minDifficulty: 7, maxDifficulty: 20, tags: ["combined", "attention", "logic"], cooldownFloors: 4, weight: 0.8, unlockPlayerLevel: 6 },
  { id: "logic-math", category: "combined", name: "Logic + Math", minDifficulty: 7, maxDifficulty: 20, tags: ["combined", "logic", "math"], cooldownFloors: 4, weight: 0.8, unlockPlayerLevel: 6 },
  { id: "spatial-logic", category: "combined", name: "Spatial + Logic", minDifficulty: 8, maxDifficulty: 20, tags: ["combined", "spatial", "logic"], cooldownFloors: 5, weight: 0.75, unlockPlayerLevel: 8 },
];

export function getFamilyMeta(id: string): PuzzleFamilyMeta | undefined {
  return PUZZLE_FAMILY_META.find((f) => f.id === id);
}

export function familiesForCategory(category: PuzzleType): PuzzleFamilyMeta[] {
  return PUZZLE_FAMILY_META.filter((f) => f.category === category);
}

export function isFamilyEligible(
  family: PuzzleFamilyMeta,
  ctx: FamilyEligibilityContext
): boolean {
  if (family.bossOnly && ctx.floorType !== "boss") return false;
  if (family.eliteOnly && !ctx.eliteType) return false;
  if (ctx.difficulty < family.minDifficulty) return false;
  if (ctx.difficulty > family.maxDifficulty) return false;
  if (family.unlockPlayerLevel && !ctx.unlockedFamilies.includes(family.id)) {
    // still allow if listed in unlocked
  }
  if (
    !ctx.unlockedFamilies.includes(family.id) &&
    (family.unlockMastery || family.unlockPlayerLevel || family.bossOnly)
  ) {
    // Basic always-on families without unlock gates stay available
    const gated =
      family.unlockMastery != null ||
      family.unlockPlayerLevel != null ||
      family.bossOnly ||
      family.eliteOnly;
    if (gated && !ctx.unlockedFamilies.includes(family.id)) return false;
  }
  return true;
}

export function computeUnlockedFamilies(input: {
  playerLevel: number;
  mastery: Partial<Record<PuzzleType, number>>;
  existing?: string[];
}): string[] {
  const unlocked = new Set(input.existing ?? []);
  for (const f of PUZZLE_FAMILY_META) {
    if (f.bossOnly) {
      if (input.playerLevel >= 8) unlocked.add(f.id);
      continue;
    }
    const mastery = input.mastery[f.category] ?? 1;
    const levelOk =
      f.unlockPlayerLevel == null || input.playerLevel >= f.unlockPlayerLevel;
    const masteryOk = f.unlockMastery == null || mastery >= f.unlockMastery;
    if (
      (f.unlockPlayerLevel == null && f.unlockMastery == null) ||
      (levelOk && masteryOk)
    ) {
      unlocked.add(f.id);
    }
  }
  // Always ensure starter families
  for (const id of [
    "sequence",
    "odd",
    "arithmetic",
    "pattern-sequence",
    "rotation",
    "memory-math",
  ]) {
    unlocked.add(id);
  }
  return [...unlocked];
}
