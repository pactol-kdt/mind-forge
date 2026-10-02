/**
 * Build composed run modifiers for a start configuration.
 *
 * Modifier pipeline order:
 * 1. Base puzzle values
 * 2. Category / adaptive difficulty
 * 3. Persistent profile starting difficulties
 * 4. Challenge / weekly modifiers
 * 5. Difficulty tier modifiers
 * 6. Floor modifiers (elite/special/boss)
 * 7. Active upgrade effects
 * 8. Final puzzle configuration
 */
import type { RunConfig, ModifierEffect } from "@/types/run";
import { getChallenge } from "./challenges";
import {
  composeEffects,
  getDifficultyTier,
  getModifier,
} from "./modifiers";
import { getWeeklyChallenge } from "./weeklyChallenge";
import {
  normalizeSeed,
  randomSeedString,
} from "./seededRandom";
import type { PuzzleType } from "@/types/puzzles";

export function resolveRunConfig(
  partial: Partial<RunConfig> & { mode?: RunConfig["mode"] }
): RunConfig {
  const mode = partial.mode ?? "standard";
  let seed = partial.seed ? normalizeSeed(partial.seed) : randomSeedString();
  let challengeId = partial.challengeId;
  let weeklyId = partial.weeklyId;
  const specialistCategory = partial.specialistCategory;

  if (mode === "weekly") {
    const weekly = getWeeklyChallenge();
    weeklyId = weekly.weekId;
    challengeId = weekly.id;
    seed = weekly.seed;
  }

  return {
    mode,
    challengeId,
    difficultyTier: partial.difficultyTier ?? "standard",
    seed,
    specialistCategory,
    weeklyId,
  };
}

export function composeRunEffects(config: RunConfig): ModifierEffect {
  const effects: ModifierEffect[] = [];

  const tier = getDifficultyTier(config.difficultyTier);
  effects.push(tier.effects);

  if (config.mode === "weekly") {
    const weekly = getWeeklyChallenge(config.weeklyId);
    for (const id of weekly.modifierIds) {
      const m = getModifier(id);
      if (m) effects.push(m.effects);
    }
  } else if (config.challengeId) {
    const challenge = getChallenge(config.challengeId);
    if (challenge) {
      for (const id of challenge.modifierIds) {
        const m = getModifier(id);
        if (m) effects.push(m.effects);
      }
      if (challenge.id === "specialist" && config.specialistCategory) {
        effects.push({
          forceCategoryShare: {
            category: config.specialistCategory,
            share: 0.5,
          },
          // Specialist category score handled in scoring via specialistCategory on run
        });
      }
    }
  }

  return composeEffects(effects);
}

export function modeBestKey(config: RunConfig): string {
  if (config.mode === "weekly") return `weekly:${config.weeklyId ?? "current"}`;
  if (config.mode === "challenge" && config.challengeId)
    return `challenge:${config.challengeId}`;
  if (config.mode === "daily") return "daily";
  if (config.mode === "seeded") return "seeded";
  return `standard:${config.difficultyTier}`;
}

export const SPECIALIST_CATEGORIES: PuzzleType[] = [
  "memory",
  "attention",
  "math",
  "logic",
  "spatial",
];
