import type { DifficultyTierDef, RunModifierDef } from "@/types/run";
import type { ModifierEffect } from "@/types/run";

export const RUN_MODIFIERS: Record<string, RunModifierDef> = {
  "precision-risk": {
    id: "precision-risk",
    name: "Precision Risk",
    description: "Mistakes cost more; rewards are higher",
    effects: {
      mistakeLifeCost: 2,
      scoreMultiplier: 1.35,
      startingDifficultyDelta: 1,
    },
  },
  endurance: {
    id: "endurance",
    name: "Endurance",
    description: "More lives, fewer upgrades, lower score",
    effects: {
      startingLivesDelta: 2,
      maxLivesDelta: 2,
      scoreMultiplier: 0.85,
      upgradeEveryN: 5,
    },
  },
  blitz: {
    id: "blitz",
    name: "Blitz",
    description: "Shorter timers, faster scoring",
    effects: {
      timerMultiplier: 0.75,
      scoreMultiplier: 1.25,
      speedTrialBias: 0.35,
      specialEveryN: 4,
    },
  },
  "balanced-variety": {
    id: "balanced-variety",
    name: "Balanced Variety",
    description: "Strong anti-repetition and variety bonuses",
    effects: {
      scoreMultiplier: 1.1,
    },
  },
  "no-mercy": {
    id: "no-mercy",
    name: "No Mercy",
    description: "Harder starts, fewer lives, more elites",
    effects: {
      startingLivesDelta: -1,
      startingDifficultyDelta: 3,
      eliteEveryN: 6,
      bossEveryN: 8,
      scoreMultiplier: 1.6,
      xpMultiplier: 1.35,
    },
  },
  "weekly-pattern-storm": {
    id: "weekly-pattern-storm",
    name: "Pattern Storm",
    description: "Logic and Spatial appear more often",
    effects: {
      categoryWeightBoost: { logic: 2.2, spatial: 2.2 },
      eliteEveryN: 7,
      scoreMultiplier: 1.4,
    },
  },
};

export const DIFFICULTY_TIERS: DifficultyTierDef[] = [
  {
    id: "standard",
    name: "Standard",
    description: "Balanced default experience",
    unlockPlayerLevel: 1,
    effects: { scoreMultiplier: 1, xpMultiplier: 1 },
  },
  {
    id: "advanced",
    name: "Advanced",
    description: "Slightly harder variants and rewards",
    unlockPlayerLevel: 5,
    effects: {
      startingDifficultyDelta: 1,
      scoreMultiplier: 1.15,
      xpMultiplier: 1.1,
      eliteEveryN: 9,
    },
  },
  {
    id: "expert",
    name: "Expert",
    description: "More elites, harder bosses, higher rewards",
    unlockPlayerLevel: 12,
    effects: {
      startingDifficultyDelta: 2,
      scoreMultiplier: 1.5,
      xpMultiplier: 1.25,
      eliteEveryN: 7,
      timerMultiplier: 0.9,
    },
  },
  {
    id: "master",
    name: "Master",
    description: "Late-game pressure with high rewards",
    unlockPlayerLevel: 20,
    effects: {
      startingDifficultyDelta: 3,
      scoreMultiplier: 1.8,
      xpMultiplier: 1.4,
      eliteEveryN: 6,
      bossEveryN: 8,
      timerMultiplier: 0.85,
    },
  },
];

export function getDifficultyTier(id: string): DifficultyTierDef {
  return DIFFICULTY_TIERS.find((t) => t.id === id) ?? DIFFICULTY_TIERS[0]!;
}

export function getModifier(id: string): RunModifierDef | undefined {
  return RUN_MODIFIERS[id];
}

/** Compose modifier effects left-to-right. Multipliers multiply; deltas add. */
export function composeEffects(
  effects: ModifierEffect[]
): Required<
  Pick<
    ModifierEffect,
    | "scoreMultiplier"
    | "xpMultiplier"
    | "timerMultiplier"
    | "startingLivesDelta"
    | "maxLivesDelta"
    | "mistakeLifeCost"
    | "startingDifficultyDelta"
  >
> &
  ModifierEffect {
  const out: ModifierEffect = {
    scoreMultiplier: 1,
    xpMultiplier: 1,
    timerMultiplier: 1,
    startingLivesDelta: 0,
    maxLivesDelta: 0,
    mistakeLifeCost: 1,
    startingDifficultyDelta: 0,
  };

  for (const e of effects) {
    if (e.scoreMultiplier != null)
      out.scoreMultiplier = (out.scoreMultiplier ?? 1) * e.scoreMultiplier;
    if (e.xpMultiplier != null)
      out.xpMultiplier = (out.xpMultiplier ?? 1) * e.xpMultiplier;
    if (e.timerMultiplier != null)
      out.timerMultiplier = (out.timerMultiplier ?? 1) * e.timerMultiplier;
    if (e.startingLivesDelta != null)
      out.startingLivesDelta =
        (out.startingLivesDelta ?? 0) + e.startingLivesDelta;
    if (e.maxLivesDelta != null)
      out.maxLivesDelta = (out.maxLivesDelta ?? 0) + e.maxLivesDelta;
    if (e.mistakeLifeCost != null)
      out.mistakeLifeCost = Math.max(
        out.mistakeLifeCost ?? 1,
        e.mistakeLifeCost
      );
    if (e.startingDifficultyDelta != null)
      out.startingDifficultyDelta =
        (out.startingDifficultyDelta ?? 0) + e.startingDifficultyDelta;
    if (e.upgradeEveryN != null) out.upgradeEveryN = e.upgradeEveryN;
    if (e.specialEveryN != null) out.specialEveryN = e.specialEveryN;
    if (e.eliteEveryN != null) out.eliteEveryN = e.eliteEveryN;
    if (e.bossEveryN != null) out.bossEveryN = e.bossEveryN;
    if (e.speedTrialBias != null) out.speedTrialBias = e.speedTrialBias;
    if (e.streakOnMissKeep != null) out.streakOnMissKeep = e.streakOnMissKeep;
    if (e.categoryWeightBoost) {
      out.categoryWeightBoost = {
        ...(out.categoryWeightBoost ?? {}),
        ...e.categoryWeightBoost,
      };
    }
    if (e.forceCategoryShare) out.forceCategoryShare = e.forceCategoryShare;
  }

  return out as Required<
    Pick<
      ModifierEffect,
      | "scoreMultiplier"
      | "xpMultiplier"
      | "timerMultiplier"
      | "startingLivesDelta"
      | "maxLivesDelta"
      | "mistakeLifeCost"
      | "startingDifficultyDelta"
    >
  > &
    ModifierEffect;
}
