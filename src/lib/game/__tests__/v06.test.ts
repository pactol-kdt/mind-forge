import { describe, expect, it } from "vitest";
import { mergePlayerData } from "@/lib/sync/mergePlayerData";
import { createDefaultPersistedData } from "@/lib/storage/gameStorage";
import { toCloudPlayerData, fromCloudPlayerData } from "@/lib/sync/cloudProfile";
import {
  validateCloudPayload,
  validateExport,
  assertPayloadSize,
} from "@/lib/validation/playerDataSchema";
import { migrateCloudPlayerData } from "@/lib/migrations/cloudDataMigrations";
import { EXPORT_VERSION } from "@/lib/sync/syncTypes";
import { ensureRunId } from "@/lib/sync/runIds";

function baseLocal() {
  const d = createDefaultPersistedData();
  d.profile.playerLevel = 10;
  d.profile.lifetimeXP = 1000;
  d.profile.currentXP = 50;
  d.personalBests.highestFloor = 20;
  d.personalBests.highestScore = 5000;
  d.milestones = ["first-run"];
  d.meta.unlockedUpgradeIds = ["mental-shield"];
  d.runHistory = [
    ensureRunId({
      id: "run_a",
      timestamp: 1000,
      mode: "standard",
      score: 100,
      floorReached: 5,
      accuracy: 0.8,
      difficultyTier: "standard",
    }),
  ];
  d.sync.revision = 1;
  d.sync.updatedAt = 2000;
  d.sync.pendingChanges = true;
  return d;
}

function baseCloud() {
  const d = createDefaultPersistedData();
  d.profile.playerLevel = 12;
  d.profile.lifetimeXP = 1500;
  d.profile.currentXP = 10;
  d.personalBests.highestFloor = 18;
  d.personalBests.highestScore = 8000;
  d.milestones = ["floor-10"];
  d.meta.unlockedUpgradeIds = ["calm-mind"];
  d.runHistory = [
    ensureRunId({
      id: "run_b",
      timestamp: 1500,
      mode: "standard",
      score: 200,
      floorReached: 8,
      accuracy: 0.9,
      difficultyTier: "standard",
    }),
  ];
  d.sync.revision = 2;
  d.sync.updatedAt = 3000;
  return d;
}

describe("mergePlayerData", () => {
  it("merges empty cloud with local", () => {
    const local = baseLocal();
    const cloud = createDefaultPersistedData();
    const result = mergePlayerData(local, cloud);
    expect(result.merged.profile.playerLevel).toBe(10);
    expect(result.merged.milestones).toContain("first-run");
  });

  it("merges empty local with cloud", () => {
    const local = createDefaultPersistedData();
    const cloud = baseCloud();
    const result = mergePlayerData(local, cloud);
    expect(result.merged.profile.playerLevel).toBe(12);
    expect(result.merged.personalBests.highestScore).toBe(8000);
  });

  it("unions unlocks and milestones", () => {
    const result = mergePlayerData(baseLocal(), baseCloud());
    expect(result.merged.milestones.sort()).toEqual(
      ["first-run", "floor-10"].sort()
    );
    expect(result.merged.meta.unlockedUpgradeIds.sort()).toEqual(
      ["calm-mind", "mental-shield"].sort()
    );
  });

  it("takes max personal bests", () => {
    const result = mergePlayerData(baseLocal(), baseCloud());
    expect(result.merged.personalBests.highestFloor).toBe(20);
    expect(result.merged.personalBests.highestScore).toBe(8000);
  });

  it("dedupes run ids", () => {
    const local = baseLocal();
    const cloud = baseCloud();
    cloud.runHistory.push(
      ensureRunId({
        id: "run_a",
        timestamp: 1000,
        mode: "standard",
        score: 100,
        floorReached: 5,
        accuracy: 0.8,
        difficultyTier: "standard",
      })
    );
    const result = mergePlayerData(local, cloud);
    const ids = result.merged.runHistory.map((r) => r.id);
    expect(ids.filter((id) => id === "run_a").length).toBe(1);
    expect(ids).toContain("run_b");
  });

  it("prefers newer snapshot for ratings path via updatedAt", () => {
    const local = baseLocal();
    const cloud = baseCloud();
    local.profile.categories.math.rating = 55;
    cloud.profile.categories.math.rating = 70;
    cloud.sync.updatedAt = 9999;
    local.sync.updatedAt = 100;
    const result = mergePlayerData(local, cloud);
    expect(result.merged.profile.categories.math.rating).toBe(70);
  });
});

describe("cloud profile round-trip", () => {
  it("toCloud/fromCloud preserves progression", () => {
    const local = baseLocal();
    const cloud = toCloudPlayerData(local, { revision: 3, deviceId: "dev1" });
    const parsed = validateCloudPayload(cloud);
    expect(parsed.success).toBe(true);
    const back = fromCloudPlayerData(cloud, local);
    expect(back.profile.playerLevel).toBe(10);
    expect(back.sync.lastCloudRevision).toBe(3);
  });
});

describe("export / import validation", () => {
  it("accepts a valid export", () => {
    const local = baseLocal();
    const exp = {
      exportVersion: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      profile: local,
    };
    const parsed = validateExport(exp);
    expect(parsed.success).toBe(true);
  });

  it("rejects oversized payloads", () => {
    expect(assertPayloadSize("x".repeat(100), 50)).toBe(false);
  });

  it("rejects invalid JSON shape", () => {
    const parsed = validateExport({ exportVersion: 1 });
    expect(parsed.success).toBe(false);
  });
});

describe("cloud migrations", () => {
  it("migrates v5-shaped payload to v6 with run ids", () => {
    const local = baseLocal();
    const v5 = {
      ...toCloudPlayerData(local),
      schemaVersion: 5,
      runHistory: [
        {
          timestamp: 1,
          mode: "standard",
          score: 10,
          floorReached: 2,
          accuracy: 1,
          difficultyTier: "standard",
        },
      ],
    };
    const migrated = migrateCloudPlayerData(v5, 5, 6);
    expect(migrated.schemaVersion).toBe(6);
    expect(migrated.runHistory[0]?.id).toBeTruthy();
  });
});

describe("guest account state shape", () => {
  it("default persisted data includes sync metadata", () => {
    const d = createDefaultPersistedData();
    expect(d.sync).toBeDefined();
    expect(d.sync.revision).toBe(0);
    expect(d.schemaVersion).toBe(6);
  });
});
