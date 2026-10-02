import type {
  CombinedPuzzle,
  CombinedVariant,
  GenerateOptions,
  MemorySymbol,
  PuzzleEngine,
} from "@/types/puzzles";
import {
  MEMORY_SYMBOLS,
  MEMORY_SYMBOL_GLYPHS,
  engineScore,
  makeId,
  poolSize,
} from "./shared";
import { clamp, pickRandom, randomInt, shuffle } from "@/lib/game/utils";

function uniqueNumberChoices(correct: number, count: number): number[] {
  const set = new Set<number>([correct]);
  for (const d of [-3, -2, -1, 1, 2, 3, -5, 5, 4, -4]) {
    if (set.size >= count) break;
    set.add(correct + d);
  }
  while (set.size < count) set.add(correct + randomInt(-10, 10));
  const list = [correct, ...shuffle([...set].filter((n) => n !== correct)).slice(0, count - 1)];
  return shuffle(list);
}

function pickVariant(
  difficulty: number,
  options?: GenerateOptions
): CombinedVariant {
  if (options?.forceVariant) return options.forceVariant as CombinedVariant;
  const unlocked = options?.unlockedVariants ?? [];
  const pool: CombinedVariant[] = ["memory-math"];
  if (unlocked.includes("memory-logic") || difficulty >= 5)
    pool.push("memory-logic");
  if (unlocked.includes("attention-math") || difficulty >= 6)
    pool.push("attention-math");
  if (unlocked.includes("memory-spatial") || difficulty >= 8)
    pool.push("memory-spatial");
  if (unlocked.includes("attention-logic") || difficulty >= 7)
    pool.push("attention-logic");
  if (unlocked.includes("logic-math") || difficulty >= 7) pool.push("logic-math");
  if (unlocked.includes("spatial-logic") || difficulty >= 8)
    pool.push("spatial-logic");
  return pickRandom(pool);
}

function genMemorySpatial(
  difficulty: number,
  options?: GenerateOptions
): CombinedPuzzle {
  const size = 3;
  const source = Array(9).fill("·");
  const idx = randomInt(0, 8);
  source[idx] = "★";
  // rotate 90
  const mapped = (() => {
    const out = Array(9).fill("·");
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        out[c * 3 + (2 - r)] = source[r * 3 + c];
      }
    }
    return out;
  })();
  const end = mapped.indexOf("★");
  const choicesIdx = shuffle(
    [end, ...shuffle(Array.from({ length: 9 }, (_, i) => i).filter((i) => i !== end)).slice(0, 3)]
  );
  const correctLabel = `Cell ${end + 1}`;
  return {
    id: makeId("cmb"),
    type: "combined",
    variant: "memory-spatial",
    difficulty,
    displayDurationMs: 2800 + (options?.displayBonusMs ?? 0),
    sourceGrid: source,
    transform: "rotate90",
    targetSymbol: "★",
    spatialPrompt: "Memorize ★, then rotate 90° clockwise. Where is ★?",
    prompt: "Memorize ★ → rotate 90° → locate",
    correctAnswer: correctLabel,
    choices: choicesIdx.map((i) => `Cell ${i + 1}`),
    gridSize: size,
    timeLimit: Math.round(16000 * (1 + (options?.timeBonusPct ?? 0))),
    family: "memory-spatial",
  };
}

function genAttentionLogic(
  difficulty: number,
  options?: GenerateOptions
): CombinedPuzzle {
  const cells = Array(9).fill("○");
  const odd = randomInt(0, 8);
  cells[odd] = "●";
  const answer = (odd + 1) % 2 === 0 ? "even" : "odd";
  return {
    id: makeId("cmb"),
    type: "combined",
    variant: "attention-logic",
    difficulty,
    gridSize: 3,
    gridCells: cells,
    targetCell: "●",
    prompt: "Find ●. Is its cell number (1–9) odd or even?",
    detailLines: ["Cell numbers left-to-right, top-to-bottom."],
    correctAnswer: answer,
    choices: shuffle(["odd", "even", "neither", "both"]),
    timeLimit: Math.round(14000 * (1 + (options?.timeBonusPct ?? 0))),
    family: "attention-logic",
  };
}

function genLogicMath(
  difficulty: number,
  options?: GenerateOptions
): CombinedPuzzle {
  // Sequence 3,6,9,12 → rule +3 → next 15; then 15/3=5
  const next = 15;
  const correctAnswer = next / 3;
  return {
    id: makeId("cmb"),
    type: "combined",
    variant: "logic-math",
    difficulty,
    prompt: "Pattern 3, 6, 9, 12, ?. Then ÷ 3.",
    detailLines: ["Find next number, then divide by 3."],
    correctAnswer,
    choices: uniqueNumberChoices(correctAnswer, 4),
    timeLimit: Math.round(15000 * (1 + (options?.timeBonusPct ?? 0))),
    family: "logic-math",
  };
}

function genSpatialLogic(
  difficulty: number,
  options?: GenerateOptions
): CombinedPuzzle {
  return {
    id: makeId("cmb"),
    type: "combined",
    variant: "spatial-logic",
    difficulty,
    prompt: "Transform sequence: rotate → mirror → rotate → ?",
    detailLines: ["What comes next in the repeating pair?"],
    correctAnswer: "mirror",
    choices: shuffle(["mirror", "rotate", "flip-diag", "none"]),
    timeLimit: Math.round(14000 * (1 + (options?.timeBonusPct ?? 0))),
    family: "spatial-logic",
  };
}

function genMemoryMath(
  difficulty: number,
  options?: GenerateOptions
): CombinedPuzzle {
  const mapCount = clamp(2 + Math.floor(difficulty / 5), 2, 4);
  const pool = MEMORY_SYMBOLS.slice(0, Math.max(poolSize(difficulty), mapCount));
  const symbols = shuffle([...pool]).slice(0, mapCount) as MemorySymbol[];
  const used = new Set<number>();
  const mapping = symbols.map((symbol) => {
    let value = randomInt(2, 9 + Math.floor(difficulty / 3));
    while (used.has(value)) value = randomInt(2, 12 + difficulty);
    used.add(value);
    return { symbol, value };
  });
  const bySymbol = Object.fromEntries(
    mapping.map((m) => [m.symbol, m.value])
  ) as Record<MemorySymbol, number>;

  let expression: string;
  let correctAnswer: number;
  if (mapping.length >= 3 && difficulty >= 5) {
    const [a, b, c] = mapping;
    expression = `${a!.symbol} + ${b!.symbol} − ${c!.symbol}`;
    correctAnswer =
      bySymbol[a!.symbol] + bySymbol[b!.symbol] - bySymbol[c!.symbol];
  } else {
    const [a, b] = mapping;
    if (Math.random() < 0.5) {
      expression = `${a!.symbol} + ${b!.symbol}`;
      correctAnswer = bySymbol[a!.symbol] + bySymbol[b!.symbol];
    } else {
      expression = `${a!.symbol} × ${b!.symbol}`;
      correctAnswer = bySymbol[a!.symbol] * bySymbol[b!.symbol];
    }
  }

  return {
    id: makeId("cmb"),
    type: "combined",
    variant: "memory-math",
    difficulty,
    mapping,
    expression,
    displayDurationMs:
      clamp(3500 - difficulty * 80, 2200, 4000) + (options?.displayBonusMs ?? 0),
    correctAnswer,
    choices: uniqueNumberChoices(correctAnswer, 4),
    timeLimit: Math.round(
      clamp(12000 + difficulty * 400, 10000, 20000) *
        (1 + (options?.timeBonusPct ?? 0))
    ),
  };
}

function genMemoryLogic(
  difficulty: number,
  options?: GenerateOptions
): CombinedPuzzle {
  const seq = shuffle(["▲", "●", "■", "◆"]).slice(0, 3);
  const next = seq[0]!; // alternating rule after memorize: repeat first
  return {
    id: makeId("cmb"),
    type: "combined",
    variant: "memory-logic",
    difficulty,
    rememberedSequence: seq,
    displayDurationMs: 3000 + (options?.displayBonusMs ?? 0),
    prompt: "Memorize the order, then choose what continues the alternation pattern (repeat first).",
    expression: `${seq.join(" ")} ?`,
    correctAnswer: next,
    choices: shuffle([next, ...shuffle(["▲", "●", "■", "◆"]).filter((s) => s !== next)].slice(0, 4)),
    timeLimit: Math.round(14000 * (1 + (options?.timeBonusPct ?? 0))),
  };
}

function genAttentionMath(
  difficulty: number,
  options?: GenerateOptions
): CombinedPuzzle {
  const gridSize = 3;
  const cells = Array(gridSize * gridSize).fill("○");
  const targetIndex = randomInt(0, gridSize * gridSize - 1);
  cells[targetIndex] = "●";
  const targetValue = targetIndex + 1;
  const addend = randomInt(2, 6);
  const correctAnswer = targetValue + addend;
  return {
    id: makeId("cmb"),
    type: "combined",
    variant: "attention-math",
    difficulty,
    gridSize,
    gridCells: cells,
    targetCell: "●",
    mathPrompt: `Find ● (cell number 1–${gridSize * gridSize}). Then compute cell# + ${addend}.`,
    prompt: `Find ● then add ${addend}`,
    correctAnswer,
    choices: uniqueNumberChoices(correctAnswer, 4),
    timeLimit: Math.round(16000 * (1 + (options?.timeBonusPct ?? 0))),
  };
}

export const combinedEngine: PuzzleEngine<CombinedPuzzle, number | string> = {
  generate(difficulty: number, options?: GenerateOptions): CombinedPuzzle {
    const variant = pickVariant(difficulty, options);
    if (variant === "memory-logic") return genMemoryLogic(difficulty, options);
    if (variant === "attention-math")
      return genAttentionMath(difficulty, options);
    if (variant === "memory-spatial")
      return genMemorySpatial(difficulty, options);
    if (variant === "attention-logic")
      return genAttentionLogic(difficulty, options);
    if (variant === "logic-math") return genLogicMath(difficulty, options);
    if (variant === "spatial-logic") return genSpatialLogic(difficulty, options);
    return genMemoryMath(difficulty, options);
  },

  validate(puzzle, answer) {
    return answer === puzzle.correctAnswer;
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

export function formatCombinedAnswer(puzzle: CombinedPuzzle): string {
  if (typeof puzzle.correctAnswer === "string") {
    return (
      MEMORY_SYMBOL_GLYPHS[
        puzzle.correctAnswer as keyof typeof MEMORY_SYMBOL_GLYPHS
      ] ?? puzzle.correctAnswer
    );
  }
  return String(puzzle.correctAnswer);
}

export { MEMORY_SYMBOL_GLYPHS };
