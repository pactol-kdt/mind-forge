import type {
  GenerateOptions,
  MathPuzzle,
  MathVariant,
  PuzzleEngine,
} from "@/types/puzzles";
import { engineScore, makeId } from "./shared";
import { clamp, pickRandom, randomInt, shuffle } from "@/lib/game/utils";

type Op = "+" | "-" | "×" | "÷";

function operandRange(difficulty: number): [number, number] {
  if (difficulty <= 2) return [1, 10];
  if (difficulty <= 5) return [2, 15];
  if (difficulty <= 9) return [3, 25];
  if (difficulty <= 14) return [5, 40];
  return [6, 50];
}

function availableOps(difficulty: number): Op[] {
  if (difficulty <= 2) return ["+"];
  if (difficulty <= 4) return ["+", "-"];
  if (difficulty <= 7) return ["+", "-", "×"];
  return ["+", "-", "×", "÷"];
}

function timeLimitMs(difficulty: number, ops: number, bonusPct: number): number {
  return Math.round(
    clamp(10000 + ops * 3000 - difficulty * 250, 7000, 20000) * (1 + bonusPct)
  );
}

function apply(a: number, op: Op, b: number): number {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return a / b;
  }
}

function makeDivisionPair(max: number): [number, number] {
  const divisor = randomInt(2, Math.min(12, max));
  const quotient = randomInt(2, Math.min(12, Math.floor(max / divisor) || 2));
  return [divisor * quotient, divisor];
}

function uniqueNumberChoices(correct: number, count: number): number[] {
  const set = new Set<number>([correct]);
  const deltas = [-3, -2, -1, 1, 2, 3, -5, 5, -10, 10, correct + 1, -correct];
  for (const d of deltas) {
    const candidate = correct + d;
    if (Number.isInteger(candidate) && candidate !== correct) set.add(candidate);
    if (set.size >= count) break;
  }
  while (set.size < count) {
    const n = correct + randomInt(-12, 12);
    if (Number.isInteger(n) && n !== correct) set.add(n);
  }
  return shuffle([...set]).slice(0, count);
}

function generateSimple(difficulty: number): {
  expression: string;
  answer: number;
} {
  const ops = availableOps(difficulty);
  const [min, max] = operandRange(difficulty);
  const op = ops[randomInt(0, ops.length - 1)]!;

  if (op === "÷") {
    const [dividend, divisor] = makeDivisionPair(max);
    return {
      expression: `${dividend} ÷ ${divisor}`,
      answer: dividend / divisor,
    };
  }
  if (op === "×") {
    const a = randomInt(2, Math.min(12, max));
    const b = randomInt(2, Math.min(12, max));
    return { expression: `${a} × ${b}`, answer: a * b };
  }
  if (op === "-") {
    const a = randomInt(min, max);
    const b = randomInt(min, a);
    return { expression: `${a} − ${b}`, answer: a - b };
  }
  const a = randomInt(min, max);
  const b = randomInt(min, max);
  return { expression: `${a} + ${b}`, answer: a + b };
}

function generateCompound(difficulty: number): {
  expression: string;
  answer: number;
} {
  const [min, max] = operandRange(Math.max(1, difficulty - 4));
  const pattern = randomInt(0, 2);
  if (pattern === 0) {
    const [dividend, divisor] = makeDivisionPair(Math.min(max, 36));
    const c = randomInt(min, Math.min(15, max));
    return {
      expression: `${dividend} ÷ ${divisor} + ${c}`,
      answer: apply(dividend, "÷", divisor) + c,
    };
  }
  if (pattern === 1) {
    const a = randomInt(2, 10);
    const b = randomInt(2, 10);
    const c = randomInt(1, Math.min(20, a * b - 1));
    return { expression: `${a} × ${b} − ${c}`, answer: a * b - c };
  }
  const a = randomInt(min, max);
  const b = randomInt(min, max);
  const c = randomInt(2, 9);
  return { expression: `${a} + ${b} × ${c}`, answer: a + b * c };
}

function pickVariant(
  difficulty: number,
  options?: GenerateOptions
): MathVariant {
  if (options?.forceVariant) return options.forceVariant as MathVariant;
  const unlocked = options?.unlockedVariants ?? [];
  const pool: MathVariant[] = ["arithmetic"];
  if (unlocked.includes("missing-operator") || difficulty >= 3)
    pool.push("missing-operator");
  if (unlocked.includes("comparison") || difficulty >= 3) pool.push("comparison");
  if (unlocked.includes("target") || difficulty >= 5) pool.push("target");
  if (unlocked.includes("equation-chain") || difficulty >= 6)
    pool.push("equation-chain");
  if (unlocked.includes("number-sequence") || difficulty >= 4)
    pool.push("number-sequence");
  if (unlocked.includes("estimation") || difficulty >= 5) pool.push("estimation");
  if (unlocked.includes("constraint") || difficulty >= 9) pool.push("constraint");
  // Soft anti-repeat via unlocked list is enough; prefer variety
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export const mathEngine: PuzzleEngine<MathPuzzle, number | string> = {
  generate(difficulty: number, options?: GenerateOptions): MathPuzzle {
    const variant = pickVariant(difficulty, options);
    const bonusPct = options?.timeBonusPct ?? 0;

    if (variant === "equation-chain") {
      let value = randomInt(4, 12);
      const lines: string[] = [`Start with ${value}.`];
      const a = randomInt(2, 5);
      value *= a;
      lines.push(`× ${a}`);
      const b = randomInt(1, 8);
      value -= b;
      lines.push(`− ${b}`);
      const missing = randomInt(2, 6);
      // value / missing = end → end = value/missing; instead ask for missing divisor
      // Ensure divisible
      const end = randomInt(2, 9);
      const divisor = value / end;
      if (!Number.isInteger(divisor) || divisor < 2) {
        // fallback safe chain
        value = 24;
        lines.length = 0;
        lines.push("Start with 8.", "× 3", "− 5", "÷ ? = 19");
        // 8*3-5=19, ÷1 = 19 — ask for 1 is weak. Better:
        // Start 10, ×2 =20, −1=19, ask nothing. Use:
        // Start 8 ×3 =24 −5 =19. Ask: what is final? 
        return {
          id: makeId("math"),
          type: "math",
          variant: "equation-chain",
          difficulty,
          chainLines: ["Start with 8.", "× 3", "− 5", "= ?"],
          expression: "Complete the chain",
          correctAnswer: 19,
          choices: uniqueNumberChoices(19, 4),
          timeLimit: timeLimitMs(difficulty, 3, bonusPct),
          family: "equation-chain",
        };
      }
      lines.push(`÷ ? = ${end}`);
      return {
        id: makeId("math"),
        type: "math",
        variant: "equation-chain",
        difficulty,
        chainLines: lines,
        expression: "What is the missing ÷ value?",
        correctAnswer: divisor,
        choices: uniqueNumberChoices(divisor, 4),
        timeLimit: timeLimitMs(difficulty, 3, bonusPct),
        family: "equation-chain",
      };
    }

    if (variant === "number-sequence") {
      const step = randomInt(2, 4 + Math.floor(difficulty / 5));
      const start = randomInt(1, 10);
      const seq = [start, start + step, start + step * 2, start + step * 3];
      let answer = start + step * 4;
      if (difficulty >= 12) {
        // doubling-ish: 2,5,11,23 → *2+1
        const s = [2, 5, 11, 23];
        answer = 47;
        return {
          id: makeId("math"),
          type: "math",
          variant,
          difficulty,
          sequence: s,
          expression: `${s.join(", ")}, ?`,
          correctAnswer: answer,
          choices: uniqueNumberChoices(answer, 4),
          timeLimit: timeLimitMs(difficulty, 2, bonusPct),
          family: "number-sequence",
        };
      }
      return {
        id: makeId("math"),
        type: "math",
        variant,
        difficulty,
        sequence: seq,
        expression: `${seq.join(", ")}, ?`,
        correctAnswer: answer,
        choices: uniqueNumberChoices(answer, 4),
        timeLimit: timeLimitMs(difficulty, 2, bonusPct),
        family: "number-sequence",
      };
    }

    if (variant === "estimation") {
      // Buckets of 500 with exactly one unique closest option.
      const a = randomInt(21, 49);
      const b = randomInt(11, 29);
      const exact = a * b;
      const lower = Math.floor(exact / 500) * 500;
      const upper = lower + 500;
      let correct =
        Math.abs(exact - lower) <= Math.abs(exact - upper) ? lower : upper;
      if (correct < 500) correct = 500;
      // Prefer asymmetric neighbors so midpoints never produce two equal distances
      const choices = shuffle(
        [...new Set([correct, correct + 500, correct + 1000, correct + 1500])]
      );
      while (choices.length < 4) {
        const n = (choices[choices.length - 1] ?? correct) + 500;
        if (!choices.includes(n)) choices.push(n);
      }
      const closest = choices.reduce((best, c) =>
        Math.abs(c - exact) < Math.abs(best - exact) ? c : best
      );
      return {
        id: makeId("math"),
        type: "math",
        variant,
        difficulty,
        expression: `Which is closest to ${a} × ${b}?`,
        prompt: "Choose the closest estimate",
        correctAnswer: closest,
        choices,
        timeLimit: Math.max(8000, timeLimitMs(difficulty, 2, bonusPct)),
        family: "estimation",
      };
    }

    if (variant === "constraint") {
      // ? + 8 > 20 and ? < 15 → 12 or 14; pick unique
      const options = [10, 12, 14, 18];
      const valid = options.filter((n) => n + 8 > 20 && n < 15);
      const correct = valid.length === 1 ? valid[0]! : 12;
      const choices = shuffle(
        valid.length === 1 ? options : [12, 10, 18, 20]
      );
      return {
        id: makeId("math"),
        type: "math",
        variant,
        difficulty,
        constraintLines: ["? + 8 > 20", "and", "? < 15"],
        expression: "Which value makes this true?",
        correctAnswer: correct,
        choices,
        timeLimit: timeLimitMs(difficulty, 2, bonusPct),
        family: "constraint",
      };
    }

    if (variant === "missing-operator") {
      const [min, max] = operandRange(difficulty);
      const allowed = availableOps(difficulty);
      const op = pickRandom(allowed);
      let left = randomInt(min, max);
      let right = randomInt(min, max);
      let result = 0;

      if (op === "÷") {
        const pair = makeDivisionPair(max);
        left = pair[0];
        right = pair[1];
        result = left / right;
      } else if (op === "-") {
        if (right > left) [left, right] = [right, left];
        result = left - right;
      } else if (op === "×") {
        left = randomInt(2, 12);
        right = randomInt(2, 12);
        result = left * right;
      } else {
        result = left + right;
      }

      const displayOp = op === "-" ? "−" : op;
      return {
        id: makeId("math"),
        type: "math",
        variant,
        difficulty,
        left,
        right,
        result: Math.round(result),
        expression: `${left} ? ${right} = ${Math.round(result)}`,
        operatorChoices: ["+", "−", "×", "÷"],
        correctOperator: displayOp,
        choices: ["+", "−", "×", "÷"],
        timeLimit: timeLimitMs(difficulty, 1, bonusPct),
      };
    }

    if (variant === "comparison") {
      const a = generateSimple(difficulty);
      const b = generateSimple(difficulty);
      // Ensure different values
      let right = b;
      let guard = 0;
      while (right.answer === a.answer && guard < 8) {
        right = generateSimple(difficulty);
        guard++;
      }
      if (right.answer === a.answer) {
        right = {
          expression: `${a.answer + 1} + 0`,
          answer: a.answer + 1,
        };
      }
      const correctSide = a.answer > right.answer ? "left" : "right";
      return {
        id: makeId("math"),
        type: "math",
        variant,
        difficulty,
        leftExpression: a.expression,
        rightExpression: right.expression,
        leftValue: a.answer,
        rightValue: right.answer,
        expression: `Which is larger?`,
        choices: ["left", "right"],
        correctAnswer: correctSide === "left" ? 0 : 1,
        timeLimit: timeLimitMs(difficulty, 2, bonusPct),
      };
    }

    if (variant === "target") {
      const target = randomInt(10, 30 + difficulty);
      const patterns: Array<{ numbers: number[]; expr: string; value: number }> = [];
      // a × b
      {
        const a = randomInt(2, 9);
        const b = Math.max(2, Math.round(target / a));
        patterns.push({
          numbers: [a, b],
          expr: `${a} × ${b}`,
          value: a * b,
        });
      }
      // a + b
      {
        const a = randomInt(1, target - 1);
        patterns.push({
          numbers: [a, target - a],
          expr: `${a} + ${target - a}`,
          value: target,
        });
      }
      // a × b − c
      {
        const a = randomInt(3, 8);
        const b = randomInt(3, 8);
        const c = a * b - target;
        if (c > 0 && c < 20) {
          patterns.push({
            numbers: [a, b, c],
            expr: `${a} × ${b} − ${c}`,
            value: a * b - c,
          });
        }
      }

      const correct =
        patterns.find((p) => p.value === target) ??
        (() => {
          const a = Math.floor(target / 2);
          return {
            numbers: [a, target - a],
            expr: `${a} + ${target - a}`,
            value: target,
          };
        })();

      const wrong: string[] = [];
      for (const p of patterns) {
        if (p.expr !== correct.expr && p.value !== target) wrong.push(p.expr);
      }
      while (wrong.length < 3) {
        const x = randomInt(2, 9);
        const y = randomInt(2, 9);
        const expr = `${x} × ${y}`;
        if (x * y !== target && !wrong.includes(expr) && expr !== correct.expr) {
          wrong.push(expr);
        }
      }

      const expressionChoices = shuffle([correct.expr, ...wrong.slice(0, 3)]);
      return {
        id: makeId("math"),
        type: "math",
        variant,
        difficulty,
        target,
        numbers: correct.numbers,
        expression: `Target: ${target}`,
        expressionChoices,
        correctExpression: correct.expr,
        choices: expressionChoices,
        timeLimit: timeLimitMs(difficulty, 2, bonusPct),
      };
    }

    const useCompound = difficulty >= 8 && Math.random() < 0.55;
    const { expression, answer } = useCompound
      ? generateCompound(difficulty)
      : generateSimple(difficulty);
    const correctAnswer = Math.round(answer);
    const choices = uniqueNumberChoices(correctAnswer, 4);
    const ops = (expression.match(/[+\−×÷]/g) ?? []).length;

    return {
      id: makeId("math"),
      type: "math",
      variant: "arithmetic",
      difficulty,
      expression,
      correctAnswer,
      choices,
      timeLimit: timeLimitMs(difficulty, ops, bonusPct),
    };
  },

  validate(puzzle, answer) {
    if (puzzle.variant === "missing-operator") {
      return answer === puzzle.correctOperator;
    }
    if (puzzle.variant === "comparison") {
      const correctSide = (puzzle.leftValue ?? 0) > (puzzle.rightValue ?? 0) ? 0 : 1;
      if (typeof answer === "string") {
        return (answer === "left" ? 0 : 1) === correctSide;
      }
      return answer === correctSide;
    }
    if (puzzle.variant === "target") {
      return answer === puzzle.correctExpression;
    }
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

export function formatMathAnswer(puzzle: MathPuzzle): string {
  if (puzzle.variant === "missing-operator") return puzzle.correctOperator ?? "";
  if (puzzle.variant === "comparison") {
    const side =
      (puzzle.leftValue ?? 0) > (puzzle.rightValue ?? 0) ? "Left" : "Right";
    return side;
  }
  if (puzzle.variant === "target") return puzzle.correctExpression ?? "";
  return String(puzzle.correctAnswer);
}
