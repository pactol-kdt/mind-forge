import type {
  GenerateOptions,
  LogicPuzzle,
  LogicVariant,
  PuzzleEngine,
} from "@/types/puzzles";
import { engineScore, makeId } from "./shared";
import { pickRandom, randomInt, shuffle } from "@/lib/game/utils";

function pickVariant(
  difficulty: number,
  options?: GenerateOptions
): LogicVariant {
  if (options?.forceVariant) return options.forceVariant as LogicVariant;
  if (options?.floorType === "boss") return "boss";
  const unlocked = options?.unlockedVariants ?? [];
  const pool: LogicVariant[] = ["pattern-sequence"];
  if (unlocked.includes("symbol-pattern") || difficulty >= 2)
    pool.push("symbol-pattern");
  if (unlocked.includes("odd-rule") || difficulty >= 3) pool.push("odd-rule");
  if (unlocked.includes("ordering") || difficulty >= 4) pool.push("ordering");
  if (unlocked.includes("conditional") || difficulty >= 5)
    pool.push("conditional");
  if (unlocked.includes("rule-matrix") || difficulty >= 6) pool.push("rule-matrix");
  if (unlocked.includes("set-membership") || difficulty >= 5)
    pool.push("set-membership");
  if (unlocked.includes("deduction-lite") || difficulty >= 7)
    pool.push("deduction-lite");
  if (unlocked.includes("boolean-rule") || difficulty >= 10)
    pool.push("boolean-rule");
  return pickRandom(pool);
}

function genRuleMatrix(difficulty: number): LogicPuzzle {
  const a = "▲";
  const b = "●";
  const rows = [
    [a, b, a],
    [b, a, b],
    [a, b, "?"],
  ];
  const answer = a;
  return {
    id: makeId("log"),
    type: "logic",
    variant: "rule-matrix",
    difficulty,
    prompt: "Complete the missing tile",
    detailLines: rows.map((r) => r.join(" ")),
    matrixRows: rows,
    missingRow: 2,
    missingCol: 2,
    choices: uniqueChoices(answer, ["●", "■", "◆", "★"]),
    correctAnswer: answer,
    ruleId: "alternate-ab",
    timeLimit: 15000 + difficulty * 200,
    family: "rule-matrix",
  };
}

function genSetMembership(difficulty: number): LogicPuzzle {
  const choices = ["●●", "●○", "○○", "●●●"];
  const answer = "●●";
  return {
    id: makeId("log"),
    type: "logic",
    variant: "set-membership",
    difficulty,
    prompt: "Which belongs to Group A?",
    detailLines: ["Rule: Group A contains exactly two filled circles."],
    choices: shuffle(choices),
    correctAnswer: answer,
    ruleId: "two-filled",
    timeLimit: 14000 + difficulty * 150,
    family: "set-membership",
  };
}

function genDeductionLite(difficulty: number): LogicPuzzle {
  // Mia last, Sam before Alex, Alex not first → Sam first
  return {
    id: makeId("log"),
    type: "logic",
    variant: "deduction-lite",
    difficulty,
    prompt: "Who is first?",
    detailLines: [
      "Alex is not first.",
      "Sam is before Alex.",
      "Mia is last.",
    ],
    choices: shuffle(["Sam", "Alex", "Mia", "Pat"]),
    correctAnswer: "Sam",
    ruleId: "order-sam-first",
    timeLimit: 18000 + difficulty * 200,
    family: "deduction-lite",
  };
}

function genBooleanRule(difficulty: number): LogicPuzzle {
  const items = [
    { label: "blue triangle", ok: true },
    { label: "blue circle", ok: false },
    { label: "red triangle", ok: false },
    { label: "green square", ok: false },
  ];
  const answer = "blue triangle";
  return {
    id: makeId("log"),
    type: "logic",
    variant: "boolean-rule",
    difficulty,
    prompt: "Choose the item that is: a triangle AND not red",
    detailLines: ["Rule: triangle AND not red"],
    choices: shuffle(items.map((i) => i.label)),
    correctAnswer: answer,
    ruleId: "triangle-and-not-red",
    timeLimit: 16000 + difficulty * 200,
    family: "boolean-rule",
  };
}

function uniqueChoices(correct: string, distractors: string[]): string[] {
  const set = new Set<string>([correct]);
  for (const d of distractors) {
    if (set.size >= 4) break;
    if (d !== correct) set.add(d);
  }
  let n = 0;
  while (set.size < 4 && n < 20) {
    set.add(String(Number(correct) + randomInt(-5, 5) || randomInt(1, 40)));
    n++;
  }
  return shuffle([...set]).slice(0, 4);
}

function genPatternSequence(difficulty: number): LogicPuzzle {
  const kind = pickRandom(["double", "add", "alt", "fib"] as const);
  let seq: number[] = [];
  let answer = 0;

  if (kind === "double") {
    const start = randomInt(1, 4);
    seq = [start];
    for (let i = 0; i < 3; i++) seq.push(seq[i]! * 2);
    answer = seq[3]! * 2;
    seq = seq.slice(0, 4);
  } else if (kind === "add") {
    const start = randomInt(1, 10);
    const step = randomInt(2, 5 + Math.floor(difficulty / 4));
    seq = [start, start + step, start + step * 2, start + step * 3];
    answer = start + step * 4;
  } else if (kind === "alt") {
    const a = randomInt(1, 9);
    const b = randomInt(1, 9);
    seq = [a, b, a, b];
    answer = a;
  } else {
    seq = [1, 1, 2, 3];
    answer = 5;
    if (difficulty >= 6) {
      seq = [2, 3, 5, 8];
      answer = 13;
    }
  }

  const prompt = `${seq.join(", ")}, ?`;
  const choices = uniqueChoices(
    String(answer),
    [answer + 1, answer - 1, answer + 2, answer * 2, answer + seq[0]!].map(
      String
    )
  );

  return {
    id: makeId("log"),
    type: "logic",
    variant: "pattern-sequence",
    difficulty,
    prompt,
    choices,
    correctAnswer: String(answer),
    timeLimit: 14000 + difficulty * 200,
  };
}

function genSymbolPattern(difficulty: number): LogicPuzzle {
  const symbols = ["▲", "●", "■", "◆", "★"];
  const a = pickRandom(symbols);
  let b = pickRandom(symbols);
  while (b === a) b = pickRandom(symbols);
  const items = [a, b, a, b, a];
  const answer = b;
  const choices = uniqueChoices(
    answer,
    symbols.filter((s) => s !== answer)
  );
  return {
    id: makeId("log"),
    type: "logic",
    variant: "symbol-pattern",
    difficulty,
    prompt: "What comes next?",
    detailLines: [`${items.join(" ")} ?`],
    items,
    choices,
    correctAnswer: answer,
    timeLimit: 12000 + difficulty * 150,
  };
}

function genOddRule(difficulty: number): LogicPuzzle {
  const pairs = ["▲▲", "●●", "■■", "★★"];
  const odd = "◆◇";
  const items = shuffle([...pairs.slice(0, 3), odd]);
  return {
    id: makeId("log"),
    type: "logic",
    variant: "odd-rule",
    difficulty,
    prompt: "Which follows a different rule?",
    detailLines: items,
    items,
    choices: items,
    correctAnswer: odd,
    timeLimit: 13000 + difficulty * 150,
  };
}

function genOrdering(difficulty: number): LogicPuzzle {
  const names = shuffle(["A", "B", "C", "D"]).slice(
    0,
    difficulty >= 8 ? 4 : 3
  ) as string[];
  // names[0] tallest ... last shortest after we define order
  const order = [...names];
  const lines: string[] = [];
  for (let i = 0; i < order.length - 1; i++) {
    lines.push(`${order[i]} is taller than ${order[i + 1]}.`);
  }
  const shortest = order[order.length - 1]!;
  const tallest = order[0]!;
  const askShortest = Math.random() < 0.5;
  return {
    id: makeId("log"),
    type: "logic",
    variant: "ordering",
    difficulty,
    prompt: askShortest ? "Who is shortest?" : "Who is tallest?",
    detailLines: lines,
    choices: shuffle([...order]),
    correctAnswer: askShortest ? shortest : tallest,
    timeLimit: 16000 + difficulty * 250,
  };
}

function genConditional(difficulty: number): LogicPuzzle {
  const shapes = ["circle", "triangle", "square", "star"];
  const colors = ["blue", "red", "green"];
  const shape = pickRandom(shapes);
  const color = pickRandom(colors);
  const target = pickRandom(shapes.filter((s) => s !== shape));
  const factTrue = Math.random() < 0.7 || difficulty < 4;
  const lines = [
    `If the ${shape} is ${color}, choose the ${target}.`,
    factTrue
      ? `The ${shape} is ${color}.`
      : `The ${shape} is not ${color}.`,
  ];
  const fallback = pickRandom(shapes.filter((s) => s !== target));
  const answer = factTrue ? target : fallback;
  // If false, instruction: choose fallback explicitly
  if (!factTrue) {
    lines[0] = `If the ${shape} is ${color}, choose the ${target}. Otherwise choose the ${fallback}.`;
  }
  return {
    id: makeId("log"),
    type: "logic",
    variant: "conditional",
    difficulty,
    prompt: "What should you choose?",
    detailLines: lines,
    choices: shuffle([...new Set([target, fallback, shape, pickRandom(shapes)])]).slice(0, 4),
    correctAnswer: answer,
    timeLimit: 16000 + difficulty * 200,
  };
}

function genBoss(difficulty: number): LogicPuzzle {
  // Observe rule then apply
  const base = genSymbolPattern(difficulty + 1);
  return {
    ...base,
    id: makeId("log"),
    variant: "boss",
    prompt: "Boss — complete the pattern",
    timeLimit: (base.timeLimit ?? 14000) + 4000,
  };
}

export const logicEngine: PuzzleEngine<LogicPuzzle, string> = {
  generate(difficulty: number, options?: GenerateOptions): LogicPuzzle {
    const variant = pickVariant(difficulty, options);
    const timeBonus = options?.timeBonusPct ?? 0;
    let puzzle: LogicPuzzle;
    switch (variant) {
      case "symbol-pattern":
        puzzle = genSymbolPattern(difficulty);
        break;
      case "odd-rule":
        puzzle = genOddRule(difficulty);
        break;
      case "ordering":
        puzzle = genOrdering(difficulty);
        break;
      case "conditional":
        puzzle = genConditional(difficulty);
        break;
      case "rule-matrix":
        puzzle = genRuleMatrix(difficulty);
        break;
      case "set-membership":
        puzzle = genSetMembership(difficulty);
        break;
      case "deduction-lite":
        puzzle = genDeductionLite(difficulty);
        break;
      case "boolean-rule":
        puzzle = genBooleanRule(difficulty);
        break;
      case "boss":
        puzzle = genBoss(difficulty);
        break;
      default:
        puzzle = genPatternSequence(difficulty);
    }
    if (puzzle.timeLimit) {
      puzzle.timeLimit = Math.round(puzzle.timeLimit * (1 + timeBonus));
    }
    // Ensure unique choices
    puzzle.choices = [...new Set(puzzle.choices)];
    if (!puzzle.choices.includes(puzzle.correctAnswer)) {
      puzzle.choices = [
        puzzle.correctAnswer,
        ...puzzle.choices.filter((c) => c !== puzzle.correctAnswer),
      ].slice(0, 4);
    }
    while (puzzle.choices.length < 4) {
      puzzle.choices.push(`opt-${puzzle.choices.length}`);
    }
    puzzle.choices = shuffle(puzzle.choices.slice(0, 4));
    return puzzle;
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

export function formatLogicAnswer(puzzle: LogicPuzzle): string {
  return puzzle.correctAnswer;
}
