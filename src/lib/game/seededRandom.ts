/** Deterministic seeded RNG (Mulberry32). */

export type Rng = () => number; // [0, 1)

export function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h >>> 0) || 1;
}

export function createSeededRng(seed: string | number): Rng {
  let t = typeof seed === "number" ? seed >>> 0 : hashSeed(seed);
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function rngPick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

export function rngShuffle<T>(rng: Rng, items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export function normalizeSeed(input: string): string {
  const cleaned = input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!cleaned) return `MINDFORGE-${Date.now().toString(36).toUpperCase()}`;
  if (cleaned.startsWith("MINDFORGE-")) return cleaned.slice(0, 32);
  return `MINDFORGE-${cleaned}`.slice(0, 32);
}

export function randomSeedString(): string {
  return normalizeSeed(
    `MF${Math.floor(Math.random() * 1e9)}${Date.now().toString(36)}`
  );
}

/** Derive a child seed for a floor/purpose so sequences stay stable. */
export function deriveSeed(base: string, ...parts: Array<string | number>): string {
  return `${base}:${parts.join(":")}`;
}
