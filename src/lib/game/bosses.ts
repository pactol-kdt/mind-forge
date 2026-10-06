import type { PuzzleType } from "@/types/puzzles";
import { createSeededRng, deriveSeed, rngPick } from "./seededRandom";

export type BossStageKind =
  | "memorize"
  | "solve"
  | "recall"
  | "logic"
  | "spatial"
  | "attention"
  | "math"
  | "combined";

export interface BossStage {
  kind: BossStageKind;
  label: string;
  category: PuzzleType;
  difficultyBonus: number;
}

export interface BossDefinition {
  id: string;
  name: string;
  category: PuzzleType | "mixed";
  minFloor: number;
  stages: BossStage[];
  difficultyModifier: number;
  rewardMultiplier: number;
}

export const BOSS_DEFINITIONS: BossDefinition[] = [
  {
    id: "archivist",
    name: "The Archivist",
    category: "memory",
    minFloor: 10,
    difficultyModifier: 2,
    rewardMultiplier: 2.2,
    stages: [
      {
        kind: "memorize",
        label: "Memorize symbols",
        category: "memory",
        difficultyBonus: 1,
      },
      {
        kind: "solve",
        label: "Distraction puzzle",
        category: "attention",
        difficultyBonus: 0,
      },
      {
        kind: "recall",
        label: "Recall the sequence",
        category: "memory",
        difficultyBonus: 2,
      },
    ],
  },
  {
    id: "architect",
    name: "The Architect",
    category: "spatial",
    minFloor: 10,
    difficultyModifier: 2,
    rewardMultiplier: 2.2,
    stages: [
      {
        kind: "spatial",
        label: "Observe the grid",
        category: "spatial",
        difficultyBonus: 1,
      },
      {
        kind: "spatial",
        label: "Track the shift",
        category: "spatial",
        difficultyBonus: 2,
      },
    ],
  },
  {
    id: "logician",
    name: "The Logician",
    category: "logic",
    minFloor: 10,
    difficultyModifier: 2,
    rewardMultiplier: 2.2,
    stages: [
      {
        kind: "logic",
        label: "Identify the rule",
        category: "logic",
        difficultyBonus: 1,
      },
      {
        kind: "logic",
        label: "Apply the rule",
        category: "logic",
        difficultyBonus: 2,
      },
    ],
  },
  {
    id: "calculator",
    name: "The Calculator",
    category: "math",
    minFloor: 10,
    difficultyModifier: 2,
    rewardMultiplier: 2.1,
    stages: [
      {
        kind: "math",
        label: "Arithmetic strike",
        category: "math",
        difficultyBonus: 1,
      },
      {
        kind: "math",
        label: "Target number",
        category: "math",
        difficultyBonus: 2,
      },
    ],
  },
  {
    id: "sentinel",
    name: "The Sentinel",
    category: "attention",
    minFloor: 10,
    difficultyModifier: 2,
    rewardMultiplier: 2.1,
    stages: [
      {
        kind: "attention",
        label: "Odd symbol hunt",
        category: "attention",
        difficultyBonus: 1,
      },
      {
        kind: "attention",
        label: "Rule focus",
        category: "attention",
        difficultyBonus: 2,
      },
    ],
  },
  {
    id: "mindforge",
    name: "The Mindforge",
    category: "mixed",
    minFloor: 30,
    difficultyModifier: 3,
    rewardMultiplier: 2.8,
    stages: [
      {
        kind: "memorize",
        label: "Forge memory",
        category: "memory",
        difficultyBonus: 2,
      },
      {
        kind: "logic",
        label: "Forge logic",
        category: "logic",
        difficultyBonus: 2,
      },
      {
        kind: "spatial",
        label: "Forge space",
        category: "spatial",
        difficultyBonus: 2,
      },
    ],
  },
];

export function pickBossForFloor(
  floor: number,
  seed: string,
  unlockedBossIds: string[]
): BossDefinition {
  const unlocked = new Set(unlockedBossIds);
  const pool = BOSS_DEFINITIONS.filter(
    (b) => unlocked.has(b.id) && floor >= b.minFloor
  );
  const fallback = BOSS_DEFINITIONS.filter(
    (b) => b.id !== "mindforge" && floor >= b.minFloor
  );
  const use = pool.length > 0 ? pool : fallback;
  const rng = createSeededRng(deriveSeed(seed, "boss", floor));
  return rngPick(rng, use);
}

export function getBoss(id: string): BossDefinition | undefined {
  return BOSS_DEFINITIONS.find((b) => b.id === id);
}

/**
 * Decide boss stage transition at answer time.
 * Using this (not a post-increment index check) prevents the final stage
 * from looping when index / defeated counters get out of sync.
 */
export function resolveBossAdvance(
  stageIndex: number,
  stageCount: number,
  correct: boolean,
  secondChanceSaved: boolean
): "continue" | "retry" | "clear" {
  if (!correct || secondChanceSaved) return "retry";
  if (stageIndex + 1 < stageCount) return "continue";
  return "clear";
}

/** Linked memory bosses (Archivist): memorize → distract → recall. */
export function isLinkedMemoryBoss(boss: BossDefinition): boolean {
  return (
    boss.stages.some((s) => s.kind === "memorize") &&
    boss.stages.some((s) => s.kind === "recall")
  );
}

/** Linked memory bosses restart from memorize on any fail. */
export function bossRetryStageIndex(boss: BossDefinition): number {
  if (!isLinkedMemoryBoss(boss)) return -1;
  const memorizeIdx = boss.stages.findIndex((s) => s.kind === "memorize");
  return memorizeIdx >= 0 ? memorizeIdx : -1;
}

export function formatBossRetryAnnouncement(
  boss: BossDefinition,
  stageIndex: number
): string {
  const stage = boss.stages[stageIndex];
  const label = stage?.label ?? "challenge";
  const fromStart =
    bossRetryStageIndex(boss) === stageIndex && stage?.kind === "memorize";
  if (fromStart) {
    return `Retry — ${boss.name}: start over at ${label}`;
  }
  return `Retry — ${boss.name}: ${label}`;
}

export function formatBossStageAnnouncement(
  boss: BossDefinition,
  stageIndex: number
): string {
  const stage = boss.stages[stageIndex];
  const label = stage?.label ?? "challenge";
  const n = stageIndex + 1;
  const total = boss.stages.length;
  return `${boss.name} — Stage ${n}/${total}: ${label}`;
}

/**
 * Distinct puzzle family per boss stage so stage 2 is not a clone of stage 1.
 */
export function bossStageForceVariant(
  boss: BossDefinition,
  stageIndex: number
): string | undefined {
  const stage = boss.stages[stageIndex];
  if (!stage) return undefined;

  if (stage.kind === "memorize" || stage.kind === "recall") return "sequence";
  if (stage.kind === "solve") return undefined;

  switch (boss.id) {
    case "architect":
      return stageIndex === 0 ? "rotation" : "block-shift";
    case "logician":
      return stageIndex === 0 ? "symbol-pattern" : "conditional";
    case "calculator":
      return stageIndex === 0 ? "arithmetic" : "target";
    case "sentinel":
      return stageIndex === 0 ? "odd" : "rule-switch";
    case "mindforge":
      if (stage.category === "memory") return "sequence";
      if (stage.category === "logic") return "deduction-lite";
      if (stage.category === "spatial") return "transform";
      return undefined;
    default:
      return undefined;
  }
}
