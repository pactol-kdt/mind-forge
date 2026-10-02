/**
 * Shared scoring helpers. Engines compute base + speed;
 * run-layer applies streak, upgrades, and floor modifiers.
 */

export function baseScore(difficulty: number): number {
  return 100 * difficulty;
}

/** Reward faster answers; caps at 50% of base. */
export function speedBonus(
  difficulty: number,
  responseTimeMs: number,
  timeLimitMs?: number,
  calmMindRelief = 0
): number {
  const base = baseScore(difficulty);
  // Calm Mind effectively treats the limit as longer → softer pressure
  const limit =
    (timeLimitMs ?? Math.max(8000, 15000 - difficulty * 400)) *
    (1 + calmMindRelief);
  const ratio = Math.max(0, Math.min(1, 1 - responseTimeMs / limit));
  return Math.round(base * 0.5 * ratio);
}

/** Small escalating streak bonus starting at 2x. */
export function streakBonus(
  difficulty: number,
  streak: number,
  upgradePct = 0
): number {
  if (streak < 2) return 0;
  const multiplier = Math.min(streak - 1, 10);
  const raw = 20 * difficulty * 0.15 * multiplier;
  return Math.round(raw * (1 + upgradePct));
}

export function applyScoreMultipliers(
  points: number,
  multipliers: number[]
): number {
  if (points <= 0) return 0;
  const total = multipliers.reduce((p, m) => p * (1 + m), 1);
  return Math.max(0, Math.round(points * total));
}

export function totalScore(parts: {
  base: number;
  speed: number;
  streak: number;
}): number {
  return Math.max(0, parts.base + parts.speed + parts.streak);
}
