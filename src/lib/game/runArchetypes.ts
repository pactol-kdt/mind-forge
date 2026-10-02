import type { ActiveUpgrade } from "@/types/game";
import type { PuzzleType } from "@/types/puzzles";
import type { RunConfig } from "@/types/run";
import { getUpgradeById } from "./upgrades";

export type RunArchetype =
  | "Speed Build"
  | "Memory Specialist"
  | "High-Risk Scorer"
  | "Balanced Build"
  | "Survivor"
  | "Streak Build"
  | "Logic Specialist"
  | "Spatial Specialist";

interface ArchetypeInput {
  upgrades: ActiveUpgrade[];
  categoryCounts: Partial<Record<PuzzleType, number>>;
  config: Pick<RunConfig, "specialistCategory" | "challengeId" | "mode">;
}

/** Deterministic archetype from run configuration and upgrades. */
export function getRunArchetype(input: ArchetypeInput): RunArchetype {
  const tagScore: Record<string, number> = {};

  for (const u of input.upgrades) {
    const def = getUpgradeById(u.upgradeId);
    for (const t of def?.tags ?? []) {
      tagScore[t] = (tagScore[t] ?? 0) + (u.level || 1);
    }
  }

  const ids = new Set(input.upgrades.map((u) => u.upgradeId));

  if (ids.has("glass-mind") || (tagScore.risk ?? 0) >= 2) {
    return "High-Risk Scorer";
  }
  if ((tagScore.survival ?? 0) >= 2) return "Survivor";
  if ((tagScore.speed ?? 0) >= 2) return "Speed Build";
  if ((tagScore.streak ?? 0) >= 2) return "Streak Build";
  if (
    (tagScore.memory ?? 0) >= 2 ||
    input.config.specialistCategory === "memory"
  )
    return "Memory Specialist";
  if (
    (tagScore.logic ?? 0) >= 2 ||
    input.config.specialistCategory === "logic"
  )
    return "Logic Specialist";
  if (
    (tagScore.spatial ?? 0) >= 2 ||
    input.config.specialistCategory === "spatial"
  )
    return "Spatial Specialist";

  const counts = Object.entries(input.categoryCounts);
  if (counts.length > 0) {
    counts.sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
    const top = counts[0]!;
    const total = counts.reduce((s, [, n]) => s + (n ?? 0), 0);
    if (total > 0 && (top[1] ?? 0) / total >= 0.45) {
      if (top[0] === "memory") return "Memory Specialist";
      if (top[0] === "logic") return "Logic Specialist";
      if (top[0] === "spatial") return "Spatial Specialist";
    }
  }

  return "Balanced Build";
}
