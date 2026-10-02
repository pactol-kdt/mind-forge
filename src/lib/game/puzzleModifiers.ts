export interface PuzzleConfigPatch {
  timeBonusPct?: number;
  displayBonusMs?: number;
  difficultyDelta?: number;
  forceVariant?: string;
  extraDistractors?: boolean;
}

export interface PuzzleModifierDefinition {
  id: string;
  name: string;
  compatibleFamilies: string[];
  apply: (config: PuzzleConfigPatch) => PuzzleConfigPatch;
}

/** Puzzle-specific modifiers (separate from run modifiers). */
export const PUZZLE_MODIFIERS: PuzzleModifierDefinition[] = [
  {
    id: "fast",
    name: "Fast",
    compatibleFamilies: ["odd", "direction", "arithmetic", "symbol-count"],
    apply: (c) => ({ ...c, timeBonusPct: (c.timeBonusPct ?? 0) - 0.25 }),
  },
  {
    id: "limited-preview",
    name: "Limited Preview",
    compatibleFamilies: ["sequence", "reverse", "chunk", "position"],
    apply: (c) => ({ ...c, displayBonusMs: (c.displayBonusMs ?? 0) - 800 }),
  },
  {
    id: "extra-distractors",
    name: "Extra Distractors",
    compatibleFamilies: ["odd", "arithmetic", "pattern-sequence"],
    apply: (c) => ({ ...c, extraDistractors: true }),
  },
  {
    id: "perfect-required",
    name: "Perfect Required",
    compatibleFamilies: ["sequence", "stroop", "arithmetic"],
    apply: (c) => ({ ...c, timeBonusPct: (c.timeBonusPct ?? 0) - 0.1 }),
  },
];

export function applyPuzzleModifier(
  id: string,
  config: PuzzleConfigPatch
): PuzzleConfigPatch {
  const mod = PUZZLE_MODIFIERS.find((m) => m.id === id);
  return mod ? mod.apply(config) : config;
}
