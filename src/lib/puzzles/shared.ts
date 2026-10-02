import type { MemorySymbol } from "@/types/puzzles";
import { clamp, createId, pickRandom, randomInt, shuffle } from "@/lib/game/utils";
import { baseScore, speedBonus } from "@/lib/game/scoring";

export const MEMORY_SYMBOLS: MemorySymbol[] = [
  "circle",
  "triangle",
  "square",
  "star",
  "diamond",
  "hexagon",
];

export const MEMORY_SYMBOL_GLYPHS: Record<MemorySymbol, string> = {
  circle: "●",
  triangle: "▲",
  square: "■",
  star: "★",
  diamond: "◆",
  hexagon: "⬢",
};

export function sequenceLength(difficulty: number): number {
  if (difficulty <= 2) return 3;
  if (difficulty <= 4) return 4;
  if (difficulty <= 7) return 5;
  if (difficulty <= 11) return 6;
  if (difficulty <= 15) return 7;
  return 8;
}

export function poolSize(difficulty: number): number {
  if (difficulty <= 2) return 4;
  if (difficulty <= 6) return 5;
  return 6;
}

export function displayDurationMs(difficulty: number): number {
  return clamp(4000 - (difficulty - 1) * 120, 2000, 4000);
}

export function generateSequence(
  length: number,
  pool: MemorySymbol[]
): MemorySymbol[] {
  return Array.from({ length }, () => pickRandom(pool));
}

export function uniqueChoices<T>(correct: T, distractors: T[], count: number): T[] {
  const set = new Set<T>([correct]);
  for (const d of distractors) {
    if (set.size >= count) break;
    set.add(d);
  }
  // Fill if needed with pool leftovers for symbols handled by caller
  return shuffle([...set]).slice(0, count);
}

export function engineScore(
  difficulty: number,
  responseTimeMs: number,
  timeLimit: number | undefined,
  valid: boolean
): number {
  if (!valid) return 0;
  return (
    baseScore(difficulty) + speedBonus(difficulty, responseTimeMs, timeLimit)
  );
}

export function makeId(prefix: string): string {
  return createId(prefix);
}

export function randInt(min: number, max: number): number {
  return randomInt(min, max);
}

export function applyTimeBonus(
  timeLimit: number | undefined,
  pct: number
): number | undefined {
  if (!timeLimit) return timeLimit;
  return Math.round(timeLimit * (1 + pct));
}
