import type { FloorType, SpecialModifier } from "@/types/game";
import {
  getFloorConfiguration,
  type PacingParams,
} from "./runPacing";
import type { FloorConfiguration } from "@/types/run";

/**
 * Floor schedule (v0.4 pacing):
 * Priority: boss > choice > elite > upgrade > special > normal
 * Defaults: boss/10, elite/8, upgrade/3, special/5 — adjustable via modifiers.
 */
export function getFloorType(floor: number, params?: PacingParams): FloorType {
  if (!params) {
    // Legacy default schedule for tests / callers without seed
    if (floor <= 0) return "normal";
    if (floor % 10 === 0) return "boss";
    if (floor % 3 === 0) return "upgrade";
    if (floor % 5 === 0) return "special";
    return "normal";
  }
  return getFloorConfiguration(floor, params).type;
}

export function getFloorConfig(
  floor: number,
  params: PacingParams
): FloorConfiguration {
  return getFloorConfiguration(floor, params);
}

export function getSpecialAnnouncement(modifier: SpecialModifier): string {
  switch (modifier) {
    case "double-score":
      return "Double Score — points are doubled this floor";
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
      return "Gamble Floor — choose Safe or Risk";
    case "category-trial":
      return "Category Trial — pick a category for extra reward";
    case "mystery":
      return "Mystery Floor — a defined surprise boost";
  }
}

export function getBossAnnouncement(
  name = "Boss Challenge",
  stageLabel?: string
): string {
  if (stageLabel) return `${name} — ${stageLabel}`;
  return `${name} — multi-stage encounter`;
}

export function getUpgradeAnnouncement(): string {
  return "Choose an upgrade for this run";
}

export function pickSpecialModifier(floor: number): SpecialModifier {
  const pool: SpecialModifier[] = [
    "double-score",
    "perfect-mind",
    "speed-trial",
    "memory-trial",
  ];
  const index = (floor / 5 - 1) % pool.length;
  return pool[Math.abs(Math.floor(index)) % pool.length]!;
}
