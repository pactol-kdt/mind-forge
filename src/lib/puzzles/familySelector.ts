import type { PuzzleType } from "@/types/puzzles";
import type { PuzzleRng } from "./rngBridge";
import {
  familiesForCategory,
  getFamilyMeta,
  isFamilyEligible,
  type FamilyEligibilityContext,
} from "./registry";

/**
 * Weighted family selection with cooldowns and recent-family penalties.
 * Specialist / elite / boss can force categories upstream; this picks the family.
 */
export function selectPuzzleFamily(
  category: PuzzleType,
  ctx: FamilyEligibilityContext & {
    rng: PuzzleRng;
    recentFamilies: string[];
    preferFast?: boolean;
    avoidMultiStage?: boolean;
  }
): string {
  const recent = ctx.recentFamilies.slice(-5);
  const candidates = familiesForCategory(category).filter((f) => {
    if (!isFamilyEligible(f, ctx)) return false;
    if (ctx.avoidMultiStage && f.tags.includes("multi-stage")) return false;
    if (ctx.preferFast && f.tags.includes("multi-stage")) return false;
    // Cooldown: if shown in last cooldownFloors among recent
    if (f.cooldownFloors > 0) {
      const lastIdx = [...recent].reverse().indexOf(f.id);
      if (lastIdx >= 0 && lastIdx < f.cooldownFloors) return false;
    }
    return true;
  });

  const pool = candidates.length > 0 ? candidates : familiesForCategory(category).filter(
    (f) =>
      !f.bossOnly &&
      !f.eliteOnly &&
      f.minDifficulty <= ctx.difficulty &&
      ctx.unlockedFamilies.includes(f.id)
  );

  const safe =
    pool.length > 0
      ? pool
      : familiesForCategory(category).filter((f) => !f.bossOnly && !f.eliteOnly);

  const scored = safe.map((f) => {
    let w = f.weight;
    const times = recent.filter((id) => id === f.id).length;
    if (times >= 2) w *= 0.15;
    else if (times === 1) w *= 0.45;
    if (ctx.preferFast && (f.tags.includes("speed") || f.minTimeLimitMs)) w *= 1.3;
    return { f, w };
  });

  const total = scored.reduce((s, x) => s + x.w, 0) || 1;
  let roll = ctx.rng() * total;
  for (const item of scored) {
    roll -= item.w;
    if (roll <= 0) return item.f.id;
  }
  return scored[scored.length - 1]?.f.id ?? "sequence";
}

export function applyFamilyDifficultyAdjust(
  familyId: string,
  baseDifficulty: number,
  familyStats?: Record<string, { accuracy: number; attempts: number }>
): number {
  const meta = getFamilyMeta(familyId);
  if (!meta) return baseDifficulty;
  const stats = familyStats?.[familyId];
  let d = baseDifficulty;
  if (stats && stats.attempts >= 5) {
    if (stats.accuracy < 0.45) d -= 1;
    else if (stats.accuracy > 0.85) d += 1;
  }
  return Math.min(meta.maxDifficulty, Math.max(meta.minDifficulty, d));
}
