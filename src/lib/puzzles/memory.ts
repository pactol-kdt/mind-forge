import type {
  GenerateOptions,
  MemoryPuzzle,
  MemorySymbol,
  MemoryVariant,
  PuzzleEngine,
} from "@/types/puzzles";
import {
  MEMORY_SYMBOLS,
  MEMORY_SYMBOL_GLYPHS,
  displayDurationMs,
  engineScore,
  generateSequence,
  makeId,
  poolSize,
  sequenceLength,
} from "./shared";
import { clamp } from "@/lib/game/utils";
import { createPuzzleRng } from "./rngBridge";
import {
  createPuzzleSignature,
  ok,
  validateUniqueChoices,
  withRetries,
  type PuzzleValidationResult,
} from "./validation";
import { getFamilyMeta } from "./registry";
import { selectPuzzleFamily, applyFamilyDifficultyAdjust } from "./familySelector";

export { MEMORY_SYMBOLS, MEMORY_SYMBOL_GLYPHS };

function pickVariant(
  difficulty: number,
  options?: GenerateOptions
): MemoryVariant {
  if (options?.forceVariant) return options.forceVariant as MemoryVariant;
  if (options?.floorType === "boss") return "boss";

  const rng = createPuzzleRng(options?.seed, "mem-family", options?.floor ?? 0, difficulty);
  const unlocked = options?.unlockedVariants ?? [
    "sequence",
    "reverse",
    "missing",
    "position",
    "chunk",
  ];
  return selectPuzzleFamily("memory", {
    difficulty,
    floor: options?.floor ?? 1,
    unlockedFamilies: unlocked,
    floorType: options?.floorType,
    eliteType: options?.eliteType,
    rng,
    recentFamilies: options?.recentFamilies ?? [],
  }) as MemoryVariant;
}

function makeDistraction(rng: ReturnType<typeof createPuzzleRng>) {
  const a = rng.int(2, 9);
  const b = rng.int(2, 9);
  const op = rng.pick(["+", "−", "×"] as const);
  let answer = a + b;
  let expression = `${a} + ${b}`;
  if (op === "−") {
    const left = Math.max(a, b);
    const right = Math.min(a, b);
    answer = left - right;
    expression = `${left} − ${right}`;
  } else if (op === "×") {
    answer = a * b;
    expression = `${a} × ${b}`;
  }
  const pool = [answer + 1, answer - 1, answer + 2, answer - 2, answer + a, answer * 2]
    .filter((n) => n !== answer);
  const distractors: number[] = [];
  for (const n of rng.shuffle(pool)) {
    if (!distractors.includes(n)) distractors.push(n);
    if (distractors.length >= 3) break;
  }
  while (distractors.length < 3) {
    const n = answer + rng.int(-8, 8);
    if (n !== answer && !distractors.includes(n)) distractors.push(n);
  }
  return {
    expression,
    correctAnswer: answer,
    choices: rng.shuffle([answer, ...distractors.slice(0, 3)]),
  };
}

function attachMeta(p: MemoryPuzzle): MemoryPuzzle {
  const meta = getFamilyMeta(p.variant);
  return {
    ...p,
    family: p.variant,
    tags: meta?.tags,
    signature: createPuzzleSignature([
      "memory",
      p.variant,
      p.difficulty,
      p.sequence.join(","),
      p.missingIndex ?? "",
      p.correctIndex ?? "",
      p.correctChunkIndex ?? "",
    ]),
    estimatedComplexity:
      p.sequence.length + (p.variant === "interference" ? 2 : 0) + Math.floor(p.difficulty / 5),
  };
}

function validateMemory(p: MemoryPuzzle): PuzzleValidationResult {
  if (!p.sequence.length) return { valid: false, errors: ["Empty sequence"] };
  if (p.variant === "missing" && p.missingIndex == null)
    return { valid: false, errors: ["Missing index required"] };
  if (p.variant === "position" && p.correctIndex == null)
    return { valid: false, errors: ["Position required"] };
  if (p.variant === "chunk" && p.chunkChoices) {
    return validateUniqueChoices(
      p.chunkChoices.map((c) => c.join("")),
      (p.chunkChoices[p.correctChunkIndex ?? 0] ?? []).join("")
    );
  }
  if (p.variant === "ordered-groups" && p.correctGroupIndex == null)
    return { valid: false, errors: ["Group index required"] };
  if (p.variant === "transform-recall" && !p.transformedSequence?.length)
    return { valid: false, errors: ["Transformed sequence required"] };
  if (p.variant === "interference" && !p.distraction)
    return { valid: false, errors: ["Distraction required"] };
  return ok();
}

function buildMemory(
  difficulty: number,
  variant: MemoryVariant,
  options?: GenerateOptions
): MemoryPuzzle {
  const rng = createPuzzleRng(
    options?.seed,
    "mem",
    variant,
    options?.floor ?? 0,
    difficulty
  );
  const size = poolSize(difficulty);
  const pool = options?.sharedSymbolPool?.length
    ? options.sharedSymbolPool
    : MEMORY_SYMBOLS.slice(0, size);
  let length = sequenceLength(difficulty);
  const hasDistraction = variant === "boss" || variant === "interference";
  // Boss: +1 length only at higher difficulty (not every boss)
  if (variant === "boss" && difficulty >= 12) {
    length = Math.min(8, length + 1);
  }
  // Distraction already loads working memory — shorten by 1 (min 3)
  if (hasDistraction) {
    length = Math.max(3, length - 1);
  }
  // Early bosses (floor ≤ 20): hard cap at 5 shapes
  const floor = options?.floor ?? 0;
  if (variant === "boss" && floor > 0 && floor <= 20) {
    length = Math.min(length, 5);
  }
  // Archivist multi-stage: same length rules as mild distraction (no nested boss)
  if (options?.memorizeOnly || options?.sharedSequence?.length) {
    length = Math.min(Math.max(3, length), floor > 0 && floor <= 20 ? 5 : 8);
  }
  let display =
    displayDurationMs(difficulty) + (options?.displayBonusMs ?? 0);
  if (hasDistraction || options?.memorizeOnly) {
    display += 600;
  }
  const timeBonus = options?.timeBonusPct ?? 0;
  const minTime = getFamilyMeta(variant)?.minTimeLimitMs ?? 8000;
  const baseLimit = clamp(12000 + length * 1500, minTime, 28000);
  const timeLimit = Math.max(minTime, Math.round(baseLimit * (1 + timeBonus)));
  const sequence =
    options?.sharedSequence?.length && options.sharedSequence.length >= 3
      ? options.sharedSequence
      : Array.from({ length }, () => rng.pick(pool));

  if (variant === "missing") {
    const twoMissing = difficulty >= 12;
    if (twoMissing) {
      const i1 = rng.int(0, sequence.length - 1);
      let i2 = rng.int(0, sequence.length - 1);
      while (i2 === i1) i2 = rng.int(0, sequence.length - 1);
      return attachMeta({
        id: makeId("mem"),
        type: "memory",
        variant,
        difficulty,
        sequence,
        symbolPool: pool,
        displayDurationMs: display,
        timeLimit,
        missingIndex: i1,
        missingIndices: [i1, i2].sort((a, b) => a - b),
        prompt: "Which symbol was missing? (pick one)",
      });
    }
    const missingIndex = rng.int(0, sequence.length - 1);
    return attachMeta({
      id: makeId("mem"),
      type: "memory",
      variant,
      difficulty,
      sequence,
      symbolPool: pool,
      displayDurationMs: display,
      timeLimit,
      missingIndex,
    });
  }

  if (variant === "position") {
    const gridSize = difficulty >= 14 ? 5 : difficulty >= 10 ? 4 : 3;
    const cellCount = gridSize * gridSize;
    const count = Math.min(length, Math.max(3, Math.floor(cellCount / 2)));
    const indices = rng.shuffle(Array.from({ length: cellCount }, (_, i) => i)).slice(0, count);
    const positions = indices.map((index, i) => ({
      symbol: sequence[i % sequence.length]!,
      index,
    }));
    const prompt = rng.pick(positions);
    return attachMeta({
      id: makeId("mem"),
      type: "memory",
      variant,
      difficulty,
      sequence: positions.map((p) => p.symbol),
      symbolPool: pool,
      displayDurationMs: display + 500,
      timeLimit,
      gridSize,
      positions,
      promptSymbol: prompt.symbol,
      correctIndex: prompt.index,
    });
  }

  if (variant === "chunk") {
    const chunkCount = difficulty >= 12 ? 4 : 3;
    const chunkLen = difficulty >= 10 ? 3 : 2;
    const chunks: string[][] = [];
    const seen = new Set<string>();
    let guard = 0;
    while (chunks.length < chunkCount && guard++ < 40) {
      const next = Array.from(
        { length: chunkLen },
        () => MEMORY_SYMBOL_GLYPHS[rng.pick(pool)]
      );
      const key = next.join("");
      if (seen.has(key)) continue;
      seen.add(key);
      chunks.push(next);
    }
    while (chunks.length < chunkCount) {
      chunks.push(
        Array.from({ length: chunkLen }, (_, i) =>
          MEMORY_SYMBOL_GLYPHS[pool[i % pool.length]!]
        )
      );
    }
    const correctChunkIndex = rng.int(0, chunks.length - 1);
    const correct = chunks[correctChunkIndex]!;
    const choiceSet = new Map<string, string[]>();
    choiceSet.set(correct.join(""), correct);
    for (const c of chunks) {
      if (choiceSet.size >= 4) break;
      choiceSet.set(c.join(""), c);
    }
    while (choiceSet.size < 4) {
      const noise = Array.from(
        { length: chunkLen },
        () => MEMORY_SYMBOL_GLYPHS[rng.pick(pool)]
      );
      choiceSet.set(noise.join(""), noise);
    }
    const chunkChoices = rng.shuffle([...choiceSet.values()]);
    const realIndex = chunkChoices.findIndex(
      (c) => c.join("") === correct.join("")
    );
    return attachMeta({
      id: makeId("mem"),
      type: "memory",
      variant,
      difficulty,
      sequence: chunks.flat().map((g) => {
        const entry = Object.entries(MEMORY_SYMBOL_GLYPHS).find(([, v]) => v === g);
        return (entry?.[0] as MemorySymbol) ?? "circle";
      }),
      symbolPool: pool,
      displayDurationMs: display + 800,
      timeLimit,
      chunks,
      chunkChoices,
      correctChunkIndex: Math.max(0, realIndex),
      prompt: "Which chunk appeared?",
    });
  }

  if (variant === "ordered-groups") {
    const g1 = sequence.slice(0, Math.ceil(length / 2));
    const g2 = sequence.slice(Math.ceil(length / 2));
    const askFirst = difficulty < 12 || rng() < 0.5;
    return attachMeta({
      id: makeId("mem"),
      type: "memory",
      variant,
      difficulty,
      sequence: [...g1, ...g2],
      symbolPool: pool,
      displayDurationMs: display + 600,
      timeLimit,
      chunks: [
        g1.map((s) => MEMORY_SYMBOL_GLYPHS[s]),
        g2.map((s) => MEMORY_SYMBOL_GLYPHS[s]),
      ],
      groupOrderPrompt: askFirst ? "first" : "symbol-group",
      correctGroupIndex: 0,
      promptSymbol: askFirst ? undefined : g2[0],
      correctIndex: askFirst ? 0 : 1,
      prompt: askFirst
        ? "Which group appeared first?"
        : `Which group contained ${MEMORY_SYMBOL_GLYPHS[g2[0]!]}?`,
    });
  }

  if (variant === "interference") {
    return attachMeta({
      id: makeId("mem"),
      type: "memory",
      variant,
      difficulty,
      sequence,
      symbolPool: pool,
      displayDurationMs: display,
      timeLimit: timeLimit + 4000,
      distraction: makeDistraction(rng),
      prompt: "Memorize, then solve the distraction, then recall",
    });
  }

  if (variant === "transform-recall") {
    const replaceFrom = sequence[0]!;
    let replaceTo = rng.pick(pool);
    while (replaceTo === replaceFrom) replaceTo = rng.pick(pool);
    const transformed = [...sequence].reverse().map((s) =>
      s === replaceFrom ? replaceTo : s
    );
    return attachMeta({
      id: makeId("mem"),
      type: "memory",
      variant,
      difficulty,
      sequence,
      symbolPool: pool,
      displayDurationMs: display + 400,
      timeLimit: timeLimit + 3000,
      transformRule: "replace",
      replaceFrom,
      replaceTo,
      transformedSequence: transformed,
      prompt: `Recall reversed, replacing ${MEMORY_SYMBOL_GLYPHS[replaceFrom]} with ${MEMORY_SYMBOL_GLYPHS[replaceTo]}`,
    });
  }

  if (variant === "boss") {
    return attachMeta({
      id: makeId("mem"),
      type: "memory",
      variant,
      difficulty,
      sequence,
      symbolPool: pool,
      displayDurationMs: display,
      timeLimit: timeLimit + 5000,
      distraction: makeDistraction(rng),
    });
  }

  // sequence / reverse (and Archivist memorize / recall)
  const isRecall = Boolean(options?.sharedSequence?.length);
  return attachMeta({
    id: makeId("mem"),
    type: "memory",
    variant,
    difficulty,
    sequence,
    symbolPool: pool,
    displayDurationMs: options?.memorizeOnly
      ? display
      : isRecall
        ? 0
        : display,
    timeLimit: options?.memorizeOnly ? undefined : timeLimit,
    memorizeOnly: options?.memorizeOnly || undefined,
    skipPresenting: isRecall || undefined,
    prompt: options?.memorizeOnly
      ? "Memorize this sequence — a distraction comes next"
      : isRecall
        ? "Recall the sequence from earlier"
        : undefined,
  });
}

function fallbackMemory(difficulty: number): MemoryPuzzle {
  return attachMeta({
    id: makeId("mem"),
    type: "memory",
    variant: "sequence",
    difficulty: Math.max(1, difficulty),
    sequence: ["circle", "triangle", "square"],
    symbolPool: MEMORY_SYMBOLS.slice(0, 4),
    displayDurationMs: 3500,
    timeLimit: 15000,
  });
}

export const memoryEngine: PuzzleEngine<
  MemoryPuzzle,
  MemorySymbol[] | MemorySymbol | number
> = {
  generate(difficulty: number, options?: GenerateOptions): MemoryPuzzle {
    const variant = pickVariant(difficulty, options);
    const adj = applyFamilyDifficultyAdjust(
      variant,
      difficulty + (options?.familyDifficultyAdjust ?? 0)
    );
    return withRetries(
      () => buildMemory(adj, variant, options),
      validateMemory,
      8,
      () => fallbackMemory(adj)
    );
  },

  validate(puzzle, answer) {
    if (puzzle.variant === "missing") {
      const idx = puzzle.missingIndex ?? 0;
      return answer === puzzle.sequence[idx];
    }
    if (puzzle.variant === "position") {
      return answer === puzzle.correctIndex;
    }
    if (puzzle.variant === "chunk") {
      return answer === puzzle.correctChunkIndex;
    }
    if (puzzle.variant === "ordered-groups") {
      return answer === (puzzle.correctIndex ?? puzzle.correctGroupIndex);
    }
    if (puzzle.variant === "transform-recall") {
      if (!Array.isArray(answer) || !puzzle.transformedSequence) return false;
      if (answer.length !== puzzle.transformedSequence.length) return false;
      return answer.every((s, i) => s === puzzle.transformedSequence![i]);
    }
    if (!Array.isArray(answer)) return false;
    const expected =
      puzzle.variant === "reverse" ? [...puzzle.sequence].reverse() : puzzle.sequence;
    if (answer.length !== expected.length) return false;
    return answer.every((s, i) => s === expected[i]);
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

export function formatMemoryAnswer(puzzle: MemoryPuzzle): string {
  if (puzzle.variant === "missing") {
    const s = puzzle.sequence[puzzle.missingIndex ?? 0]!;
    return MEMORY_SYMBOL_GLYPHS[s];
  }
  if (puzzle.variant === "position") return `Cell ${(puzzle.correctIndex ?? 0) + 1}`;
  if (puzzle.variant === "chunk") {
    return (puzzle.chunkChoices?.[puzzle.correctChunkIndex ?? 0] ?? []).join(" ");
  }
  if (puzzle.variant === "ordered-groups") {
    return `Group ${(puzzle.correctIndex ?? 0) + 1}`;
  }
  if (puzzle.variant === "transform-recall" && puzzle.transformedSequence) {
    return puzzle.transformedSequence.map((s) => MEMORY_SYMBOL_GLYPHS[s]).join(" ");
  }
  const seq =
    puzzle.variant === "reverse" ? [...puzzle.sequence].reverse() : puzzle.sequence;
  return seq.map((s) => MEMORY_SYMBOL_GLYPHS[s]).join(" ");
}
