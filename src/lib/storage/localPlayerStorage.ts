import type { PlayerStorage } from "./playerStorage";
import type { PersistedGameData } from "@/types/profile";
import {
  loadGameData,
  saveGameData,
  normalizeData,
} from "./gameStorage";

/** Guest + signed-in local cache via existing localStorage. */
export class LocalPlayerStorage implements PlayerStorage {
  async load(): Promise<PersistedGameData> {
    return loadGameData();
  }

  async save(data: PersistedGameData): Promise<void> {
    saveGameData(data);
  }

  async update(partial: Partial<PersistedGameData>): Promise<void> {
    const current = loadGameData();
    saveGameData(normalizeData({ ...current, ...partial }));
  }
}

export const localPlayerStorage = new LocalPlayerStorage();
