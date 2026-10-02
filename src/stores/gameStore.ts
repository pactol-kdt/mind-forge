"use client";

import { create } from "zustand";
import {
  createInitialRun,
  INITIAL_LIVES,
  MAX_LIVES,
  type FeedbackState,
  type GameRun,
  type GameUpgrade,
  type PuzzlePhase,
  type SpecialModifier,
} from "@/types/game";
import type { Puzzle, PuzzleAnswer, PuzzleType } from "@/types/puzzles";
import type { RunConfig } from "@/types/run";
import {
  formatCorrectAnswer,
  generatePuzzle,
  puzzleInitialPhase,
  scoreAnswer,
  validateAnswer,
} from "@/lib/puzzles";
import { applyScoreMultipliers, streakBonus } from "@/lib/game/scoring";
import { updateCategoryDifficulty } from "@/lib/game/adaptiveDifficulty";
import {
  getBossAnnouncement,
  getFloorConfig,
  getSpecialAnnouncement,
  getUpgradeAnnouncement,
} from "@/lib/game/floorSystem";
import {
  activateUpgrade,
  consumeSecondChance,
  getBalancedMindBonus,
  getCategoryScorePct,
  getCalmMindRelief,
  getGlassMind,
  getHighRisk,
  getMomentumBonus,
  getPrecisionBonus,
  getSteadyHandKeep,
  getStreakBonusPct,
  getXpBonusPct,
  hasSecondChanceCharge,
  selectUpgradeChoices,
  shouldGrantLifeFromShield,
  tryPhoenix,
} from "@/lib/game/upgrades";
import {
  appendRunHistory,
  loadGameData,
  saveGameData,
  updateStatsAfterRun,
  upsertModeBest,
  upsertWeeklyHistory,
} from "@/lib/storage/gameStorage";
import {
  playCorrect,
  playGameOver,
  playIncorrect,
  playUpgrade,
  setMuted,
} from "@/lib/game/feedbackFx";
import { startingDifficultiesFromProfile } from "@/lib/game/performanceModel";
import { applyRunToProfile } from "@/lib/game/performanceModel";
import {
  applyCategoryMasteryGains,
  applyPlayerXp,
  puzzleXp,
  runBonusXp,
} from "@/lib/game/progression";
import {
  evaluateMilestones,
  updatePersonalBests,
} from "@/lib/game/milestones";
import {
  generateDailyTraining,
  todayKey,
  type DailyPuzzlePlan,
} from "@/lib/game/dailyTraining";
import { composeRunEffects, modeBestKey, resolveRunConfig } from "@/lib/game/runConfig";
import { createSeededRng, deriveSeed } from "@/lib/game/seededRandom";
import { pickBossForFloor, getBoss } from "@/lib/game/bosses";
import { getRunArchetype } from "@/lib/game/runArchetypes";
import { evaluateUnlocks } from "@/lib/progression/unlocks";
import { evaluateObjectives } from "@/lib/challenges/challengeObjectives";
import { getChallenge } from "@/lib/game/challenges";
import { getWeeklyChallenge, updateWeeklyRecord } from "@/lib/game/weeklyChallenge";
import { clamp } from "@/lib/game/utils";
import { MIN_DIFFICULTY, MAX_DIFFICULTY } from "@/types/game";

interface GameStore {
  run: GameRun;
  puzzle: Puzzle | null;
  phase: PuzzlePhase;
  feedback: FeedbackState | null;
  recentTypes: PuzzleType[];
  puzzleStartedAt: number | null;
  lastPointsEarned: number;
  distractionCleared: boolean;
  dailyPlan: DailyPuzzlePlan[];
  dailyIndex: number;

  startRun: (config?: Partial<RunConfig>) => void;
  startDaily: () => void;
  submitAnswer: (answer: PuzzleAnswer) => void;
  submitDistraction: (answer: number) => void;
  timeout: () => void;
  advanceAfterFeedback: () => void;
  selectUpgrade: (upgradeId: string, specialistCategory?: PuzzleType) => void;
  rerollUpgrades: () => void;
  dismissAnnouncement: () => void;
  resetToIdle: () => void;
  beginAnswering: () => void;
  choosePath: (category: PuzzleType) => void;
  chooseGamble: (risk: boolean) => void;
}

const FEEDBACK_MS = 1200;
const UPGRADE_CONFIRM_MS = 700;

function syncMuteFromSettings() {
  try {
    const data = loadGameData();
    setMuted(!data.settings.sound);
  } catch {
    /* ignore */
  }
}

function pacingParams(run: GameRun) {
  return {
    seed: run.seed,
    effects: {
      upgradeEveryN: undefined as number | undefined,
      specialEveryN: undefined as number | undefined,
      eliteEveryN: undefined as number | undefined,
      bossEveryN: undefined as number | undefined,
      speedTrialBias: undefined as number | undefined,
      ...composeRunEffects({
        mode: run.runMode,
        challengeId: run.challengeId,
        difficultyTier: run.difficultyTier,
        seed: run.seed,
        specialistCategory: run.specialistCategory,
        weeklyId: run.weeklyId,
      }),
    },
  };
}

function buildPuzzleForFloor(
  run: GameRun,
  recentTypes: PuzzleType[],
  unlockedVariants: string[],
  forceCategory?: PuzzleType
): { puzzle: Puzzle; recentTypes: PuzzleType[]; runPatch: Partial<GameRun> } {
  const params = pacingParams(run);
  const floorCfg = forceCategory
    ? { floor: run.floor, type: "normal" as const, rewardMultiplier: 1 }
    : getFloorConfig(run.floor, params);

  let specialModifier: SpecialModifier | null = null;
  let announcement: string | null = null;
  let perfectMindArmed = false;
  let bossId = run.bossId;
  let bossStageIndex = run.bossStageIndex;
  let eliteType = run.eliteType;
  let forceCat = forceCategory ?? run.choiceCategory;

  if (!forceCategory) {
    if (floorCfg.type === "boss") {
      const data = loadGameData();
      const boss = pickBossForFloor(
        run.floor,
        run.seed,
        data.meta.unlockedBossIds
      );
      bossId = boss.id;
      bossStageIndex = 0;
      announcement = getBossAnnouncement(boss.name);
      const stage = boss.stages[0];
      if (stage) forceCat = stage.category;
    } else if (floorCfg.type === "elite") {
      eliteType = floorCfg.eliteType;
      announcement = floorCfg.announcement ?? "Elite Floor";
    } else if (floorCfg.type === "special" && floorCfg.specialType) {
      specialModifier = floorCfg.specialType as SpecialModifier;
      announcement = getSpecialAnnouncement(specialModifier);
      perfectMindArmed = specialModifier === "perfect-mind";
    } else if (floorCfg.type === "choice") {
      announcement =
        floorCfg.announcement ??
        "CHOOSE YOUR PATH — Memory Trial or Logic Trial";
    }
  }

  const effects = params.effects;
  const rng = createSeededRng(deriveSeed(run.seed, "puzzle", run.floor, bossStageIndex));

  let difficultyDelta = effects.startingDifficultyDelta ?? 0;
  if (bossId && floorCfg.type === "boss") {
    const boss = getBoss(bossId);
    const stage = boss?.stages[bossStageIndex];
    difficultyDelta += (boss?.difficultyModifier ?? 0) + (stage?.difficultyBonus ?? 0);
  }

  const puzzle = generatePuzzle({
    floor: run.floor,
    floorType: forceCategory ? "normal" : floorCfg.type,
    recentTypes,
    categoryDifficulty: run.categoryDifficulty,
    upgrades: run.upgrades,
    specialModifier,
    forceCategory: forceCat,
    unlockedVariants,
    timerMultiplier: run.timerMultiplier,
    difficultyDelta,
    categoryWeightBoost: effects.categoryWeightBoost,
    forceCategoryShare:
      run.specialistCategory
        ? { category: run.specialistCategory, share: 0.5 }
        : effects.forceCategoryShare,
    combinedBias: run.challengeId === "balanced-mind" ? 0.14 : 0.08,
    rng,
    eliteType,
    seed: run.seed,
    recentFamilies: run.recentFamilies,
    challengeId: run.challengeId,
  });

  return {
    puzzle,
    recentTypes: [...recentTypes, puzzle.type].slice(-8),
    runPatch: {
      floorType: forceCategory ? "normal" : floorCfg.type,
      specialModifier,
      announcement,
      perfectMindArmed,
      bossId,
      bossStageIndex,
      eliteType: floorCfg.type === "elite" ? eliteType : undefined,
      recentFamilies: [...run.recentFamilies, puzzle.family ?? puzzle.variant].slice(-12),
      status: announcement
        ? "announce"
        : run.mode === "daily"
          ? "daily"
          : "playing",
    },
  };
}

function enterFloor(
  set: (partial: Partial<GameStore> | ((s: GameStore) => Partial<GameStore>)) => void,
  get: () => GameStore,
  nextFloor: number,
  baseRun: GameRun,
  recentTypes: PuzzleType[]
) {
  const data = loadGameData();
  const unlocked = data.profile.unlockedVariants;

  if (baseRun.mode === "daily") {
    const { dailyPlan, dailyIndex } = get();
    const nextIndex = dailyIndex + 1;
    if (nextIndex >= dailyPlan.length) {
      finalizeRun(set, get, { ...baseRun, floor: nextFloor });
      return;
    }
    const plan = dailyPlan[nextIndex]!;
    const draft: GameRun = {
      ...baseRun,
      floor: nextFloor,
      status: "daily",
    };
    const { puzzle, recentTypes: nextRecent, runPatch } = buildPuzzleForFloor(
      draft,
      recentTypes,
      unlocked,
      plan.category
    );
    puzzle.difficulty = plan.difficulty;
    const phase = puzzleInitialPhase(puzzle);
    set({
      run: { ...draft, ...runPatch, status: "daily" },
      puzzle,
      recentTypes: nextRecent,
      phase,
      feedback: null,
      puzzleStartedAt: phase === "answering" ? Date.now() : null,
      lastPointsEarned: 0,
      distractionCleared: false,
      dailyIndex: nextIndex,
    });
    return;
  }

  const params = pacingParams(baseRun);
  const floorCfg = getFloorConfig(nextFloor, params);
  let lives = baseRun.lives;
  const maxLives = baseRun.maxLives;
  if (shouldGrantLifeFromShield(baseRun.upgrades, nextFloor)) {
    lives = Math.min(maxLives, lives + 1);
  }

  if (floorCfg.type === "upgrade") {
    const choices = selectUpgradeChoices(baseRun.upgrades, 3, {
      seed: baseRun.seed,
      unlockedUpgradeIds: data.meta.unlockedUpgradeIds,
    });
    set({
      run: {
        ...baseRun,
        floor: nextFloor,
        lives,
        maxLives,
        floorType: "upgrade",
        specialModifier: null,
        pendingUpgradeChoices: choices,
        announcement: getUpgradeAnnouncement(),
        status: "upgrade",
        perfectMindArmed: false,
        eliteType: undefined,
      },
      puzzle: null,
      phase: "answering",
      feedback: null,
      puzzleStartedAt: null,
      lastPointsEarned: 0,
      distractionCleared: false,
      recentTypes,
    });
    return;
  }

  // Upgrade forge: evolve owned upgrade via choice screen filtered to owned
  if (floorCfg.type === "special" && floorCfg.specialType === "upgrade-forge") {
    const ownedDefs = baseRun.upgrades
      .map((a) => {
        const fromCatalog = selectUpgradeChoices([a], 1, {
          seed: baseRun.seed,
          unlockedUpgradeIds: data.meta.unlockedUpgradeIds,
        })[0];
        return fromCatalog;
      })
      .filter(Boolean) as GameUpgrade[];
    const forgeChoices =
      ownedDefs.length > 0
        ? ownedDefs.slice(0, 3)
        : selectUpgradeChoices(baseRun.upgrades, 3, {
            seed: baseRun.seed,
            unlockedUpgradeIds: data.meta.unlockedUpgradeIds,
          });
    set({
      run: {
        ...baseRun,
        floor: nextFloor,
        lives,
        maxLives,
        floorType: "special",
        specialModifier: "upgrade-forge",
        pendingUpgradeChoices: forgeChoices,
        announcement: getSpecialAnnouncement("upgrade-forge"),
        status: "upgrade",
        perfectMindArmed: false,
      },
      puzzle: null,
      phase: "answering",
      feedback: null,
      puzzleStartedAt: null,
      lastPointsEarned: 0,
      distractionCleared: false,
      recentTypes,
    });
    return;
  }

  const draft: GameRun = {
    ...baseRun,
    floor: nextFloor,
    lives,
    maxLives,
    choiceCategory: undefined,
    gambleRisk: undefined,
  };
  const { puzzle, recentTypes: nextRecent, runPatch } = buildPuzzleForFloor(
    draft,
    recentTypes,
    unlocked
  );
  const phase = puzzleInitialPhase(puzzle);

  set({
    run: {
      ...draft,
      ...runPatch,
      status: runPatch.announcement ? "announce" : "playing",
    },
    puzzle,
    recentTypes: nextRecent,
    // Keep the real initial phase even during announce — overlay blocks input.
    // Forcing "presenting" on math/etc. left the UI frozen after Continue.
    phase,
    feedback: null,
    puzzleStartedAt:
      !runPatch.announcement && phase === "answering" ? Date.now() : null,
    lastPointsEarned: 0,
    distractionCleared: false,
  });
}

function finalizeRun(
  set: (partial: Partial<GameStore>) => void,
  get: () => GameStore,
  run: GameRun
) {
  const data = loadGameData();
  syncMuteFromSettings();

  let xp = run.attempts.reduce(
    (s, a) => s + puzzleXp(a.difficulty, a.correct),
    0
  );
  if (run.mode === "run") {
    const accuracy =
      run.totalAnswers === 0 ? 0 : run.correctAnswers / run.totalAnswers;
    xp += runBonusXp(run.floor, accuracy);
  }
  xp = Math.round(xp * run.xpMultiplier * (1 + getXpBonusPct(run.upgrades)));
  xp = Math.max(0, xp);

  const challenge = run.challengeId ? getChallenge(run.challengeId) : undefined;
  const weekly =
    run.runMode === "weekly"
      ? getWeeklyChallenge(run.weeklyId)
      : undefined;
  const objectives = weekly?.objectives ?? challenge?.objectives;
  const accuracy =
    run.totalAnswers === 0 ? 0 : run.correctAnswers / run.totalAnswers;
  const objResult = evaluateObjectives(objectives, {
    floorReached: run.floor,
    score: run.score,
    accuracy,
    bossesDefeated: run.bossesDefeated,
    elitesCleared: run.elitesCleared,
  });
  if (objResult.allComplete && objectives && objectives.length > 0) {
    xp += 200;
  }

  const masteryGains: Partial<Record<PuzzleType, number>> = {};
  for (const a of run.attempts) {
    masteryGains[a.category] =
      (masteryGains[a.category] ?? 0) + (a.correct ? 5 + a.difficulty : 1);
  }

  let profile = data.profile;
  const { profile: rated, ratingDeltas } = applyRunToProfile(
    profile,
    run.attempts.map((a) => ({
      category: a.category,
      correct: a.correct,
      difficulty: a.difficulty,
      responseTimeMs: a.responseTimeMs,
    }))
  );
  profile = rated;

  const { profile: mastered, masteryLevelUps } = applyCategoryMasteryGains(
    profile,
    masteryGains
  );
  profile = mastered;

  const { profile: leveled, levelsGained } = applyPlayerXp(profile, xp);
  profile = leveled;

  if (run.mode === "daily") {
    profile = {
      ...profile,
      dailyTrainingsCompleted: profile.dailyTrainingsCompleted + 1,
    };
  } else {
    profile = { ...profile, totalRuns: profile.totalRuns + 1 };
  }

  const archetype = getRunArchetype({
    upgrades: run.upgrades,
    categoryCounts: Object.fromEntries(
      Object.entries(run.categoryStats).map(([k, v]) => [k, v.attempted])
    ) as Partial<Record<PuzzleType, number>>,
    config: {
      mode: run.runMode,
      specialistCategory: run.specialistCategory,
      challengeId: run.challengeId,
    },
  });

  const { bests, unlocked: newBests } = updatePersonalBests(
    data.personalBests,
    run
  );

  const lifetime = updateStatsAfterRun({
    score: run.score,
    floor: run.floor,
    bestStreak: run.bestStreak,
    correctAnswers: run.correctAnswers,
    categoryStats: run.categoryStats,
  });

  const newlyMilestones = evaluateMilestones({
    profile,
    lifetime,
    personalBests: bests,
    lastRun: { ...run, status: "game-over", archetype },
    unlocked: new Set(data.milestones),
  });

  const daily =
    run.mode === "daily"
      ? {
          dateKey: todayKey(),
          completed: true,
          correct: run.correctAnswers,
          total: run.totalAnswers,
        }
      : data.daily;

  const { meta, newlyUnlocked } = evaluateUnlocks({
    profile,
    lifetime,
    milestones: [...data.milestones, ...newlyMilestones],
    meta: data.meta,
    highestFloorEver: Math.max(lifetime.highestFloor, run.floor),
    bossesDefeated: run.bossesDefeated,
    elitesCleared: run.elitesCleared,
  });

  let nextMeta = { ...meta };
  if (run.challengeId && objResult.allComplete) {
    nextMeta = {
      ...nextMeta,
      completedChallenges: {
        ...nextMeta.completedChallenges,
        [run.challengeId]:
          (nextMeta.completedChallenges[run.challengeId] ?? 0) + 1,
      },
    };
  }

  const familyStats = { ...data.familyStats };
  for (const a of run.attempts) {
    const key = a.variant;
    const prev = familyStats[key] ?? {
      attempts: 0,
      correct: 0,
      totalResponseMs: 0,
      highestDifficulty: 1,
    };
    familyStats[key] = {
      attempts: prev.attempts + 1,
      correct: prev.correct + (a.correct ? 1 : 0),
      totalResponseMs: prev.totalResponseMs + a.responseTimeMs,
      highestDifficulty: Math.max(prev.highestDifficulty, a.difficulty),
    };
  }

  const persisted = {
    ...data,
    profile,
    personalBests: bests,
    milestones: [...data.milestones, ...newlyMilestones],
    lifetime,
    daily,
    meta: nextMeta,
    familyStats,
  };
  saveGameData(persisted);

  if (run.mode === "run") {
    appendRunHistory({
      id: typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `run_${crypto.randomUUID()}`
        : `run_${Date.now()}_${run.score}_${run.floor}`,
      timestamp: Date.now(),
      mode: run.runMode,
      seed: run.seed,
      score: run.score,
      floorReached: run.floor,
      accuracy,
      bestStreak: run.bestStreak,
      archetype,
      challengeId: run.challengeId,
      difficultyTier: run.difficultyTier,
      weeklyId: run.weeklyId,
    });
    upsertModeBest(
      modeBestKey({
        mode: run.runMode,
        challengeId: run.challengeId,
        difficultyTier: run.difficultyTier,
        seed: run.seed,
        specialistCategory: run.specialistCategory,
        weeklyId: run.weeklyId,
      }),
      run.score,
      run.floor
    );
    if (run.runMode === "weekly" && run.weeklyId) {
      const prev = loadGameData().weeklyHistory.find(
        (w) => w.weekId === run.weeklyId
      );
      upsertWeeklyHistory(
        updateWeeklyRecord(prev, {
          weekId: run.weeklyId,
          score: run.score,
          floor: run.floor,
          accuracy,
          completed: objResult.allComplete,
        })
      );
    }
  }

  // Non-blocking cloud sync checkpoint (authenticated users only)
  if (typeof window !== "undefined") {
    void import("@/stores/syncStore").then(({ notifyProgressSaved }) => {
      notifyProgressSaved();
    });
  }

  playGameOver();

  set({
    run: {
      ...run,
      status: "game-over",
      xpEarned: xp,
      pendingLevelUps: levelsGained,
      pendingMilestones: newlyMilestones,
      ratingDeltas,
      masteryLevelUps,
      newPersonalBests: newBests,
      archetype,
      pendingUnlocks: newlyUnlocked.map(
        (u) => `${u.title}: ${u.description}`
      ),
      objectiveComplete: objResult.allComplete,
    },
    phase: "feedback",
    puzzle: null,
    feedback: null,
  });
}

export const useGameStore = create<GameStore>((set, get) => ({
  run: createInitialRun(),
  puzzle: null,
  phase: "presenting",
  feedback: null,
  recentTypes: [],
  puzzleStartedAt: null,
  lastPointsEarned: 0,
  distractionCleared: false,
  dailyPlan: [],
  dailyIndex: 0,

  startRun: (partial) => {
    syncMuteFromSettings();
    const data = loadGameData();
    const config = resolveRunConfig(partial ?? {});
    const effects = composeRunEffects(config);
    const diffs = startingDifficultiesFromProfile(data.profile);
    const startDiff = effects.startingDifficultyDelta ?? 0;
    for (const key of Object.keys(diffs) as PuzzleType[]) {
      diffs[key] = clamp(
        diffs[key] + startDiff,
        MIN_DIFFICULTY,
        MAX_DIFFICULTY
      );
    }

    const maxLives = clamp(
      INITIAL_LIVES + (effects.maxLivesDelta ?? 0) + (effects.startingLivesDelta ?? 0),
      1,
      MAX_LIVES + 2
    );
    let lives = clamp(
      INITIAL_LIVES + (effects.startingLivesDelta ?? 0),
      1,
      maxLives
    );

    const base: GameRun = {
      ...createInitialRun({
        status: "playing",
        mode: "run",
        lives,
        maxLives,
        categoryDifficulty: diffs,
        seed: config.seed,
        challengeId: config.challengeId,
        difficultyTier: config.difficultyTier,
        runMode: config.mode,
        weeklyId: config.weeklyId,
        specialistCategory: config.specialistCategory,
        scoreMultiplier: effects.scoreMultiplier ?? 1,
        xpMultiplier: effects.xpMultiplier ?? 1,
        timerMultiplier: effects.timerMultiplier ?? 1,
        mistakeLifeCost: effects.mistakeLifeCost ?? 1,
        upgradeRerolls: 1,
      }),
    };

    // Glass mind applied later when picked; ensure lives never negative
    lives = Math.max(1, lives);
    base.lives = lives;
    base.maxLives = Math.max(lives, maxLives);

    const { puzzle, recentTypes, runPatch } = buildPuzzleForFloor(
      base,
      [],
      data.profile.unlockedVariants
    );
    const phase = puzzleInitialPhase(puzzle);
    set({
      run: {
        ...base,
        ...runPatch,
        status: runPatch.announcement ? "announce" : "playing",
      },
      puzzle,
      recentTypes,
      phase,
      feedback: null,
      puzzleStartedAt:
        phase === "answering" && !runPatch.announcement ? Date.now() : null,
      lastPointsEarned: 0,
      distractionCleared: false,
      dailyPlan: [],
      dailyIndex: 0,
    });
  },

  startDaily: () => {
    syncMuteFromSettings();
    const data = loadGameData();
    const plan = generateDailyTraining(data.profile);
    const diffs = startingDifficultiesFromProfile(data.profile);
    const base = createInitialRun({
      status: "daily",
      mode: "daily",
      runMode: "daily",
      categoryDifficulty: diffs,
      seed: `DAILY-${todayKey()}`,
    });
    const first = plan.puzzles[0]!;
    const { puzzle, recentTypes, runPatch } = buildPuzzleForFloor(
      base,
      [],
      data.profile.unlockedVariants,
      first.category
    );
    puzzle.difficulty = first.difficulty;
    const phase = puzzleInitialPhase(puzzle);
    set({
      run: { ...base, ...runPatch, status: "daily", announcement: null },
      puzzle,
      recentTypes,
      phase,
      feedback: null,
      puzzleStartedAt: phase === "answering" ? Date.now() : null,
      lastPointsEarned: 0,
      distractionCleared: false,
      dailyPlan: plan.puzzles,
      dailyIndex: 0,
    });
  },

  dismissAnnouncement: () => {
    const { run, puzzle } = get();
    if (run.status !== "announce") return;

    // Choice floor: wait for choosePath
    if (run.floorType === "choice" && !run.choiceCategory) {
      return;
    }
    // Gamble floor: wait for chooseGamble
    if (run.specialModifier === "gamble" && run.gambleRisk === undefined) {
      return;
    }

    if (!puzzle) return;
    const phase = puzzleInitialPhase(puzzle);
    set({
      run: {
        ...run,
        status: run.mode === "daily" ? "daily" : "playing",
        announcement: null,
      },
      phase,
      puzzleStartedAt: phase === "answering" ? Date.now() : null,
    });
  },

  choosePath: (category) => {
    const { run, recentTypes } = get();
    if (run.floorType !== "choice") return;
    const data = loadGameData();
    const draft = { ...run, choiceCategory: category, announcement: null, status: "playing" as const };
    const { puzzle, recentTypes: nextRecent, runPatch } = buildPuzzleForFloor(
      draft,
      recentTypes,
      data.profile.unlockedVariants,
      category
    );
    const phase = puzzleInitialPhase(puzzle);
    set({
      run: { ...draft, ...runPatch, announcement: null, status: "playing" },
      puzzle,
      recentTypes: nextRecent,
      phase,
      puzzleStartedAt: phase === "answering" ? Date.now() : null,
    });
  },

  chooseGamble: (risk) => {
    const { run, recentTypes } = get();
    if (run.specialModifier !== "gamble") return;
    const data = loadGameData();
    const draft = {
      ...run,
      gambleRisk: risk,
      announcement: null,
      status: "playing" as const,
      scoreMultiplier: risk ? run.scoreMultiplier * 1.5 : run.scoreMultiplier,
    };
    // Rebuild with difficulty bump if risk
    if (risk) {
      for (const key of Object.keys(draft.categoryDifficulty) as PuzzleType[]) {
        draft.categoryDifficulty = {
          ...draft.categoryDifficulty,
          [key]: clamp(
            draft.categoryDifficulty[key] + 2,
            MIN_DIFFICULTY,
            MAX_DIFFICULTY
          ),
        };
      }
    }
    const { puzzle, recentTypes: nextRecent, runPatch } = buildPuzzleForFloor(
      draft,
      recentTypes,
      data.profile.unlockedVariants
    );
    const phase = puzzleInitialPhase(puzzle);
    set({
      run: { ...draft, ...runPatch, announcement: null, status: "playing" },
      puzzle,
      recentTypes: nextRecent,
      phase,
      puzzleStartedAt: phase === "answering" ? Date.now() : null,
    });
  },

  beginAnswering: () => {
    const { puzzle } = get();
    if (
      puzzle?.type === "memory" &&
      (puzzle.variant === "boss" || puzzle.variant === "interference")
    ) {
      set({ phase: "distraction", puzzleStartedAt: Date.now() });
      return;
    }
    set({ phase: "answering", puzzleStartedAt: Date.now() });
  },

  submitDistraction: (answer) => {
    const { puzzle, phase, run } = get();
    if (
      !puzzle ||
      puzzle.type !== "memory" ||
      (puzzle.variant !== "boss" && puzzle.variant !== "interference") ||
      phase !== "distraction" ||
      (run.status !== "playing" && run.status !== "daily")
    ) {
      return;
    }
    const correct = answer === puzzle.distraction?.correctAnswer;
    if (!correct) {
      set({ phase: "answering", puzzleStartedAt: get().puzzleStartedAt });
      get().submitAnswer([]);
      return;
    }
    set({
      distractionCleared: true,
      phase: "answering",
      puzzleStartedAt: Date.now(),
    });
  },

  submitAnswer: (answer) => {
    const { run, puzzle, puzzleStartedAt, phase } = get();
    if (
      !puzzle ||
      (run.status !== "playing" &&
        run.status !== "daily" &&
        run.status !== "announce") ||
      phase === "feedback" ||
      phase === "distraction"
    ) {
      return;
    }
    // Allow answering even if still marked presenting for non-memorize puzzles
    if (
      phase === "presenting" &&
      puzzle.type !== "memory" &&
      !(
        puzzle.type === "combined" &&
        (puzzle.variant === "memory-math" ||
          puzzle.variant === "memory-logic" ||
          puzzle.variant === "memory-spatial")
      )
    ) {
      set({ phase: "answering", puzzleStartedAt: puzzleStartedAt ?? Date.now() });
    }

    const responseTimeMs = puzzleStartedAt
      ? Date.now() - puzzleStartedAt
      : puzzle.timeLimit ?? 10000;

    let correct = validateAnswer(puzzle, answer);
    let secondChanceSaved = false;
    let lives = run.lives;
    let upgrades = run.upgrades;
    let bossesDefeated = run.bossesDefeated;
    let elitesCleared = run.elitesCleared;

    if (!correct && hasSecondChanceCharge(upgrades)) {
      correct = true;
      secondChanceSaved = true;
      upgrades = consumeSecondChance(upgrades);
    }

    let points = 0;
    let nextStreak = run.streak;
    const xpGain = Math.round(
      puzzleXp(puzzle.difficulty, correct && !secondChanceSaved) *
        run.xpMultiplier *
        (1 + getXpBonusPct(upgrades))
    );

    if (correct && !secondChanceSaved) {
      nextStreak = run.streak + 1;
      const engineScore = scoreAnswer(puzzle, answer, responseTimeMs);
      const streakPct = getStreakBonusPct(upgrades);
      const streak = streakBonus(puzzle.difficulty, nextStreak, streakPct);
      const raw = engineScore + streak;
      const multipliers: number[] = [];
      const catPct = getCategoryScorePct(upgrades, puzzle.type);
      if (catPct) multipliers.push(catPct);
      if (
        run.specialistCategory &&
        puzzle.type === run.specialistCategory &&
        run.challengeId === "specialist"
      ) {
        multipliers.push(0.3);
      }
      const highRisk = getHighRisk(upgrades);
      if (highRisk.scorePct) multipliers.push(highRisk.scorePct);
      const glass = getGlassMind(upgrades);
      if (glass.scorePct) multipliers.push(glass.scorePct);
      const momentum = getMomentumBonus(upgrades, nextStreak);
      if (momentum) multipliers.push(momentum);
      const balanced = getBalancedMindBonus(upgrades, [
        ...run.recentCategories,
        puzzle.type,
      ]);
      if (balanced) multipliers.push(balanced);
      if (run.specialModifier === "double-score") multipliers.push(1);
      if (run.specialModifier === "speed-trial") multipliers.push(0.35);
      if (run.specialModifier === "mystery") multipliers.push(0.2);
      if (run.perfectMindArmed) multipliers.push(0.5);
      if (run.floorType === "elite") multipliers.push(0.5);
      if (run.floorType === "boss") multipliers.push(0.8);
      if (run.scoreMultiplier !== 1) {
        multipliers.push(run.scoreMultiplier - 1);
      }
      const calm = getCalmMindRelief(upgrades);
      if (calm > 0 && responseTimeMs > (puzzle.timeLimit ?? 10000) * 0.7) {
        multipliers.push(0.05);
      }
      points = applyScoreMultipliers(raw, multipliers);
      points += getPrecisionBonus(upgrades, responseTimeMs, puzzle.timeLimit);

      if (run.specialModifier === "recovery") {
        lives = Math.min(run.maxLives, lives + 1);
      }
      if (run.floorType === "elite") elitesCleared += 1;
      if (run.floorType === "boss") {
        // Multi-stage: advance or complete
        const boss = run.bossId ? getBoss(run.bossId) : undefined;
        const nextStage = run.bossStageIndex + 1;
        if (boss && nextStage < boss.stages.length) {
          // Continue boss on same floor after feedback via special advance
          // Mark progress on run; advanceAfterFeedback will detect
        } else {
          bossesDefeated += 1;
          if (boss) {
            points = Math.round(points * (boss.rewardMultiplier / 2));
          }
          // Chance for extra reroll
          // handled below in updated run
        }
      }
      playCorrect();
    } else if (correct && secondChanceSaved) {
      nextStreak = run.streak;
      points = 0;
      playIncorrect();
    } else {
      const keep = getSteadyHandKeep(upgrades);
      nextStreak = keep > 0 ? Math.floor(run.streak * keep) : 0;
      if (run.mode !== "daily") {
        const cost =
          run.eliteType === "perfect-recall"
            ? Math.max(2, run.mistakeLifeCost)
            : run.mistakeLifeCost;
        lives = Math.max(0, run.lives - cost);
      }
      playIncorrect();
    }

    const prevCat = run.categoryStats[puzzle.type];
    const recentResults = [
      ...prevCat.recentResults,
      correct && !secondChanceSaved,
    ].slice(-5);
    const categoryStats = {
      ...run.categoryStats,
      [puzzle.type]: {
        attempted: prevCat.attempted + 1,
        correct: prevCat.correct + (correct && !secondChanceSaved ? 1 : 0),
        totalResponseMs: prevCat.totalResponseMs + responseTimeMs,
        highestDifficulty: Math.max(
          prevCat.highestDifficulty,
          puzzle.difficulty
        ),
        scoreContribution: prevCat.scoreContribution + points,
        recentResults,
      },
    };

    const categoryDifficulty = updateCategoryDifficulty(
      run.categoryDifficulty,
      puzzle.type,
      correct && !secondChanceSaved,
      responseTimeMs,
      puzzle.timeLimit,
      categoryStats[puzzle.type]
    );

    const attempt = {
      puzzleType: puzzle.type,
      category: puzzle.type,
      variant: puzzle.variant,
      difficulty: puzzle.difficulty,
      correct: correct && !secondChanceSaved,
      responseTimeMs,
      scoreEarned: points,
      floor: run.floor,
      timestamp: Date.now(),
    };

    let upgradeRerolls = run.upgradeRerolls;
    if (
      correct &&
      !secondChanceSaved &&
      run.floorType === "boss" &&
      bossesDefeated > run.bossesDefeated
    ) {
      upgradeRerolls += 1;
    }

    const updated: GameRun = {
      ...run,
      score: run.score + points,
      streak: nextStreak,
      bestStreak: Math.max(run.bestStreak, nextStreak),
      lives,
      upgrades,
      correctAnswers:
        run.correctAnswers + (correct && !secondChanceSaved ? 1 : 0),
      totalAnswers: run.totalAnswers + 1,
      puzzlesCompleted: run.puzzlesCompleted + 1,
      categoryStats,
      categoryDifficulty,
      attempts: [...run.attempts, attempt].slice(-200),
      status: "feedback",
      secondChanceUsedThisAnswer: secondChanceSaved,
      recentCategories: [...run.recentCategories, puzzle.type].slice(-8),
      xpEarned: run.xpEarned + xpGain,
      bossesDefeated,
      elitesCleared,
      upgradeRerolls,
      bossStageIndex:
        correct &&
        !secondChanceSaved &&
        run.floorType === "boss" &&
        bossesDefeated === run.bossesDefeated
          ? run.bossStageIndex + 1
          : run.bossStageIndex,
    };

    const feedback: FeedbackState = {
      correct,
      pointsEarned: points,
      correctAnswerDisplay:
        correct && !secondChanceSaved
          ? undefined
          : formatCorrectAnswer(puzzle),
      streak: nextStreak,
      secondChanceSaved,
      xpGained: xpGain,
    };

    set({
      run: updated,
      phase: "feedback",
      feedback,
      lastPointsEarned: points,
    });

    window.setTimeout(() => {
      get().advanceAfterFeedback();
    }, FEEDBACK_MS);
  },

  timeout: () => {
    const { puzzle, phase, run } = get();
    if (
      !puzzle ||
      phase !== "answering" ||
      (run.status !== "playing" && run.status !== "daily")
    )
      return;
    if (puzzle.type === "memory") {
      if (puzzle.variant === "missing" || puzzle.variant === "position") {
        get().submitAnswer(-1);
      } else {
        get().submitAnswer([]);
      }
    } else if (puzzle.type === "attention" && puzzle.variant === "find-two") {
      get().submitAnswer([]);
    } else if (puzzle.type === "attention" && puzzle.variant === "stroop") {
      get().submitAnswer("");
    } else if (puzzle.type === "logic" || puzzle.type === "combined") {
      get().submitAnswer("");
    } else {
      get().submitAnswer(-1);
    }
  },

  advanceAfterFeedback: () => {
    try {
      const { run, recentTypes, feedback } = get();
      if (!feedback) return;

      if (run.mode === "daily") {
        const { dailyPlan, dailyIndex } = get();
        if (dailyIndex >= dailyPlan.length - 1) {
          finalizeRun(set, get, run);
          return;
        }
        enterFloor(set, get, run.floor + 1, run, recentTypes);
        return;
      }

      if (run.lives <= 0) {
        const phoenix = tryPhoenix(run.upgrades);
        if (phoenix.revived) {
          const revived = { ...run, lives: 1, upgrades: phoenix.upgrades };
          set({ run: revived });
          enterFloor(set, get, run.floor + 1, revived, recentTypes);
          return;
        }
        finalizeRun(set, get, run);
        return;
      }

      // Continue boss stages on same floor
      if (
        run.floorType === "boss" &&
        feedback.correct &&
        !feedback.secondChanceSaved
      ) {
        const boss = run.bossId ? getBoss(run.bossId) : undefined;
        if (boss && run.bossStageIndex < boss.stages.length) {
          const data = loadGameData();
          const stage = boss.stages[run.bossStageIndex]!;
          const draft = {
            ...run,
            status: "playing" as const,
            announcement: `${boss.name} — ${stage.label}`,
          };
          const { puzzle, recentTypes: nextRecent, runPatch } =
            buildPuzzleForFloor(
              { ...draft, floorType: "boss" },
              recentTypes,
              data.profile.unlockedVariants,
              stage.category
            );
          set({
            run: {
              ...draft,
              ...runPatch,
              floorType: "boss",
              bossId: boss.id,
              bossStageIndex: run.bossStageIndex,
              announcement: `${boss.name} — ${stage.label}`,
              status: "announce",
            },
            puzzle,
            recentTypes: nextRecent,
            phase: puzzleInitialPhase(puzzle),
            feedback: null,
            puzzleStartedAt: null,
            lastPointsEarned: 0,
            distractionCleared: false,
          });
          return;
        }
      }

      // Logic chain / mixed trial second puzzle on elite
      if (
        run.floorType === "elite" &&
        feedback.correct &&
        (run.eliteType === "logic-chain" || run.eliteType === "mixed-trial") &&
        run.bossStageIndex === 0
      ) {
        const data = loadGameData();
        const forceCat: PuzzleType =
          run.eliteType === "logic-chain"
            ? "logic"
            : run.recentCategories[run.recentCategories.length - 1] === "math"
              ? "attention"
              : "math";
        const draft = {
          ...run,
          bossStageIndex: 1,
          announcement: "Elite — second challenge",
        };
        const { puzzle, recentTypes: nextRecent, runPatch } = buildPuzzleForFloor(
          draft,
          recentTypes,
          data.profile.unlockedVariants,
          forceCat
        );
        set({
          run: {
            ...draft,
            ...runPatch,
            floorType: "elite",
            eliteType: run.eliteType,
            status: "announce",
          },
          puzzle,
          recentTypes: nextRecent,
          phase: puzzleInitialPhase(puzzle),
          feedback: null,
          puzzleStartedAt: null,
        });
        return;
      }

      enterFloor(set, get, run.floor + 1, run, recentTypes);
    } catch (err) {
      console.error("advanceAfterFeedback failed", err);
      const { run, recentTypes } = get();
      // Never leave the player stuck on feedback
      try {
        enterFloor(set, get, run.floor + 1, { ...run, status: "playing" }, recentTypes);
      } catch {
        finalizeRun(set, get, { ...run, status: "playing" });
      }
    }
  },

  selectUpgrade: (upgradeId, specialistCategory) => {
    const { run, recentTypes } = get();
    if (run.status !== "upgrade") return;
    const choice = run.pendingUpgradeChoices.find((u) => u.id === upgradeId);
    if (!choice) return;

    playUpgrade();
    const existing = run.upgrades.find((u) => u.upgradeId === upgradeId);
    const active = activateUpgrade(choice, existing, specialistCategory);
    const upgrades = existing
      ? run.upgrades.map((u) => (u.upgradeId === upgradeId ? active : u))
      : [...run.upgrades, active];

    let maxLives = run.maxLives;
    let lives = run.lives;
    const glass = getGlassMind(upgrades);
    if (glass.maxLivesDelta) {
      maxLives = Math.max(1, maxLives + glass.maxLivesDelta);
      lives = Math.min(lives, maxLives);
    }
    if (choice.id === "mental-shield") {
      maxLives = Math.min(MAX_LIVES + 2, Math.max(run.maxLives, INITIAL_LIVES));
    }

    const patched: GameRun = {
      ...run,
      upgrades,
      maxLives,
      lives,
      pendingUpgradeChoices: [],
      announcement: existing
        ? `${choice.name} evolved to Level ${active.level}`
        : `${choice.name} acquired`,
      status: "playing",
    };

    set({ run: patched });
    window.setTimeout(() => {
      enterFloor(set, get, run.floor + 1, patched, recentTypes);
    }, UPGRADE_CONFIRM_MS);
  },

  rerollUpgrades: () => {
    const { run } = get();
    if (run.status !== "upgrade" || run.upgradeRerolls <= 0) return;
    const data = loadGameData();
    const choices = selectUpgradeChoices(run.upgrades, 3, {
      seed: `${run.seed}:reroll:${run.upgradeRerolls}:${run.floor}`,
      unlockedUpgradeIds: data.meta.unlockedUpgradeIds,
    });
    set({
      run: {
        ...run,
        pendingUpgradeChoices: choices,
        upgradeRerolls: run.upgradeRerolls - 1,
      },
    });
  },

  resetToIdle: () => {
    set({
      run: createInitialRun(),
      puzzle: null,
      phase: "presenting",
      feedback: null,
      recentTypes: [],
      puzzleStartedAt: null,
      lastPointsEarned: 0,
      distractionCleared: false,
      dailyPlan: [],
      dailyIndex: 0,
    });
  },
}));

export type { GameUpgrade };
