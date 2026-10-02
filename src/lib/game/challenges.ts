import type { ChallengeDefinition } from "@/types/run";

export const CHALLENGE_DEFINITIONS: ChallengeDefinition[] = [
  {
    id: "precision",
    name: "Precision Run",
    description: "Higher risk. Higher score.",
    rules: [
      "Incorrect answers cost 2 lives",
      "Score rewards increased (1.35x)",
      "Slightly higher starting difficulty",
    ],
    modifierIds: ["precision-risk"],
    rewardMultiplier: 1.35,
    unlockPlayerLevel: 1,
    objectives: [{ type: "reach-floor", value: 12 }],
  },
  {
    id: "endurance",
    name: "Endurance Run",
    description: "Longer runs. More lives.",
    rules: [
      "+2 starting lives",
      "Upgrades every 5 floors",
      "Score multiplier 0.85x",
    ],
    modifierIds: ["endurance"],
    rewardMultiplier: 0.85,
    unlockPlayerLevel: 1,
    objectives: [{ type: "reach-floor", value: 20 }],
  },
  {
    id: "blitz",
    name: "Blitz Run",
    description: "Short timers. Faster scoring.",
    rules: [
      "Timers reduced to 75%",
      "Score 1.25x",
      "More speed-focused special floors",
    ],
    modifierIds: ["blitz"],
    rewardMultiplier: 1.25,
    unlockPlayerLevel: 3,
    objectives: [{ type: "score", value: 8000 }],
  },
  {
    id: "specialist",
    name: "Specialist Run",
    description: "Train one category heavily.",
    rules: [
      "Choose a focus category",
      "~50% floors from that category",
      "+30% score in that category",
    ],
    modifierIds: [],
    rewardMultiplier: 1.2,
    unlockPlayerLevel: 4,
    specialistPick: true,
    objectives: [{ type: "reach-floor", value: 15 }],
  },
  {
    id: "balanced-mind",
    name: "Balanced Mind",
    description: "Rewards variety across categories.",
    rules: [
      "Strong anti-repetition",
      "Bonus for consecutive distinct categories",
      "Slightly more combined puzzles",
    ],
    modifierIds: ["balanced-variety"],
    rewardMultiplier: 1.1,
    unlockPlayerLevel: 2,
    objectives: [{ type: "accuracy", value: 0.8 }],
  },
  {
    id: "no-mercy",
    name: "No Mercy",
    description: "Late unlock. High pressure, high reward.",
    rules: [
      "-1 starting life",
      "+3 starting difficulty",
      "More elites and denser bosses",
      "Score 1.6x · XP 1.35x",
    ],
    modifierIds: ["no-mercy"],
    rewardMultiplier: 1.6,
    unlockPlayerLevel: 15,
    objectives: [
      { type: "reach-floor", value: 15 },
      { type: "bosses-defeated", value: 1 },
    ],
  },
];

export function getChallenge(id: string): ChallengeDefinition | undefined {
  return CHALLENGE_DEFINITIONS.find((c) => c.id === id);
}

export function getAvailableChallenges(
  playerLevel: number,
  unlockedIds: string[]
): ChallengeDefinition[] {
  const unlocked = new Set(unlockedIds);
  return CHALLENGE_DEFINITIONS.filter(
    (c) =>
      c.unlockPlayerLevel <= playerLevel ||
      unlocked.has(c.id) ||
      c.unlockPlayerLevel <= 1
  );
}
