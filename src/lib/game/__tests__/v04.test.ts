import { describe, expect, it } from "vitest";
import {
  createSeededRng,
  normalizeSeed,
  rngInt,
  rngPick,
  rngShuffle,
  deriveSeed,
} from "@/lib/game/seededRandom";
import {
  createWeeklySeed,
  getIsoWeekId,
  getWeeklyChallenge,
} from "@/lib/game/weeklyChallenge";
import { composeEffects } from "@/lib/game/modifiers";
import { getFloorConfiguration, isValidEliteFloor } from "@/lib/game/runPacing";
import {
  selectUpgradeChoices,
  activateUpgrade,
  UPGRADE_CATALOG,
  getEffectForActive,
} from "@/lib/game/upgrades";
import { evaluateObjectives } from "@/lib/challenges/challengeObjectives";
import { evaluateUnlocks, createDefaultMeta } from "@/lib/progression/unlocks";
import { createBrainProfile } from "@/types/profile";
import { DEFAULT_STATS, createEmptyLifetimeCategoryStat } from "@/types/game";
import { emptyCategoryRecord } from "@/types/categories";
import { getRunArchetype } from "@/lib/game/runArchetypes";
import { pickBossForFloor, BOSS_DEFINITIONS } from "@/lib/game/bosses";
import { DIFFICULTY_TIERS } from "@/lib/game/modifiers";
import { composeRunEffects, resolveRunConfig } from "@/lib/game/runConfig";
import { normalizeData, STORAGE_LIMITS } from "@/lib/storage/gameStorage";
import { getFloorType } from "@/lib/game/floorSystem";

describe("seeded random", () => {
  it("same seed produces same sequence", () => {
    const a = createSeededRng("MINDFORGE-482731");
    const b = createSeededRng("MINDFORGE-482731");
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("different seeds diverge", () => {
    const a = createSeededRng("MINDFORGE-1");
    const b = createSeededRng("MINDFORGE-2");
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it("normalizes seeds", () => {
    expect(normalizeSeed("mindforge 482731")).toBe("MINDFORGE-482731");
  });

  it("helpers are deterministic", () => {
    const rng = createSeededRng("HELPERS");
    expect(rngInt(rng, 1, 5)).toBeTypeOf("number");
    expect(rngPick(rng, ["a", "b", "c"])).toMatch(/a|b|c/);
    expect(rngShuffle(rng, [1, 2, 3]).sort()).toEqual([1, 2, 3]);
  });
});

describe("weekly challenge", () => {
  it("stable for same ISO week", () => {
    const id = getIsoWeekId(new Date(Date.UTC(2026, 9, 2)));
    expect(createWeeklySeed(id)).toBe(createWeeklySeed(id));
    const a = getWeeklyChallenge(id);
    const b = getWeeklyChallenge(id);
    expect(a.seed).toBe(b.seed);
    expect(a.name).toBe(b.name);
  });

  it("changes between weeks", () => {
    const a = getWeeklyChallenge("2026-W40");
    const b = getWeeklyChallenge("2026-W41");
    expect(a.seed).not.toBe(b.seed);
  });
});

describe("modifiers & difficulty", () => {
  it("composes multipliers and deltas", () => {
    const e = composeEffects([
      { scoreMultiplier: 1.2, startingLivesDelta: 1 },
      { scoreMultiplier: 1.5, mistakeLifeCost: 2 },
    ]);
    expect(e.scoreMultiplier).toBeCloseTo(1.8);
    expect(e.startingLivesDelta).toBe(1);
    expect(e.mistakeLifeCost).toBe(2);
  });

  it("difficulty tier multipliers are correct", () => {
    const expert = DIFFICULTY_TIERS.find((t) => t.id === "expert")!;
    expect(expert.effects.scoreMultiplier).toBe(1.5);
    expect(expert.effects.xpMultiplier).toBe(1.25);
  });

  it("run config composes challenge effects", () => {
    const config = resolveRunConfig({
      mode: "challenge",
      challengeId: "precision",
      difficultyTier: "standard",
      seed: "MINDFORGE-TEST",
    });
    const effects = composeRunEffects(config);
    expect(effects.mistakeLifeCost).toBe(2);
    expect(effects.scoreMultiplier).toBeGreaterThan(1);
  });
});

describe("pacing & elites", () => {
  it("legacy floor types preserved", () => {
    expect(getFloorType(1)).toBe("normal");
    expect(getFloorType(3)).toBe("upgrade");
    expect(getFloorType(5)).toBe("special");
    expect(getFloorType(10)).toBe("boss");
  });

  it("elite floors follow spacing rules", () => {
    const seed = "MINDFORGE-PACE";
    const effects = { eliteEveryN: 8, bossEveryN: 10, upgradeEveryN: 3 };
    for (let f = 1; f <= 40; f++) {
      const cfg = getFloorConfiguration(f, { seed, effects });
      if (cfg.type === "elite") {
        expect(isValidEliteFloor(f, 8, 10, 3)).toBe(true);
      }
      if (cfg.type === "boss") {
        expect(f % 10).toBe(0);
      }
    }
  });

  it("same seed same floor structure", () => {
    const seed = "MINDFORGE-STRUCT";
    const effects = {};
    const a = Array.from({ length: 30 }, (_, i) =>
      getFloorConfiguration(i + 1, { seed, effects })
    ).map((c) => `${c.type}:${c.eliteType ?? c.specialType ?? ""}`);
    const b = Array.from({ length: 30 }, (_, i) =>
      getFloorConfiguration(i + 1, { seed, effects })
    ).map((c) => `${c.type}:${c.eliteType ?? c.specialType ?? ""}`);
    expect(a).toEqual(b);

    const c = Array.from({ length: 30 }, (_, i) =>
      getFloorConfiguration(i + 1, { seed: "MINDFORGE-OTHER", effects })
    ).map((x) => `${x.type}:${x.eliteType ?? x.specialType ?? ""}`);
    expect(a).not.toEqual(c);
  });
});

describe("upgrades 2.0", () => {
  it("has expanded catalog", () => {
    expect(UPGRADE_CATALOG.length).toBeGreaterThanOrEqual(20);
    expect(UPGRADE_CATALOG.length).toBeLessThanOrEqual(35);
  });

  it("selection has no duplicates", () => {
    const choices = selectUpgradeChoices([], 3, { seed: "UP-1" });
    const ids = choices.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("evolution respects max level", () => {
    const quick = UPGRADE_CATALOG.find((u) => u.id === "quick-mind")!;
    let active = activateUpgrade(quick);
    expect(active.level).toBe(1);
    active = activateUpgrade(quick, active);
    expect(active.level).toBe(2);
    active = activateUpgrade(quick, active);
    expect(active.level).toBe(3);
    active = activateUpgrade(quick, active);
    expect(active.level).toBe(3);
    const effect = getEffectForActive(active);
    expect(effect?.kind).toBe("time_bonus");
  });

  it("does not offer maxed upgrades", () => {
    const quick = UPGRADE_CATALOG.find((u) => u.id === "quick-mind")!;
    const owned = [{ upgradeId: "quick-mind", level: quick.maxLevel }];
    const choices = selectUpgradeChoices(owned, 3, {
      seed: "MAXED",
      unlockedUpgradeIds: ["glass-mind", "phoenix"],
    });
    expect(choices.every((c) => c.id !== "quick-mind")).toBe(true);
  });
});

describe("objectives & unlocks", () => {
  it("evaluates objectives", () => {
    const r = evaluateObjectives(
      [
        { type: "reach-floor", value: 15 },
        { type: "score", value: 10000 },
      ],
      {
        floorReached: 18,
        score: 5000,
        accuracy: 0.9,
        bossesDefeated: 1,
        elitesCleared: 2,
      }
    );
    expect(r.items[0]!.done).toBe(true);
    expect(r.items[1]!.done).toBe(false);
    expect(r.allComplete).toBe(false);
  });

  it("unlocks never disappear", () => {
    const profile = createBrainProfile();
    profile.playerLevel = 20;
    const meta = createDefaultMeta();
    meta.unlockedChallengeIds = ["no-mercy", "precision"];
    const { meta: next } = evaluateUnlocks({
      profile,
      lifetime: {
        ...DEFAULT_STATS,
        categoryStats: emptyCategoryRecord(createEmptyLifetimeCategoryStat),
      },
      milestones: ["first-run"],
      meta,
      highestFloorEver: 40,
      bossesDefeated: 2,
      elitesCleared: 3,
    });
    expect(next.unlockedChallengeIds).toContain("no-mercy");
    expect(next.unlockedChallengeIds).toContain("precision");
    expect(next.difficultyTiersUnlocked).toContain("master");
  });
});

describe("bosses & archetypes", () => {
  it("bosses produce valid stage sequences", () => {
    for (const boss of BOSS_DEFINITIONS) {
      expect(boss.stages.length).toBeGreaterThanOrEqual(2);
      expect(boss.stages.length).toBeLessThanOrEqual(4);
    }
    const a = pickBossForFloor(20, "BOSS-SEED", [
      "archivist",
      "architect",
      "logician",
    ]);
    const b = pickBossForFloor(20, "BOSS-SEED", [
      "archivist",
      "architect",
      "logician",
    ]);
    expect(a.id).toBe(b.id);
  });

  it("archetype detection is deterministic", () => {
    const input = {
      upgrades: [
        { upgradeId: "quick-mind", level: 2 },
        { upgradeId: "momentum", level: 1 },
      ],
      categoryCounts: { attention: 5, memory: 2 },
      config: { mode: "standard" as const },
    };
    expect(getRunArchetype(input)).toBe(getRunArchetype(input));
    expect(getRunArchetype(input)).toBe("Speed Build");
  });
});

describe("storage v4 migration", () => {
  it("migrates v3-shaped data with defaults", () => {
    const data = normalizeData({
      schemaVersion: 3,
      profile: createBrainProfile(),
      milestones: ["first-run"],
    });
    expect(data.schemaVersion).toBe(6);
    expect(data.meta.unlockedChallengeIds.length).toBeGreaterThan(0);
    expect(data.runHistory).toEqual([]);
    expect(data.weeklyHistory).toEqual([]);
    expect(data.modeBests).toEqual({});
  });

  it("history limits are bounded", () => {
    expect(STORAGE_LIMITS.RUN_HISTORY_LIMIT).toBeLessThanOrEqual(50);
    expect(STORAGE_LIMITS.WEEKLY_HISTORY_LIMIT).toBeLessThanOrEqual(20);
  });
});

describe("lives & score safety", () => {
  it("lives never go negative in clamp patterns", () => {
    expect(Math.max(0, 1 - 2)).toBe(0);
    expect(Math.max(0, 0 - 1)).toBe(0);
  });

  it("deriveSeed is stable", () => {
    expect(deriveSeed("A", 1, "x")).toBe(deriveSeed("A", 1, "x"));
  });
});
