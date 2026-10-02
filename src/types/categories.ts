import type { PuzzleType } from "./puzzles";

export const CORE_CATEGORIES = [
  "memory",
  "attention",
  "math",
  "logic",
  "spatial",
  "combined",
] as const satisfies readonly PuzzleType[];

export type CoreCategory = (typeof CORE_CATEGORIES)[number];

export interface CategoryMeta {
  id: PuzzleType;
  label: string;
  shortLabel: string;
  baseWeight: number;
  description: string;
}

export const CATEGORY_CONFIG: Record<PuzzleType, CategoryMeta> = {
  memory: {
    id: "memory",
    label: "Memory",
    shortLabel: "Memory",
    baseWeight: 20,
    description: "Sequence and recall challenges",
  },
  attention: {
    id: "attention",
    label: "Attention",
    shortLabel: "Attention",
    baseWeight: 20,
    description: "Focus and odd-one-out challenges",
  },
  math: {
    id: "math",
    label: "Mental Math",
    shortLabel: "Math",
    baseWeight: 18,
    description: "Arithmetic and number challenges",
  },
  logic: {
    id: "logic",
    label: "Logic",
    shortLabel: "Logic",
    baseWeight: 16,
    description: "Patterns and reasoning challenges",
  },
  spatial: {
    id: "spatial",
    label: "Spatial",
    shortLabel: "Spatial",
    baseWeight: 16,
    description: "Rotation and spatial challenges",
  },
  combined: {
    id: "combined",
    label: "Combined",
    shortLabel: "Combined",
    baseWeight: 10,
    description: "Multi-skill challenges",
  },
};

export const STANDARD_TRAINING_CATEGORIES: PuzzleType[] = [
  "memory",
  "attention",
  "math",
  "logic",
  "spatial",
];

export function emptyCategoryRecord<T>(factory: () => T): Record<PuzzleType, T> {
  return {
    memory: factory(),
    attention: factory(),
    math: factory(),
    logic: factory(),
    spatial: factory(),
    combined: factory(),
  };
}
