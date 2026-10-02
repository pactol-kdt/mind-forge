import { normalizeSeed } from "./seededRandom";
import type { ChallengeDefinition, WeeklyRecord } from "@/types/run";

/** ISO week id like 2026-W40 */
export function getIsoWeekId(date = new Date()): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function createWeeklySeed(weekId: string): string {
  return normalizeSeed(`WEEKLY-${weekId}`);
}

const WEEKLY_THEMES: Array<{
  name: string;
  description: string;
  modifierIds: string[];
  rewardMultiplier: number;
  rules: string[];
}> = [
  {
    name: "Pattern Storm",
    description: "Logic + Spatial frequency increased.",
    modifierIds: ["weekly-pattern-storm"],
    rewardMultiplier: 1.4,
    rules: [
      "Logic and Spatial floors appear more often",
      "Elite floors about every 7 floors",
      "Score multiplier 1.4x",
    ],
  },
  {
    name: "Lightning Week",
    description: "Blitz-style weekly pressure.",
    modifierIds: ["blitz"],
    rewardMultiplier: 1.3,
    rules: ["Shorter timers", "Higher score pace", "Score 1.25x+"],
  },
  {
    name: "Iron Will",
    description: "Endurance-focused week.",
    modifierIds: ["endurance"],
    rewardMultiplier: 1.1,
    rules: ["Extra lives", "Fewer upgrades", "Survive longer"],
  },
  {
    name: "Precision Protocol",
    description: "Mistakes are expensive.",
    modifierIds: ["precision-risk"],
    rewardMultiplier: 1.45,
    rules: ["Double life cost on mistakes", "Elevated score rewards"],
  },
];

export function getWeeklyChallenge(
  weekId = getIsoWeekId()
): ChallengeDefinition & { weekId: string; seed: string } {
  const weekNum = Number(weekId.split("-W")[1] ?? "1");
  const theme = WEEKLY_THEMES[Math.abs(weekNum - 1) % WEEKLY_THEMES.length]!;
  return {
    id: `weekly-${weekId}`,
    weekId,
    seed: createWeeklySeed(weekId),
    name: theme.name,
    description: theme.description,
    rules: theme.rules,
    modifierIds: theme.modifierIds,
    rewardMultiplier: theme.rewardMultiplier,
    unlockPlayerLevel: 1,
    objectives: [
      { type: "reach-floor", value: 15 },
      { type: "score", value: 10000 },
    ],
  };
}

export function emptyWeeklyRecord(weekId: string): WeeklyRecord {
  return {
    weekId,
    attempts: 0,
    bestScore: 0,
    highestFloor: 0,
    bestAccuracy: 0,
    completed: false,
  };
}

export function updateWeeklyRecord(
  current: WeeklyRecord | undefined,
  result: {
    weekId: string;
    score: number;
    floor: number;
    accuracy: number;
    completed: boolean;
  }
): WeeklyRecord {
  const base = current ?? emptyWeeklyRecord(result.weekId);
  return {
    weekId: result.weekId,
    attempts: base.attempts + 1,
    bestScore: Math.max(base.bestScore, result.score),
    highestFloor: Math.max(base.highestFloor, result.floor),
    bestAccuracy: Math.max(base.bestAccuracy, result.accuracy),
    completed: base.completed || result.completed,
  };
}
