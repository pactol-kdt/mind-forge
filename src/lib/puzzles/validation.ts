export interface PuzzleValidationResult {
  valid: boolean;
  errors: string[];
}

export function ok(): PuzzleValidationResult {
  return { valid: true, errors: [] };
}

export function fail(...errors: string[]): PuzzleValidationResult {
  return { valid: false, errors };
}

export function validateUniqueChoices<T>(
  choices: T[],
  correct: T,
  serialize: (v: T) => string = (v) => String(v)
): PuzzleValidationResult {
  const errors: string[] = [];
  if (choices.length < 2) errors.push("Need at least 2 choices");
  const keys = choices.map(serialize);
  if (new Set(keys).size !== keys.length) errors.push("Duplicate choices");
  const correctKey = serialize(correct);
  if (!keys.includes(correctKey)) errors.push("Correct answer missing from choices");
  const matches = keys.filter((k) => k === correctKey).length;
  if (matches !== 1) errors.push("Correct answer must appear exactly once");
  return errors.length ? fail(...errors) : ok();
}

export function validateExactlyOneCorrect(
  options: unknown[],
  isCorrect: (option: unknown, index: number) => boolean
): PuzzleValidationResult {
  const hits = options
    .map((o, i) => (isCorrect(o, i) ? i : -1))
    .filter((i) => i >= 0);
  if (hits.length !== 1) {
    return fail(`Expected exactly one correct option, found ${hits.length}`);
  }
  return ok();
}

export function validateIntegerAnswer(n: number): PuzzleValidationResult {
  if (!Number.isFinite(n)) return fail("Answer not finite");
  if (!Number.isInteger(n)) return fail("Answer not integer");
  if (Math.abs(n) > 1_000_000) return fail("Answer out of bounds");
  return ok();
}

export function validateNoDivisionByZero(expression: string): PuzzleValidationResult {
  if (/÷\s*0\b/.test(expression) || /\/\s*0\b/.test(expression)) {
    return fail("Division by zero");
  }
  return ok();
}

export function validateGrid(
  cells: string[],
  gridSize: number
): PuzzleValidationResult {
  if (gridSize < 2 || gridSize > 6) return fail("Invalid grid size");
  if (cells.length !== gridSize * gridSize) return fail("Grid cell count mismatch");
  return ok();
}

export function withRetries<T>(
  generate: (attempt: number) => T,
  validate: (puzzle: T) => PuzzleValidationResult,
  maxAttempts = 8,
  fallback?: () => T
): T {
  let lastErrors: string[] = [];
  for (let i = 0; i < maxAttempts; i++) {
    const puzzle = generate(i);
    const result = validate(puzzle);
    if (result.valid) return puzzle;
    lastErrors = result.errors;
  }
  if (fallback) return fallback();
  throw new Error(`Puzzle generation failed: ${lastErrors.join("; ")}`);
}

export function createPuzzleSignature(parts: Array<string | number>): string {
  return parts.map(String).join("|");
}
