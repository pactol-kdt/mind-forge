import type {
  AttentionPuzzle,
  AttentionVariant,
  GenerateOptions,
  PuzzleEngine,
} from "@/types/puzzles";
import { engineScore, makeId } from "./shared";
import { clamp } from "@/lib/game/utils";
import { createPuzzleRng } from "./rngBridge";
import {
  createPuzzleSignature,
  ok,
  validateGrid,
  validateUniqueChoices,
  withRetries,
} from "./validation";
import { getFamilyMeta } from "./registry";
import { applyFamilyDifficultyAdjust, selectPuzzleFamily } from "./familySelector";

const SYMBOL_PAIRS: [string, string][] = [
  ["○", "●"],
  ["□", "■"],
  ["△", "▲"],
  ["◇", "◆"],
  ["☆", "★"],
  ["◯", "◉"],
  ["◐", "◑"],
  ["⬡", "⬢"],
];

const ARROWS = ["↑", "↓", "←", "→"] as const;
const CHEVRONS = ["︿", "﹀", "‹", "›"] as const;
const STROOP_COLORS = [
  { name: "Blue", css: "text-sky-400" },
  { name: "Red", css: "text-rose-400" },
  { name: "Green", css: "text-emerald-400" },
  { name: "Amber", css: "text-amber-400" },
] as const;

export const STROOP_COLOR_CLASS: Record<string, string> = Object.fromEntries(
  STROOP_COLORS.map((c) => [c.name, c.css])
);

function gridSizeForDifficulty(difficulty: number): number {
  if (difficulty <= 3) return 3;
  if (difficulty <= 8) return 4;
  if (difficulty <= 14) return 5;
  return 6;
}

function pickVariant(difficulty: number, options?: GenerateOptions): AttentionVariant {
  if (options?.forceVariant) return options.forceVariant as AttentionVariant;
  const rng = createPuzzleRng(options?.seed, "att-family", options?.floor ?? 0, difficulty);
  return selectPuzzleFamily("attention", {
    difficulty,
    floor: options?.floor ?? 1,
    unlockedFamilies: options?.unlockedVariants ?? ["odd", "direction", "stroop"],
    floorType: options?.floorType,
    eliteType: options?.eliteType,
    rng,
    recentFamilies: options?.recentFamilies ?? [],
    preferFast: options?.challengeId === "blitz",
    avoidMultiStage: options?.challengeId === "blitz",
  }) as AttentionVariant;
}

function attach(p: AttentionPuzzle): AttentionPuzzle {
  const meta = getFamilyMeta(p.variant);
  return {
    ...p,
    family: p.variant,
    tags: meta?.tags,
    signature: createPuzzleSignature([
      "attention",
      p.variant,
      p.difficulty,
      p.cells.join(""),
      p.targetIndex ?? "",
      p.correctCount ?? "",
      p.correctChoice ?? "",
    ]),
  };
}

function buildOdd(difficulty: number, options?: GenerateOptions): AttentionPuzzle {
  const rng = createPuzzleRng(options?.seed, "odd", options?.floor ?? 0, difficulty);
  const gridSize = gridSizeForDifficulty(difficulty);
  const [normal, target] = rng.pick(SYMBOL_PAIRS);
  const cells = Array.from({ length: gridSize * gridSize }, () => normal);
  const targetIndex = rng.int(0, cells.length - 1);
  cells[targetIndex] = target;
  const timeBonusPct = options?.timeBonusPct ?? 0;
  return attach({
    id: makeId("att"),
    type: "attention",
    variant: "odd",
    difficulty,
    gridSize,
    cells,
    targetIndex,
    normalSymbol: normal,
    targetSymbol: target,
    timeLimit: Math.round(
      clamp(10000 + cells.length * 400 - difficulty * 200, 6000, 18000) *
        (1 + timeBonusPct)
    ),
  });
}

function buildAttention(
  difficulty: number,
  variant: AttentionVariant,
  options?: GenerateOptions
): AttentionPuzzle {
  const rng = createPuzzleRng(options?.seed, "att", variant, options?.floor ?? 0, difficulty);
  const timeBonusPct = options?.timeBonusPct ?? 0;

  if (variant === "stroop") {
    const word = rng.pick([...STROOP_COLORS]);
    let color = rng.pick([...STROOP_COLORS]);
    if (difficulty >= 4) {
      while (color.name === word.name) color = rng.pick([...STROOP_COLORS]);
    }
    const ask = rng() < 0.5 ? "word" : "color";
    const correct = ask === "word" ? word.name : color.name;
    const choices = rng
      .shuffle([...new Set([correct, word.name, color.name, rng.pick([...STROOP_COLORS]).name])])
      .slice(0, 4);
    while (choices.length < 4) {
      const n = rng.pick([...STROOP_COLORS]).name;
      if (!choices.includes(n)) choices.push(n);
    }
    return attach({
      id: makeId("att"),
      type: "attention",
      variant,
      difficulty,
      gridSize: 1,
      cells: [],
      stroopWord: word.name,
      stroopColor: color.name,
      stroopAsk: ask,
      stroopChoices: choices,
      correctChoice: correct,
      timeLimit: Math.round(9000 * (1 + timeBonusPct)),
      prompt: ask === "word" ? "Choose the WORD" : "Choose the DISPLAY COLOR",
    });
  }

  if (variant === "direction") {
    const gridSize = gridSizeForDifficulty(difficulty);
    const pool = difficulty >= 10 ? [...ARROWS, ...CHEVRONS] : [...ARROWS];
    const normal = rng.pick(pool);
    let odd = rng.pick(pool);
    while (odd === normal) odd = rng.pick(pool);
    const cells = Array.from({ length: gridSize * gridSize }, () => normal);
    const targetIndex = rng.int(0, cells.length - 1);
    cells[targetIndex] = odd;
    return attach({
      id: makeId("att"),
      type: "attention",
      variant,
      difficulty,
      gridSize,
      cells,
      targetIndex,
      timeLimit: Math.round(
        clamp(9000 + cells.length * 350 - difficulty * 180, 5500, 16000) *
          (1 + timeBonusPct)
      ),
      prompt: "Find the mismatched direction",
    });
  }

  if (variant === "find-two" || variant === "multi-target") {
    const gridSize = gridSizeForDifficulty(difficulty);
    const [normal, target] = rng.pick(SYMBOL_PAIRS);
    const cells = Array.from({ length: gridSize * gridSize }, () => normal);
    const count =
      variant === "multi-target"
        ? clamp(2 + Math.floor(difficulty / 5), 2, 5)
        : 2;
    const indices = rng.shuffle(Array.from({ length: cells.length }, (_, i) => i)).slice(0, count);
    for (const i of indices) cells[i] = target;
    return attach({
      id: makeId("att"),
      type: "attention",
      variant,
      difficulty,
      gridSize,
      cells,
      targetIndices: indices.sort((a, b) => a - b),
      normalSymbol: normal,
      targetSymbol: target,
      timeLimit: Math.round(
        clamp(11000 + cells.length * 400 - difficulty * 150, 7000, 20000) *
          (1 + timeBonusPct)
      ),
      prompt: variant === "multi-target" ? `Tap every ${target}` : "Find both targets",
    });
  }

  if (variant === "symbol-count") {
    const gridSize = gridSizeForDifficulty(Math.min(difficulty, 12));
    const [normal, target] = rng.pick(SYMBOL_PAIRS);
    const cells = Array.from({ length: gridSize * gridSize }, () => normal);
    const count = rng.int(2, Math.min(6, Math.floor(cells.length / 3)));
    const indices = rng.shuffle(Array.from({ length: cells.length }, (_, i) => i)).slice(0, count);
    for (const i of indices) cells[i] = target;
    const choices = rng.shuffle(
      [...new Set([count, count + 1, Math.max(1, count - 1), count + 2])]
    ).slice(0, 4);
    while (choices.length < 4) {
      const n = count + rng.int(-3, 3);
      if (n > 0 && !choices.includes(n)) choices.push(n);
    }
    return attach({
      id: makeId("att"),
      type: "attention",
      variant,
      difficulty,
      gridSize,
      cells,
      countPromptSymbol: target,
      correctCount: count,
      countChoices: choices,
      timeLimit: Math.round(12000 * (1 + timeBonusPct)),
      prompt: `How many ${target} symbols?`,
    });
  }

  if (variant === "alternating") {
    const gridSize = 4;
    const a = "▲";
    const b = "●";
    const cells = Array.from({ length: 16 }, () => rng.pick(["○", "□", "◇", a, b]));
    // Place a short alternating path of indices to tap
    const order = [a, b, a, b];
    const targetIndices: number[] = [];
    for (const sym of order) {
      let idx = rng.int(0, 15);
      let guard = 0;
      while ((cells[idx] !== sym || targetIndices.includes(idx)) && guard++ < 40) {
        idx = rng.int(0, 15);
      }
      cells[idx] = sym;
      targetIndices.push(idx);
    }
    return attach({
      id: makeId("att"),
      type: "attention",
      variant,
      difficulty,
      gridSize,
      cells,
      targetIndices,
      alternateOrder: order,
      timeLimit: Math.round(14000 * (1 + timeBonusPct)),
      prompt: "Tap ▲ then ● then ▲ then ●",
    });
  }

  if (variant === "rule-switch") {
    const stages = [0, 1, 2].map((stage) => {
      const gridSize = 3;
      const [normal, target] = rng.pick(SYMBOL_PAIRS);
      const cells = Array.from({ length: 9 }, () => normal);
      const targetIndex = rng.int(0, 8);
      cells[targetIndex] = target;
      const oddPrompt = stage !== 1;
      return {
        prompt: oddPrompt ? "Choose the odd shape" : "Choose a matching shape",
        cells: oddPrompt
          ? cells
          : (() => {
              // matching: all same except one different; pick a matching (majority) cell
              const majority = cells.map(() => normal);
              majority[targetIndex] = target;
              return majority;
            })(),
        targetIndex: oddPrompt
          ? targetIndex
          : (() => {
              const majors = cells
                .map((c, i) => (c === normal ? i : -1))
                .filter((i) => i >= 0);
              return majors[0] ?? 0;
            })(),
      };
    });
    // Fix stage 1 properly for matching
    {
      const [normal, target] = rng.pick(SYMBOL_PAIRS);
      const cells = Array.from({ length: 9 }, () => normal);
      const odd = rng.int(0, 8);
      cells[odd] = target;
      const matchIdx = cells.findIndex((c, i) => c === normal && i !== odd) ;
      stages[1] = {
        prompt: "Choose a matching shape (majority)",
        cells,
        targetIndex: matchIdx >= 0 ? matchIdx : 0,
      };
    }
    return attach({
      id: makeId("att"),
      type: "attention",
      variant,
      difficulty,
      gridSize: 3,
      cells: stages[0]!.cells,
      targetIndex: stages[0]!.targetIndex,
      ruleStages: stages,
      currentRuleStage: 0,
      timeLimit: Math.round(18000 * (1 + timeBonusPct)),
      prompt: stages[0]!.prompt,
    });
  }

  return buildOdd(difficulty, options);
}

export const attentionEngine: PuzzleEngine<
  AttentionPuzzle,
  number | number[] | string
> = {
  generate(difficulty, options) {
    const variant = pickVariant(difficulty, options);
    const adj = applyFamilyDifficultyAdjust(
      variant,
      difficulty + (options?.familyDifficultyAdjust ?? 0)
    );
    return withRetries(
      () => buildAttention(adj, variant, options),
      (p) => {
        if (p.variant === "stroop") {
          return validateUniqueChoices(p.stroopChoices ?? [], p.correctChoice ?? "");
        }
        if (p.variant === "symbol-count") {
          return validateUniqueChoices(p.countChoices ?? [], p.correctCount ?? -1);
        }
        if (p.cells.length) {
          const g = validateGrid(p.cells, p.gridSize);
          if (!g.valid) return g;
        }
        return ok();
      },
      8,
      () => buildOdd(adj, options)
    );
  },

  validate(puzzle, answer) {
    if (puzzle.variant === "stroop") return answer === puzzle.correctChoice;
    if (puzzle.variant === "symbol-count") return answer === puzzle.correctCount;
    if (
      puzzle.variant === "find-two" ||
      puzzle.variant === "multi-target" ||
      puzzle.variant === "alternating"
    ) {
      if (!Array.isArray(answer) || !puzzle.targetIndices) return false;
      const a = [...answer].sort((x, y) => x - y);
      const b = [...puzzle.targetIndices].sort((x, y) => x - y);
      return a.length === b.length && a.every((v, i) => v === b[i]);
    }
    if (puzzle.variant === "rule-switch") {
      return answer === puzzle.targetIndex;
    }
    return answer === puzzle.targetIndex;
  },

  calculateScore(puzzle, answer, responseTimeMs) {
    return engineScore(
      puzzle.difficulty,
      responseTimeMs,
      puzzle.timeLimit,
      this.validate(puzzle, answer)
    );
  },
};

export function formatAttentionAnswer(puzzle: AttentionPuzzle): string {
  if (puzzle.variant === "stroop") return puzzle.correctChoice ?? "";
  if (puzzle.variant === "symbol-count") return String(puzzle.correctCount);
  if (puzzle.targetIndices) {
    return puzzle.targetIndices.map((i) => `#${i + 1}`).join(", ");
  }
  return `Cell ${(puzzle.targetIndex ?? 0) + 1}`;
}
