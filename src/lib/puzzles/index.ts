import type {
  CategoryDifficultyMap,
  FloorType,
  SpecialModifier,
} from "@/types/game";
import type {
  GenerateOptions,
  MemorySymbol,
  Puzzle,
  PuzzleAnswer,
  PuzzleType,
} from "@/types/puzzles";
import { getBoss, bossStageForceVariant, isLinkedMemoryBoss } from "@/lib/game/bosses";
import { selectPuzzleType } from "@/lib/game/puzzleSelector";
import { applyDifficultyDelta } from "@/lib/game/adaptiveDifficulty";
import {
  getHighRisk,
  getLogicSpatialTimeBonus,
  getMemoryDisplayBonusMs,
  getTimeBonusPct,
} from "@/lib/game/upgrades";
import type { ActiveUpgrade } from "@/types/game";
import { clamp } from "@/lib/game/utils";
import { MIN_DIFFICULTY, MAX_DIFFICULTY } from "@/types/game";
import { attentionEngine, formatAttentionAnswer } from "./attention";
import { combinedEngine, formatCombinedAnswer } from "./combined";
import { formatMathAnswer, mathEngine } from "./math";
import { formatMemoryAnswer, memoryEngine } from "./memory";
import { formatLogicAnswer, logicEngine } from "./logic";
import { formatSpatialAnswer, spatialEngine } from "./spatial";

export interface GeneratePuzzleContext {
  floor: number;
  floorType: FloorType;
  recentTypes: PuzzleType[];
  categoryDifficulty: CategoryDifficultyMap;
  upgrades: ActiveUpgrade[];
  specialModifier: SpecialModifier | null;
  forceCategory?: PuzzleType;
  unlockedVariants?: string[];
  timerMultiplier?: number;
  difficultyDelta?: number;
  categoryWeightBoost?: Partial<Record<PuzzleType, number>>;
  forceCategoryShare?: { category: PuzzleType; share: number };
  combinedBias?: number;
  rng?: import("@/lib/game/seededRandom").Rng;
  eliteType?: string;
  recentFamilies?: string[];
  seed?: string;
  challengeId?: string;
  familyStats?: Record<string, { accuracy: number; attempts: number }>;
  /** Boss stage kind (Archivist memorize / solve / recall). */
  bossStageKind?: import("@/lib/game/bosses").BossStageKind;
  bossId?: string;
  bossStageIndex?: number;
  bossMemory?: {
    sequence: MemorySymbol[];
    symbolPool: MemorySymbol[];
  };
}

export function generatePuzzle(ctx: GeneratePuzzleContext): Puzzle {
  const forceMemory =
    ctx.specialModifier === "memory-trial" || ctx.eliteType === "perfect-recall";
  const type = selectPuzzleType(ctx.recentTypes, {
    floor: ctx.floor,
    floorType: ctx.floorType,
    forceMemory,
    forceCategory:
      ctx.forceCategory ??
      (ctx.eliteType === "logic-chain"
        ? "logic"
        : ctx.eliteType === "spatial-shift"
          ? "spatial"
          : undefined),
    unlockedVariants: ctx.unlockedVariants,
    categoryWeightBoost: ctx.categoryWeightBoost,
    forceCategoryShare: ctx.forceCategoryShare,
    combinedBias: ctx.combinedBias,
    rng: ctx.rng,
  });

  const highRisk = getHighRisk(ctx.upgrades);
  const difficulties = highRisk.difficultyDelta
    ? applyDifficultyDelta(ctx.categoryDifficulty, highRisk.difficultyDelta)
    : ctx.categoryDifficulty;

  let difficulty = clamp(
    (difficulties[type] ?? 1) + (ctx.difficultyDelta ?? 0),
    MIN_DIFFICULTY,
    MAX_DIFFICULTY
  );

  if (ctx.floorType === "boss" || ctx.floorType === "elite") {
    difficulty = clamp(difficulty + 2, MIN_DIFFICULTY, MAX_DIFFICULTY);
  }
  if (ctx.specialModifier === "memory-trial" || ctx.eliteType === "perfect-recall") {
    difficulty = clamp(difficulty + 2, MIN_DIFFICULTY, MAX_DIFFICULTY);
  }
  if (ctx.specialModifier === "recovery") {
    difficulty = clamp(difficulty - 2, MIN_DIFFICULTY, MAX_DIFFICULTY);
  }

  let timeBonusPct = getTimeBonusPct(ctx.upgrades);
  if (type === "logic" || type === "spatial") {
    timeBonusPct += getLogicSpatialTimeBonus(ctx.upgrades);
  }
  if (ctx.specialModifier === "speed-trial" || ctx.eliteType === "rapid-fire") {
    timeBonusPct -= 0.35;
  }
  if (ctx.specialModifier === "perfect-mind") {
    timeBonusPct += 0.05;
  }
  // Global timer multiplier from challenge/difficulty
  if (ctx.timerMultiplier != null && ctx.timerMultiplier !== 1) {
    timeBonusPct += ctx.timerMultiplier - 1;
  }

  const unlocked = ctx.unlockedVariants ?? [];

  // Elite / boss family overrides
  let forceVariant = optionsForce(ctx, type);
  if (ctx.eliteType === "logic-chain") forceVariant = forceVariant ?? "conditional";
  if (ctx.eliteType === "spatial-shift") forceVariant = forceVariant ?? "block-shift";
  if (ctx.eliteType === "perfect-recall") forceVariant = "interference";

  const boss = ctx.bossId ? getBoss(ctx.bossId) : undefined;
  const stageIndex = ctx.bossStageIndex ?? 0;
  const linkedMemory = Boolean(boss && isLinkedMemoryBoss(boss));
  const archivistMemorize = linkedMemory && ctx.bossStageKind === "memorize";
  const archivistRecall = linkedMemory && ctx.bossStageKind === "recall";

  // Per-stage boss variants (Architect rotation → block-shift, etc.)
  if (boss && ctx.floorType === "boss") {
    const stageVariant = bossStageForceVariant(boss, stageIndex);
    if (stageVariant) forceVariant = stageVariant;
  }
  if (archivistMemorize || archivistRecall) {
    forceVariant = "sequence";
  }

  // When a stage forces a family, don't also force generic "boss" variant via floorType
  const useBossFloorType =
    ctx.floorType === "boss" &&
    !forceVariant &&
    !archivistMemorize &&
    !archivistRecall;

  const options: GenerateOptions = {
    displayBonusMs: getMemoryDisplayBonusMs(ctx.upgrades),
    timeBonusPct,
    unlockedVariants: unlocked,
    seed: ctx.seed,
    floor: ctx.floor,
    recentFamilies: ctx.recentFamilies,
    eliteType: ctx.eliteType,
    challengeId: ctx.challengeId,
    floorType: archivistMemorize || archivistRecall
      ? "special"
      : useBossFloorType
        ? "boss"
        : ctx.specialModifier === "memory-trial" || ctx.eliteType === "perfect-recall"
          ? "special"
          : ctx.floorType === "special" || ctx.floorType === "elite"
            ? "special"
            : "normal",
    forceVariant,
    memorizeOnly: archivistMemorize || undefined,
    sharedSequence: archivistRecall ? ctx.bossMemory?.sequence : undefined,
    sharedSymbolPool: archivistRecall ? ctx.bossMemory?.symbolPool : undefined,
  };

  const engineMap = {
    memory: () => memoryEngine.generate(difficulty, options),
    attention: () => attentionEngine.generate(difficulty, options),
    math: () => mathEngine.generate(difficulty, options),
    logic: () => logicEngine.generate(difficulty, options),
    spatial: () => spatialEngine.generate(difficulty, options),
    combined: () => combinedEngine.generate(difficulty, options),
  } as const;

  return ensurePlayableTimeLimit(engineMap[type]());
}

function optionsForce(
  ctx: GeneratePuzzleContext,
  type: PuzzleType
): string | undefined {
  const boss = ctx.bossId ? getBoss(ctx.bossId) : undefined;
  const linked = Boolean(boss && isLinkedMemoryBoss(boss));
  // Linked Archivist memory stages are sequence, not nested boss puzzles
  if (
    linked &&
    (ctx.bossStageKind === "memorize" || ctx.bossStageKind === "recall")
  ) {
    return "sequence";
  }
  // Prefer per-stage variants over generic memory-boss
  if (boss && ctx.floorType === "boss") {
    const stageVariant = bossStageForceVariant(boss, ctx.bossStageIndex ?? 0);
    if (stageVariant) return stageVariant;
  }
  if (ctx.floorType === "boss" && type === "memory") return "boss";
  if (ctx.specialModifier === "memory-trial") return "reverse";
  return undefined;
}

/** Ensure timers never collapse to 0/NaN (which hides the bar and blocks timeout). */
export function ensurePlayableTimeLimit(puzzle: Puzzle): Puzzle {
  // Memorize-only Archivist stage has no answer timer
  if (puzzle.type === "memory" && puzzle.memorizeOnly) {
    return { ...puzzle, timeLimit: undefined };
  }
  const minMs = 6000;
  if (
    puzzle.timeLimit == null ||
    !Number.isFinite(puzzle.timeLimit) ||
    puzzle.timeLimit < minMs
  ) {
    return { ...puzzle, timeLimit: minMs };
  }
  return puzzle;
}

export function validateAnswer(puzzle: Puzzle, answer: PuzzleAnswer): boolean {
  switch (puzzle.type) {
    case "memory":
      return memoryEngine.validate(
        puzzle,
        answer as MemorySymbol[] | MemorySymbol | number
      );
    case "attention":
      return attentionEngine.validate(
        puzzle,
        answer as number | number[] | string
      );
    case "math":
      return mathEngine.validate(puzzle, answer as number | string);
    case "logic":
      return logicEngine.validate(puzzle, answer as string);
    case "spatial":
      return spatialEngine.validate(puzzle, answer as number);
    case "combined":
      return combinedEngine.validate(puzzle, answer as number | string);
  }
}

export function scoreAnswer(
  puzzle: Puzzle,
  answer: PuzzleAnswer,
  responseTimeMs: number
): number {
  switch (puzzle.type) {
    case "memory":
      return memoryEngine.calculateScore(
        puzzle,
        answer as MemorySymbol[] | MemorySymbol | number,
        responseTimeMs
      );
    case "attention":
      return attentionEngine.calculateScore(
        puzzle,
        answer as number | number[] | string,
        responseTimeMs
      );
    case "math":
      return mathEngine.calculateScore(
        puzzle,
        answer as number | string,
        responseTimeMs
      );
    case "logic":
      return logicEngine.calculateScore(puzzle, answer as string, responseTimeMs);
    case "spatial":
      return spatialEngine.calculateScore(
        puzzle,
        answer as number,
        responseTimeMs
      );
    case "combined":
      return combinedEngine.calculateScore(
        puzzle,
        answer as number | string,
        responseTimeMs
      );
  }
}

export function formatCorrectAnswer(puzzle: Puzzle): string {
  switch (puzzle.type) {
    case "memory":
      return formatMemoryAnswer(puzzle);
    case "attention":
      return formatAttentionAnswer(puzzle);
    case "math":
      return formatMathAnswer(puzzle);
    case "logic":
      return formatLogicAnswer(puzzle);
    case "spatial":
      return formatSpatialAnswer(puzzle);
    case "combined":
      return formatCombinedAnswer(puzzle);
  }
}

export function puzzleInitialPhase(
  puzzle: Puzzle
): "presenting" | "answering" {
  if (puzzle.type === "memory") {
    if (puzzle.skipPresenting) return "answering";
    return "presenting";
  }
  if (puzzle.type === "combined") {
    if (
      puzzle.variant === "memory-math" ||
      puzzle.variant === "memory-logic" ||
      puzzle.variant === "memory-spatial"
    ) {
      return "presenting";
    }
  }
  if (puzzle.type === "spatial" && puzzle.variant === "path-trace") {
    return "presenting";
  }
  return "answering";
}
