import type { BrainProfile } from "@/types/profile";
import type { PuzzleType } from "@/types/puzzles";
import { STANDARD_TRAINING_CATEGORIES } from "@/types/categories";
import { profileRatingToDifficulty } from "./performanceModel";
import { getTrainingRecommendations } from "./trainingRecommendations";
import { shuffle } from "./utils";

export interface DailyPuzzlePlan {
  category: PuzzleType;
  difficulty: number;
}

export interface DailySessionPlan {
  dateKey: string;
  puzzles: DailyPuzzlePlan[];
}

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function generateDailyTraining(
  profile: BrainProfile,
  date = new Date()
): DailySessionPlan {
  const dateKey = todayKey(date);
  const recs = getTrainingRecommendations(profile, 2);
  const prefer = new Set(recs.map((r) => r.category));

  const base = shuffle([...STANDARD_TRAINING_CATEGORIES]);
  // Ensure recommended categories appear early
  const ordered = [
    ...base.filter((c) => prefer.has(c)),
    ...base.filter((c) => !prefer.has(c)),
  ];

  const count = 6;
  const puzzles: DailyPuzzlePlan[] = [];
  for (let i = 0; i < count; i++) {
    const category = ordered[i % ordered.length]!;
    const cat = profile.categories[category];
    const difficulty = profileRatingToDifficulty(cat.rating, cat.confidence);
    puzzles.push({ category, difficulty });
  }

  // Optional combined finale if unlocked
  if (
    profile.unlockedVariants.includes("memory-math") ||
    profile.playerLevel >= 3
  ) {
    const combinedDiff = profileRatingToDifficulty(
      profile.categories.combined.rating,
      profile.categories.combined.confidence
    );
    puzzles.push({ category: "combined", difficulty: combinedDiff });
  }

  return { dateKey, puzzles };
}
