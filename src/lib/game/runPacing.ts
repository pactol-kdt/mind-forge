import type { FloorConfiguration, EliteType, SpecialFloorV4 } from "@/types/run";
import type { ModifierEffect } from "@/types/run";
import { createSeededRng, deriveSeed, rngPick } from "./seededRandom";

/**
 * Pacing rules (minimum gaps between major events):
 * - Boss: every bossEveryN (default 10)
 * - Elite: every eliteEveryN (default 8), never on boss/upgrade
 * - Upgrade: every upgradeEveryN (default 3), skipped on boss/elite
 * - Special: every specialEveryN (default 5), skipped on boss/upgrade/elite
 * Never: upgrade → special → elite → boss without normal floors between dense packs.
 */

export interface PacingParams {
  effects: ModifierEffect;
  seed: string;
}

const ELITE_TYPES: EliteType[] = [
  "rapid-fire",
  "perfect-recall",
  "logic-chain",
  "spatial-shift",
  "mixed-trial",
];

const SPECIAL_V4: SpecialFloorV4[] = [
  "double-score",
  "perfect-mind",
  "speed-trial",
  "memory-trial",
  "upgrade-forge",
  "recovery",
  "gamble",
  "category-trial",
  "mystery",
];

export function getFloorConfiguration(
  floor: number,
  params: PacingParams
): FloorConfiguration {
  const e = params.effects;
  const bossEvery = e.bossEveryN ?? 10;
  const upgradeEvery = e.upgradeEveryN ?? 3;
  const specialEvery = e.specialEveryN ?? 5;
  const eliteEvery = e.eliteEveryN ?? 8;

  if (floor <= 0) {
    return { floor, type: "normal", rewardMultiplier: 1 };
  }

  if (floor % bossEvery === 0) {
    return {
      floor,
      type: "boss",
      rewardMultiplier: 2,
      announcement: "Boss Challenge",
    };
  }

  // Choice path occasionally before mid-run (not colliding with denser events)
  if (floor % 12 === 7) {
    return {
      floor,
      type: "choice",
      rewardMultiplier: 1.3,
      announcement: "Choose Your Path",
    };
  }

  if (floor % eliteEvery === 0 && floor % upgradeEvery !== 0) {
    const rng = createSeededRng(deriveSeed(params.seed, "elite", floor));
    const eliteType = rngPick(rng, ELITE_TYPES);
    return {
      floor,
      type: "elite",
      eliteType,
      rewardMultiplier: 1.5,
      announcement: eliteAnnouncement(eliteType),
    };
  }

  if (floor % upgradeEvery === 0) {
    return {
      floor,
      type: "upgrade",
      rewardMultiplier: 1,
      announcement: "Choose an upgrade for this run",
    };
  }

  if (floor % specialEvery === 0) {
    const rng = createSeededRng(deriveSeed(params.seed, "special", floor));
    let pool = [...SPECIAL_V4];
    if ((e.speedTrialBias ?? 0) > 0 && rng() < (e.speedTrialBias ?? 0)) {
      pool = ["speed-trial", ...pool];
    }
    const specialType = rngPick(rng, pool);
    return {
      floor,
      type: "special",
      specialType,
      rewardMultiplier: specialType === "double-score" ? 2 : 1.25,
      announcement: specialAnnouncement(specialType),
    };
  }

  return { floor, type: "normal", rewardMultiplier: 1 };
}

function eliteAnnouncement(type: EliteType): string {
  switch (type) {
    case "rapid-fire":
      return "ELITE — Rapid Fire: reduced timer, higher reward";
    case "perfect-recall":
      return "ELITE — Perfect Recall: hard memory, costly mistakes";
    case "logic-chain":
      return "ELITE — Logic Chain: two related logic challenges";
    case "spatial-shift":
      return "ELITE — Spatial Shift: extra transformation";
    case "mixed-trial":
      return "ELITE — Mixed Trial: two short category puzzles";
  }
}

function specialAnnouncement(type: SpecialFloorV4): string {
  switch (type) {
    case "double-score":
      return "Double Score — points are doubled";
    case "perfect-mind":
      return "Perfect Mind — bonus for a clean answer";
    case "speed-trial":
      return "Speed Trial — less time, more reward";
    case "memory-trial":
      return "Memory Trial — a harder memory challenge";
    case "upgrade-forge":
      return "Upgrade Forge — evolve an owned upgrade";
    case "recovery":
      return "Recovery Floor — easier puzzle, restore a life";
    case "gamble":
      return "Gamble Floor — Safe or Risk";
    case "category-trial":
      return "Category Trial — pick a category for extra reward";
    case "mystery":
      return "Mystery Floor — a defined surprise modifier";
  }
}

/** True if elite spacing is valid for default pacing. */
export function isValidEliteFloor(
  floor: number,
  eliteEvery = 8,
  bossEvery = 10,
  upgradeEvery = 3
): boolean {
  if (floor % bossEvery === 0) return false;
  if (floor % eliteEvery !== 0) return false;
  if (floor % upgradeEvery === 0) return false;
  return true;
}
