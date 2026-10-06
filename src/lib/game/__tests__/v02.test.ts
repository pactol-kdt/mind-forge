import { describe, expect, it } from "vitest";
import { getFloorType } from "@/lib/game/floorSystem";
import {
  applyDifficultyDelta,
  updateCategoryDifficulty,
} from "@/lib/game/adaptiveDifficulty";
import {
  activateUpgrade,
  consumeSecondChance,
  hasSecondChanceCharge,
  selectUpgradeChoices,
  UPGRADE_CATALOG,
} from "@/lib/game/upgrades";
import { applyScoreMultipliers, streakBonus } from "@/lib/game/scoring";
import {
  createEmptyCategoryStat,
  createInitialCategoryDifficulty,
} from "@/types/game";
import { memoryEngine } from "@/lib/puzzles/memory";
import { sequenceLength } from "@/lib/puzzles/shared";
import { attentionEngine } from "@/lib/puzzles/attention";
import { mathEngine } from "@/lib/puzzles/math";
import { combinedEngine } from "@/lib/puzzles/combined";
import { logicEngine } from "@/lib/puzzles/logic";
import { spatialEngine } from "@/lib/puzzles/spatial";
import { accuracyOf, categoryStrength } from "@/lib/game/statistics";
import {
  estimatePerformance,
  profileRatingToDifficulty,
  updateCategoryFromAttempt,
} from "@/lib/game/performanceModel";
import {
  applyPlayerXp,
  masteryXpGain,
  puzzleXp,
  xpToNextLevel,
} from "@/lib/game/progression";
import { createBrainProfile, createCategoryProfile } from "@/types/profile";
import {
  createDefaultPersistedData,
  normalizeData,
  migrateLifetimeToProfile,
} from "@/lib/storage/gameStorage";
import { evaluateMilestones } from "@/lib/game/milestones";
import { createPersonalBests } from "@/types/profile";
import { DEFAULT_STATS } from "@/types/game";
import { generateDailyTraining } from "@/lib/game/dailyTraining";
import { getTrainingRecommendations } from "@/lib/game/trainingRecommendations";
import { selectPuzzleType } from "@/lib/game/puzzleSelector";
import { ALL_PUZZLE_TYPES } from "@/types/puzzles";

describe("floorSystem", () => {
  it("assigns floor types with boss > upgrade > special priority", () => {
    expect(getFloorType(1)).toBe("normal");
    expect(getFloorType(3)).toBe("upgrade");
    expect(getFloorType(5)).toBe("special");
    expect(getFloorType(10)).toBe("boss");
  });
});

describe("adaptiveDifficulty", () => {
  it("clamps difficulty between 1 and 20", () => {
    const map = applyDifficultyDelta(createInitialCategoryDifficulty({ memory: 19 }), 5);
    expect(map.memory).toBe(20);
    expect(map.logic).toBeDefined();
  });

  it("increases after 3 consecutive correct", () => {
    const stat = createEmptyCategoryStat();
    stat.recentResults = [true, true, true];
    const next = updateCategoryDifficulty(
      createInitialCategoryDifficulty(),
      "memory",
      true,
      1000,
      10000,
      stat
    );
    expect(next.memory).toBe(2);
  });
});

describe("upgrades", () => {
  it("offers unique upgrades", () => {
    const choices = selectUpgradeChoices([], 3);
    expect(choices).toHaveLength(3);
    expect(new Set(choices.map((c) => c.id)).size).toBe(3);
  });

  it("includes logic/spatial upgrades", () => {
    expect(UPGRADE_CATALOG.some((u) => u.id === "clear-thinking")).toBe(true);
    expect(UPGRADE_CATALOG.some((u) => u.id === "spatial-insight")).toBe(true);
  });

  it("second chance consumes once", () => {
    const active = [
      activateUpgrade(UPGRADE_CATALOG.find((u) => u.id === "second-chance")!),
    ];
    expect(hasSecondChanceCharge(active)).toBe(true);
    expect(hasSecondChanceCharge(consumeSecondChance(active))).toBe(false);
  });
});

describe("scoring", () => {
  it("never returns negative score", () => {
    expect(applyScoreMultipliers(0, [0.4])).toBe(0);
    expect(streakBonus(5, 0)).toBe(0);
  });
});

describe("puzzle generation", () => {
  it("memory and math remain valid", () => {
    const mem = memoryEngine.generate(3, { forceVariant: "sequence" });
    expect(memoryEngine.validate(mem, mem.sequence)).toBe(true);
    for (let i = 0; i < 10; i++) {
      const puzzle = mathEngine.generate(5, { forceVariant: "arithmetic" });
      const choices = puzzle.choices as number[];
      expect(new Set(choices).size).toBe(choices.length);
      expect(choices).toContain(puzzle.correctAnswer);
    }
  });

  it("boss distraction always includes correct answer", () => {
    for (let i = 0; i < 20; i++) {
      const puzzle = memoryEngine.generate(10, { forceVariant: "boss" });
      expect(puzzle.distraction!.choices).toContain(
        puzzle.distraction!.correctAnswer
      );
    }
  });

  it("Archivist memorize/recall stay linked without nested boss distraction", () => {
    const memorize = memoryEngine.generate(8, {
      forceVariant: "sequence",
      memorizeOnly: true,
      floor: 10,
    });
    expect(memorize.memorizeOnly).toBe(true);
    expect(memorize.distraction).toBeUndefined();
    expect(memorize.sequence.length).toBeGreaterThanOrEqual(3);

    const recall = memoryEngine.generate(8, {
      forceVariant: "sequence",
      sharedSequence: memorize.sequence,
      sharedSymbolPool: memorize.symbolPool,
      floor: 10,
    });
    expect(recall.skipPresenting).toBe(true);
    expect(recall.sequence).toEqual(memorize.sequence);
    expect(recall.distraction).toBeUndefined();
    expect(memoryEngine.validate(recall, memorize.sequence)).toBe(true);
  });

  it("memory sequence length follows gentler difficulty curve", () => {
    expect(sequenceLength(1)).toBe(3);
    expect(sequenceLength(3)).toBe(3);
    expect(sequenceLength(4)).toBe(4);
    expect(sequenceLength(6)).toBe(4);
    expect(sequenceLength(7)).toBe(5);
    expect(sequenceLength(9)).toBe(5);
    expect(sequenceLength(10)).toBe(6);
    expect(sequenceLength(14)).toBe(7);
    expect(sequenceLength(20)).toBe(8);
  });

  it("early boss memory caps sequence length with distraction", () => {
    const puzzle = memoryEngine.generate(8, {
      forceVariant: "boss",
      floor: 10,
    });
    // base length at diff 8 = 5, distraction -1 = 4, floor≤20 cap 5 → 4
    expect(puzzle.sequence.length).toBeLessThanOrEqual(5);
    expect(puzzle.distraction).toBeTruthy();
  });

  it("logic puzzles have unique choices and one answer", () => {
    for (let i = 0; i < 20; i++) {
      const puzzle = logicEngine.generate(5);
      expect(puzzle.choices).toContain(puzzle.correctAnswer);
      expect(new Set(puzzle.choices).size).toBe(puzzle.choices.length);
      expect(logicEngine.validate(puzzle, puzzle.correctAnswer)).toBe(true);
    }
  });

  it("spatial puzzles have one correct index", () => {
    for (let i = 0; i < 15; i++) {
      const puzzle = spatialEngine.generate(5);
      expect(puzzle.correctIndex).toBeGreaterThanOrEqual(0);
      expect(puzzle.correctIndex).toBeLessThan(puzzle.choices.length);
      expect(spatialEngine.validate(puzzle, puzzle.correctIndex)).toBe(true);
    }
  });

  it("combined variants validate", () => {
    const mm = combinedEngine.generate(6, { forceVariant: "memory-math" });
    expect(combinedEngine.validate(mm, mm.correctAnswer)).toBe(true);
    const ml = combinedEngine.generate(6, { forceVariant: "memory-logic" });
    expect(combinedEngine.validate(ml, ml.correctAnswer)).toBe(true);
  });

  it("attention odd still works", () => {
    const puzzle = attentionEngine.generate(4, { forceVariant: "odd" });
    expect(attentionEngine.validate(puzzle, puzzle.targetIndex!)).toBe(true);
  });
});

describe("performance model", () => {
  it("keeps ratings in bounds and smooth", () => {
    let cat = createCategoryProfile({ rating: 50 });
    const before = cat.rating;
    cat = updateCategoryFromAttempt(cat, {
      correct: true,
      difficulty: 10,
      responseTimeMs: 2000,
      timeLimitMs: 10000,
    });
    expect(cat.rating).toBeGreaterThanOrEqual(1);
    expect(cat.rating).toBeLessThanOrEqual(100);
    expect(Math.abs(cat.rating - before)).toBeLessThan(15);
  });

  it("maps rating to conservative difficulty", () => {
    expect(profileRatingToDifficulty(1, 0)).toBeGreaterThanOrEqual(1);
    expect(profileRatingToDifficulty(100, 1)).toBeLessThanOrEqual(15);
  });

  it("estimate stays bounded", () => {
    expect(estimatePerformance({ correct: false, difficulty: 5, responseTimeMs: 1000 })).toBeLessThan(50);
    expect(estimatePerformance({ correct: true, difficulty: 20, responseTimeMs: 500, timeLimitMs: 10000 })).toBeLessThanOrEqual(100);
  });
});

describe("progression", () => {
  it("xp and mastery are non-negative", () => {
    expect(puzzleXp(5, false)).toBeGreaterThanOrEqual(0);
    expect(masteryXpGain(5, false)).toBeGreaterThanOrEqual(0);
    expect(xpToNextLevel(1)).toBeGreaterThan(0);
    const profile = createBrainProfile();
    const { profile: next, levelsGained } = applyPlayerXp(profile, 10000);
    expect(next.lifetimeXP).toBeGreaterThanOrEqual(0);
    expect(next.playerLevel).toBeGreaterThan(1);
    expect(levelsGained.length).toBeGreaterThan(0);
  });
});

describe("storage migration", () => {
  it("normalizes incomplete data", () => {
    const data = normalizeData({});
    expect(data.schemaVersion).toBe(6);
    expect(data.profile.categories.logic).toBeDefined();
    expect(data.profile.categories.spatial).toBeDefined();
  });

  it("migrates lifetime into profile", () => {
    const lifetime = {
      ...DEFAULT_STATS,
      gamesPlayed: 2,
      totalPuzzlesSolved: 10,
      categoryStats: {
        ...DEFAULT_STATS.categoryStats,
        memory: {
          attempted: 10,
          correct: 8,
          totalResponseMs: 20000,
          highestDifficulty: 6,
          scoreContribution: 1000,
        },
      },
    };
    const profile = migrateLifetimeToProfile(lifetime);
    expect(profile.categories.memory.puzzlesAttempted).toBe(10);
    expect(profile.categories.logic).toBeDefined();
  });

  it("default persisted data is complete", () => {
    const data = createDefaultPersistedData();
    for (const type of ALL_PUZZLE_TYPES) {
      expect(data.profile.categories[type]).toBeDefined();
    }
  });
});

describe("milestones daily recommendations", () => {
  it("evaluates milestones without duplicates", () => {
    const profile = createBrainProfile();
    profile.playerLevel = 10;
    const newly = evaluateMilestones({
      profile,
      lifetime: { ...DEFAULT_STATS, gamesPlayed: 1 },
      personalBests: createPersonalBests(),
      unlocked: new Set(["first-run"]),
    });
    expect(newly.includes("first-run")).toBe(false);
    expect(newly.includes("level-10")).toBe(true);
  });

  it("daily training includes valid categories", () => {
    const plan = generateDailyTraining(createBrainProfile());
    expect(plan.puzzles.length).toBeGreaterThanOrEqual(5);
    for (const p of plan.puzzles) {
      expect(ALL_PUZZLE_TYPES).toContain(p.category);
      expect(p.difficulty).toBeGreaterThanOrEqual(1);
    }
  });

  it("recommendations return valid reasons", () => {
    const recs = getTrainingRecommendations(createBrainProfile(), 2);
    expect(recs.length).toBeGreaterThan(0);
    for (const r of recs) {
      expect([
        "undertrained",
        "recently-challenging",
        "ready-for-harder",
        "balanced-training",
      ]).toContain(r.reason);
    }
  });
});

describe("puzzle selector", () => {
  it("avoids invalid categories", () => {
    for (let i = 0; i < 30; i++) {
      const t = selectPuzzleType(["math", "math"], {
        floor: 12,
        floorType: "normal",
      });
      expect(ALL_PUZZLE_TYPES).toContain(t);
    }
  });
});

describe("statistics", () => {
  it("computes accuracy safely", () => {
    const empty = createEmptyCategoryStat();
    expect(accuracyOf(empty)).toBe(0);
    expect(categoryStrength(empty)).toBe(0);
  });
});
