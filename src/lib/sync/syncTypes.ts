import type { PersistedGameData } from "@/types/profile";

export type SyncStatus =
  | "idle"
  | "syncing"
  | "synced"
  | "offline"
  | "pending"
  | "error"
  | "conflict";

export interface SyncMetadata {
  revision: number;
  updatedAt: number;
  deviceId?: string;
  lastCloudRevision: number;
  lastSuccessfulSync: number | null;
  pendingChanges: boolean;
}

export interface AccountState {
  status: "guest" | "loading" | "authenticated";
  userId?: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface CloudPlayerData {
  schemaVersion: number;
  revision: number;
  updatedAt: number;
  deviceId?: string;
  profile: PersistedGameData["profile"];
  lifetime: PersistedGameData["lifetime"];
  personalBests: PersistedGameData["personalBests"];
  milestones: string[];
  settings: PersistedGameData["settings"];
  daily: PersistedGameData["daily"];
  meta: PersistedGameData["meta"];
  runHistory: PersistedGameData["runHistory"];
  weeklyHistory: PersistedGameData["weeklyHistory"];
  modeBests: PersistedGameData["modeBests"];
  familyStats: PersistedGameData["familyStats"];
  seenFamilyIntros: string[];
}

export interface MergeConflict {
  field: string;
  reason: string;
  localValue?: unknown;
  cloudValue?: unknown;
}

export interface MergeResult {
  merged: PersistedGameData;
  conflicts: MergeConflict[];
  strategyUsed: string[];
  needsPlayerChoice: boolean;
}

export interface MindforgeExport {
  exportVersion: number;
  exportedAt: string;
  profile: PersistedGameData;
}

export const CLOUD_SCHEMA_VERSION = 6;
export const EXPORT_VERSION = 1;
export const MAX_SYNC_PAYLOAD_BYTES = 512_000;
export const MAX_IMPORT_BYTES = 1_000_000;
export const RUN_HISTORY_CLOUD_LIMIT = 80;
export const WEEKLY_HISTORY_CLOUD_LIMIT = 52;
export const PERFORMANCE_SAMPLE_LIMIT = 80;
