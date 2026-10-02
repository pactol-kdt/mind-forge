import type { PersistedGameData } from "@/types/profile";

export interface PlayerStorage {
  load(): Promise<PersistedGameData>;
  save(data: PersistedGameData): Promise<void>;
  update(partial: Partial<PersistedGameData>): Promise<void>;
}
