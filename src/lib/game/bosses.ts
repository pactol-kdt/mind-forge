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
