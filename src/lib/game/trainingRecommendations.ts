import type { BrainProfile } from "@/types/profile";
import type { PuzzleType } from "@/types/puzzles";
import { STANDARD_TRAINING_CATEGORIES } from "@/types/categories";
import { CATEGORY_CONFIG } from "@/types/categories";

export type RecommendationReason =
  | "undertrained"
  | "recently-challenging"
  | "ready-for-harder"
  | "balanced-training";

export interface TrainingRecommendation {
  category: PuzzleType;
  reason: RecommendationReason;
  message: string;
}

const REASON_COPY: Record<
  RecommendationReason,
  (label: string) => string
> = {
  undertrained: (label) =>
    `You have played fewer ${label} puzzles recently.`,
  "recently-challenging": (label) =>
    `${label} has been your most challenging category recently.`,
  "ready-for-harder": (label) =>
    `Your ${label} training rating is rising — ready for a bit more challenge.`,
  "balanced-training": () =>
    `A balanced session is recommended after focused training.`,
};

export function getTrainingRecommendations(
  profile: BrainProfile,
  limit = 2
): TrainingRecommendation[] {
  const now = Date.now();
  const DAY = 86_400_000;
  const results: TrainingRecommendation[] = [];

  const scored = STANDARD_TRAINING_CATEGORIES.map((category) => {
    const cat = profile.categories[category];
    const daysSince = cat.lastPlayedAt
      ? (now - cat.lastPlayedAt) / DAY
      : 99;
    const undertrainedScore = daysSince * 2 + (1 - cat.confidence) * 5;
    const challengingScore =
      cat.rollingAccuracy > 0 && cat.puzzlesAttempted >= 5
        ? (1 - cat.rollingAccuracy) * 10
        : 0;
    const readyScore =
      cat.rollingAccuracy >= 0.8 && cat.confidence > 0.3 ? 6 : 0;

    return { category, undertrainedScore, challengingScore, readyScore, cat };
  });

  const under = [...scored].sort(
    (a, b) => b.undertrainedScore - a.undertrainedScore
  )[0];
  if (under && under.undertrainedScore > 3) {
    results.push({
      category: under.category,
      reason: "undertrained",
      message: REASON_COPY.undertrained(
        CATEGORY_CONFIG[under.category].label
      ),
    });
  }

  const hard = [...scored]
    .filter((s) => s.cat.puzzlesAttempted >= 5)
    .sort((a, b) => b.challengingScore - a.challengingScore)[0];
  if (
    hard &&
    hard.challengingScore > 3 &&
    !results.some((r) => r.category === hard.category)
  ) {
    results.push({
      category: hard.category,
      reason: "recently-challenging",
      message: REASON_COPY["recently-challenging"](
        CATEGORY_CONFIG[hard.category].label
      ),
    });
  }

  const ready = [...scored]
    .filter((s) => s.readyScore > 0)
    .sort((a, b) => b.readyScore - a.readyScore)[0];
  if (
    ready &&
    results.length < limit &&
    !results.some((r) => r.category === ready.category)
  ) {
    results.push({
      category: ready.category,
      reason: "ready-for-harder",
      message: REASON_COPY["ready-for-harder"](
        CATEGORY_CONFIG[ready.category].label
      ),
    });
  }

  if (results.length === 0) {
    results.push({
      category: "memory",
      reason: "balanced-training",
      message: REASON_COPY["balanced-training"]("Memory"),
    });
  }

  return results.slice(0, limit);
}
