import type { Rng } from "@/lib/game/seededRandom";
import {
  createSeededRng,
  deriveSeed,
  rngInt,
  rngPick,
  rngShuffle,
} from "@/lib/game/seededRandom";

/** Bridge for engines: seeded when available, Math.random otherwise. */
export interface PuzzleRng {
  (): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: T[]): T[];
}

export function createPuzzleRng(seed?: string, ...parts: Array<string | number>): PuzzleRng {
  const rng: Rng = seed
    ? createSeededRng(deriveSeed(seed, ...parts))
    : () => Math.random();
  const api = (() => rng()) as PuzzleRng;
  api.int = (min, max) => rngInt(rng, min, max);
  api.pick = <T,>(items: readonly T[]) => rngPick(rng, items);
  api.shuffle = <T,>(items: T[]) => rngShuffle(rng, items);
  return api;
}
