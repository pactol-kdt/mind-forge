import type { PlayerStorage } from "./playerStorage";
import type { PersistedGameData } from "@/types/profile";
import { fromCloudPlayerData, toCloudPlayerData } from "@/lib/sync/cloudProfile";
import { createDefaultPersistedData } from "./gameStorage";

/**
 * Cloud-backed storage talking to /api/profile and /api/sync.
 * Used by authenticated clients — game logic should prefer the sync store.
 */
export class CloudPlayerStorage implements PlayerStorage {
  async load(): Promise<PersistedGameData> {
    const res = await fetch("/api/profile", { cache: "no-store" });
    if (res.status === 401) throw new Error("UNAUTHORIZED");
    if (!res.ok) throw new Error("CLOUD_LOAD_FAILED");
    const json = (await res.json()) as {
      profile: {
        revision: number;
        data: import("@/lib/sync/syncTypes").CloudPlayerData;
      } | null;
    };
    if (!json.profile) return createDefaultPersistedData();
    return fromCloudPlayerData(json.profile.data, createDefaultPersistedData());
  }

  async save(data: PersistedGameData): Promise<void> {
    const payload = {
      baseRevision: data.sync.lastCloudRevision,
      clientRevision: data.sync.revision,
      deviceId: data.sync.deviceId,
      data: toCloudPlayerData(data),
    };
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("CLOUD_SAVE_FAILED");
  }

  async update(partial: Partial<PersistedGameData>): Promise<void> {
    const current = await this.load();
    await this.save({ ...current, ...partial });
  }
}

export const cloudPlayerStorage = new CloudPlayerStorage();
