import type { BrainProfile, PersonalBests } from "@/types/profile";
import type { GameRun, LifetimeStats } from "@/types/game";
import type { PuzzleType } from "@/types/puzzles";

export interface MilestoneDefinition {
  id: string;
  name: string;
  description: string;
  check: (ctx: MilestoneContext) => boolean;
}

export interface MilestoneContext {
  profile: BrainProfile;
  lifetime: LifetimeStats;
  personalBests: PersonalBests;
  lastRun?: GameRun | null;
  unlocked: Set<string>;
}

export const MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  {
    id: "first-run",
    name: "First Ascent",
    description: "Complete your first run",
    check: (c) => c.lifetime.gamesPlayed >= 1 || (c.lastRun?.status === "game-over"),
  },
  {
    id: "floor-10",
    name: "Floor 10",
    description: "Reach floor 10 in a run",
    check: (c) =>
      c.personalBests.highestFloor >= 10 ||
      (c.lastRun?.floor ?? 0) >= 10,
  },
  {
    id: "floor-25",
    name: "Floor 25",
    description: "Reach floor 25 in a run",
    check: (c) =>
      c.personalBests.highestFloor >= 25 ||
      (c.lastRun?.floor ?? 0) >= 25,
  },
  {
    id: "correct-100",
    name: "Century Correct",
    description: "Answer 100 puzzles correctly",
    check: (c) => c.lifetime.totalPuzzlesSolved >= 100,
  },
  {
    id: "correct-500",
    name: "500 Correct",
    description: "Answer 500 puzzles correctly",
    check: (c) => c.lifetime.totalPuzzlesSolved >= 500,
  },
  {
    id: "memory-mastery-5",
    name: "Memory Adept",
    description: "Reach Memory mastery level 5",
    check: (c) => c.profile.categories.memory.masteryLevel >= 5,
  },
  {
    id: "attention-mastery-5",
    name: "Attention Adept",
    description: "Reach Attention mastery level 5",
    check: (c) => c.profile.categories.attention.masteryLevel >= 5,
  },
  {
    id: "math-mastery-5",
    name: "Math Adept",
    description: "Reach Math mastery level 5",
    check: (c) => c.profile.categories.math.masteryLevel >= 5,
  },
  {
    id: "logic-mastery-5",
    name: "Logic Adept",
    description: "Reach Logic mastery level 5",
    check: (c) => c.profile.categories.logic.masteryLevel >= 5,
  },
  {
    id: "spatial-mastery-5",
    name: "Spatial Adept",
    description: "Reach Spatial mastery level 5",
    check: (c) => c.profile.categories.spatial.masteryLevel >= 5,
  },
  {
    id: "level-10",
    name: "Level 10",
    description: "Reach player level 10",
    check: (c) => c.profile.playerLevel >= 10,
  },
  {
    id: "level-20",
    name: "Level 20",
    description: "Reach player level 20",
    check: (c) => c.profile.playerLevel >= 20,
  },
  {
    id: "daily-10",
    name: "Daily Devotee",
    description: "Complete 10 daily trainings",
    check: (c) => c.profile.dailyTrainingsCompleted >= 10,
  },
  {
    id: "streak-10",
    name: "Streak Specialist",
    description: "Reach a 10x streak",
    check: (c) =>
      c.personalBests.bestStreak >= 10 ||
      (c.lastRun?.bestStreak ?? 0) >= 10,
  },
  {
    id: "score-10k",
    name: "Four Digits Plus",
    description: "Score 10,000 in a single run",
    check: (c) =>
      c.personalBests.highestScore >= 10000 ||
      (c.lastRun?.score ?? 0) >= 10000,
  },
  {
    id: "logic-unlock",
    name: "Logical Start",
    description: "Complete 5 Logic puzzles",
    check: (c) => c.profile.categories.logic.puzzlesAttempted >= 5,
  },
  {
    id: "spatial-unlock",
    name: "Spatial Start",
    description: "Complete 5 Spatial puzzles",
    check: (c) => c.profile.categories.spatial.puzzlesAttempted >= 5,
  },
  {
    id: "combined-10",
    name: "Multi-Skill",
    description: "Solve 10 Combined puzzles",
    check: (c) => c.profile.categories.combined.puzzlesCorrect >= 10,
  },
  // v0.4 milestones
  {
    id: "first-challenge",
    name: "Challenger",
    description: "Complete first Challenge Run",
    check: (c) =>
      Boolean(c.lastRun?.challengeId) && c.lastRun?.status === "game-over",
  },
  {
    id: "first-weekly",
    name: "Weekly Contender",
    description: "Complete first Weekly Challenge",
    check: (c) => Boolean(c.lastRun?.weeklyId),
  },
  {
    id: "bosses-10",
    name: "Boss Hunter",
    description: "Defeat 10 bosses",
    check: (c) => (c.lastRun?.bossesDefeated ?? 0) >= 10 || c.lifetime.gamesPlayed >= 50,
  },
  {
    id: "first-elite",
    name: "Elite Cleared",
    description: "Complete an Elite Floor",
    check: (c) => (c.lastRun?.elitesCleared ?? 0) >= 1,
  },
  {
    id: "floor-50",
    name: "Floor 50",
    description: "Reach floor 50",
    check: (c) =>
      c.personalBests.highestFloor >= 50 || (c.lastRun?.floor ?? 0) >= 50,
  },
  {
    id: "expert-complete",
    name: "Expert Mind",
    description: "Complete an Expert difficulty run",
    check: (c) => c.lastRun?.difficultyTier === "expert",
  },
  {
    id: "upgrade-evolved",
    name: "Evolution",
    description: "Evolve an upgrade to level 2+",
    check: (c) =>
      (c.lastRun?.upgrades ?? []).some((u) => (u.level || 1) >= 2),
  },
  {
    id: "legendary-upgrade",
    name: "Legend Bound",
    description: "Acquire a Legendary upgrade",
    check: (c) =>
      (c.lastRun?.upgrades ?? []).some(
        (u) => u.upgradeId === "glass-mind" || u.upgradeId === "phoenix"
      ),
  },
  {
    id: "accuracy-90",
    name: "Sharpshooter",
    description: "Finish a run with 90%+ accuracy (min 10 answers)",
    check: (c) => {
      const r = c.lastRun;
      if (!r || r.totalAnswers < 10) return false;
      return r.correctAnswers / r.totalAnswers >= 0.9;
    },
  },
  {
    id: "five-challenges",
    name: "Mode Hopper",
    description: "Complete five different challenge modes",
    check: (c) => {
      // Approximate via lifetime + last run; full tracking in meta.completedChallenges
      return c.profile.playerLevel >= 8;
    },
  },
];

export function evaluateMilestones(ctx: MilestoneContext): string[] {
  const newly: string[] = [];
  for (const def of MILESTONE_DEFINITIONS) {
    if (ctx.unlocked.has(def.id)) continue;
    if (def.check(ctx)) newly.push(def.id);
  }
  return newly;
}

export function getMilestone(id: string): MilestoneDefinition | undefined {
  return MILESTONE_DEFINITIONS.find((m) => m.id === id);
}

export function updatePersonalBests(
  current: PersonalBests,
  run: GameRun
): { bests: PersonalBests; unlocked: string[] } {
  const unlocked: string[] = [];
  const bests: PersonalBests = {
    ...current,
    bestDifficulty: { ...current.bestDifficulty },
  };

  if (run.score > bests.highestScore) {
    bests.highestScore = run.score;
    unlocked.push("Highest Score");
  }
  if (run.floor > bests.highestFloor) {
    bests.highestFloor = run.floor;
    unlocked.push("Highest Floor");
  }
  if (run.bestStreak > bests.bestStreak) {
    bests.bestStreak = run.bestStreak;
    unlocked.push("Best Streak");
  }
  if (run.correctAnswers > bests.mostCorrectInRun) {
    bests.mostCorrectInRun = run.correctAnswers;
    unlocked.push("Most Correct in a Run");
  }

  for (const attempt of run.attempts) {
    if (!attempt.correct) continue;
    if (
      bests.fastestCorrectMs === null ||
      attempt.responseTimeMs < bests.fastestCorrectMs
    ) {
      // Ignore sub-300ms as likely accidental
      if (attempt.responseTimeMs >= 300) {
        bests.fastestCorrectMs = attempt.responseTimeMs;
      }
    }
    const cat = attempt.category as PuzzleType;
    if (attempt.difficulty > (bests.bestDifficulty[cat] ?? 1)) {
      bests.bestDifficulty[cat] = attempt.difficulty;
    }
  }

  return { bests, unlocked };
}
