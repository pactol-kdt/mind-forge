"use client";

import { create } from "zustand";
import type { AccountState, SyncStatus } from "@/lib/sync/syncTypes";
import type { PersistedGameData } from "@/types/profile";
import { loadGameData, saveGameData } from "@/lib/storage/gameStorage";
import { getOrCreateDeviceId } from "@/lib/storage/deviceId";
import { toCloudPlayerData, fromCloudPlayerData } from "@/lib/sync/cloudProfile";
import { mergePlayerData } from "@/lib/sync/mergePlayerData";
import type { MergeConflict } from "@/lib/sync/syncTypes";
import { createDefaultPersistedData } from "@/lib/storage/gameStorage";

interface SyncStore {
  account: AccountState;
  syncStatus: SyncStatus;
  lastError: string | null;
  cloudEnabled: boolean;
  providers: string[];
  conflicts: MergeConflict[];
  needsMigrationChoice: boolean;
  init: () => Promise<void>;
  markPending: () => void;
  syncNow: () => Promise<void>;
  resolveKeepLocal: () => Promise<void>;
  resolveKeepCloud: () => Promise<void>;
  setAccountGuest: () => void;
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let initializing = false;

function online(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  account: { status: "loading" },
  syncStatus: "idle",
  lastError: null,
  cloudEnabled: false,
  providers: [],
  conflicts: [],
  needsMigrationChoice: false,

  setAccountGuest: () => set({ account: { status: "guest" }, syncStatus: "idle" }),

  init: async () => {
    if (initializing) return;
    initializing = true;
    try {
      // Ensure device id exists for guests too
      if (typeof window !== "undefined") getOrCreateDeviceId();

      let cloudEnabled = false;
      let providers: string[] = [];
      try {
        const cfg = await fetch("/api/auth/providers", { cache: "no-store" });
        if (cfg.ok) {
          const json = (await cfg.json()) as {
            cloudEnabled?: boolean;
            providers?: string[];
          };
          cloudEnabled = Boolean(json.cloudEnabled);
          providers = json.providers ?? [];
        }
      } catch {
        cloudEnabled = false;
      }
      set({ cloudEnabled, providers });

      if (!cloudEnabled) {
        set({ account: { status: "guest" }, syncStatus: "idle" });
        return;
      }

      const res = await fetch("/api/profile", { cache: "no-store" });
      if (res.status === 401) {
        set({ account: { status: "guest" }, syncStatus: "idle" });
        return;
      }
      if (res.status === 503) {
        set({
          account: { status: "guest" },
          syncStatus: "idle",
          cloudEnabled: false,
        });
        return;
      }
      if (!res.ok) {
        set({
          account: { status: "guest" },
          syncStatus: online() ? "error" : "offline",
          lastError: "Could not load account",
        });
        return;
      }

      const json = (await res.json()) as {
        user: {
          id: string;
          email?: string | null;
          displayName?: string | null;
          avatarUrl?: string | null;
        };
        profile: {
          revision: number;
          data: import("@/lib/sync/syncTypes").CloudPlayerData;
        } | null;
      };

      set({
        account: {
          status: "authenticated",
          userId: json.user.id,
          email: json.user.email ?? undefined,
          displayName: json.user.displayName ?? undefined,
          avatarUrl: json.user.avatarUrl ?? undefined,
        },
      });

      const local = loadGameData();
      const hasLocalProgress =
        local.profile.lifetimeXP > 0 ||
        local.profile.totalRuns > 0 ||
        local.lifetime.gamesPlayed > 0 ||
        local.runHistory.length > 0;

      if (!json.profile) {
        if (hasLocalProgress) {
          set({
            needsMigrationChoice: true,
            syncStatus: "pending",
          });
        } else {
          await get().syncNow();
        }
        return;
      }

      const cloud = fromCloudPlayerData(json.profile.data, local);
      if (local.sync.pendingChanges || local.sync.revision !== cloud.sync.revision) {
        const merge = mergePlayerData(local, cloud);
        saveGameData({
          ...merge.merged,
          sync: {
            ...merge.merged.sync,
            lastCloudRevision: json.profile.revision,
            pendingChanges: true,
            deviceId: getOrCreateDeviceId(),
          },
        });
        set({
          conflicts: merge.conflicts,
          syncStatus: merge.needsPlayerChoice ? "conflict" : "pending",
        });
        if (!merge.needsPlayerChoice) {
          await get().syncNow();
        }
      } else {
        saveGameData({
          ...cloud,
          sync: {
            ...cloud.sync,
            lastCloudRevision: json.profile.revision,
            lastSuccessfulSync: Date.now(),
            pendingChanges: false,
            deviceId: getOrCreateDeviceId(),
          },
        });
        set({ syncStatus: "synced" });
      }
    } catch {
      set({
        account: { status: "guest" },
        syncStatus: online() ? "error" : "offline",
        lastError: "Offline — using saved progress on this device.",
      });
    } finally {
      initializing = false;
    }
  },

  markPending: () => {
    const { account } = get();
    if (account.status !== "authenticated") return;
    const data = loadGameData();
    const now = Date.now();
    saveGameData({
      ...data,
      sync: {
        ...data.sync,
        pendingChanges: true,
        updatedAt: now,
        deviceId: data.sync.deviceId ?? getOrCreateDeviceId(),
      },
    });
    set({ syncStatus: online() ? "pending" : "offline" });
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      void get().syncNow();
    }, 1500);
  },

  syncNow: async () => {
    const { account, cloudEnabled } = get();
    if (!cloudEnabled || account.status !== "authenticated") return;
    if (!online()) {
      set({ syncStatus: "offline", lastError: "Offline — progress saved locally." });
      return;
    }

    set({ syncStatus: "syncing", lastError: null });
    const local = loadGameData();
    const deviceId = local.sync.deviceId ?? getOrCreateDeviceId();
    const payload = {
      baseRevision: local.sync.lastCloudRevision,
      clientRevision: local.sync.revision,
      deviceId,
      data: toCloudPlayerData(local, {
        revision: local.sync.revision,
        deviceId,
      }),
    };

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        set({
          account: { status: "guest" },
          syncStatus: "error",
          lastError:
            "Your session expired. Progress is still saved locally. Sign in again to continue syncing.",
        });
        return;
      }
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        set({
          syncStatus: "error",
          lastError:
            err.error === "RATE_LIMITED"
              ? "Too many sync attempts. Try again shortly."
              : "We couldn't sync your progress. Your progress is still saved on this device.",
        });
        return;
      }
      const json = (await res.json()) as {
        revision: number;
        data: import("@/lib/sync/syncTypes").CloudPlayerData;
        status: string;
        conflicts?: MergeConflict[];
        needsPlayerChoice?: boolean;
      };

      const merged = fromCloudPlayerData(json.data, local);
      saveGameData({
        ...merged,
        sync: {
          ...merged.sync,
          revision: json.revision,
          lastCloudRevision: json.revision,
          lastSuccessfulSync: Date.now(),
          pendingChanges: false,
          deviceId,
          updatedAt: Date.now(),
        },
      });
      set({
        syncStatus: json.needsPlayerChoice ? "conflict" : "synced",
        conflicts: json.conflicts ?? [],
        needsMigrationChoice: false,
        lastError: null,
      });
    } catch {
      set({
        syncStatus: "offline",
        lastError: "Offline — progress saved locally.",
      });
    }
  },

  resolveKeepLocal: async () => {
    const local = loadGameData();
    saveGameData({
      ...local,
      sync: {
        ...local.sync,
        pendingChanges: true,
        lastCloudRevision: local.sync.lastCloudRevision,
        updatedAt: Date.now(),
      },
    });
    set({ needsMigrationChoice: false, conflicts: [], syncStatus: "pending" });
    await get().syncNow();
  },

  resolveKeepCloud: async () => {
    set({ syncStatus: "syncing" });
    try {
      const res = await fetch("/api/profile", { cache: "no-store" });
      if (!res.ok) throw new Error("fetch failed");
      const json = (await res.json()) as {
        profile: {
          revision: number;
          data: import("@/lib/sync/syncTypes").CloudPlayerData;
        } | null;
      };
      if (!json.profile) {
        set({ syncStatus: "error", lastError: "No cloud profile found." });
        return;
      }
      const cloud = fromCloudPlayerData(
        json.profile.data,
        createDefaultPersistedData()
      );
      saveGameData({
        ...cloud,
        sync: {
          ...cloud.sync,
          lastCloudRevision: json.profile.revision,
          lastSuccessfulSync: Date.now(),
          pendingChanges: false,
          deviceId: getOrCreateDeviceId(),
        },
      });
      set({
        needsMigrationChoice: false,
        conflicts: [],
        syncStatus: "synced",
      });
    } catch {
      set({
        syncStatus: "error",
        lastError: "We couldn't load cloud progress.",
      });
    }
  },
}));

/** Hook sync after meaningful local saves. */
export function notifyProgressSaved(): void {
  useSyncStore.getState().markPending();
}

export function applyImportedData(
  data: PersistedGameData,
  mode: "merge" | "replace"
): void {
  const current = loadGameData();
  if (mode === "replace") {
    saveGameData({
      ...data,
      sync: {
        ...current.sync,
        pendingChanges: true,
        updatedAt: Date.now(),
        deviceId: getOrCreateDeviceId(),
      },
    });
  } else {
    const merge = mergePlayerData(data, current);
    saveGameData({
      ...merge.merged,
      sync: {
        ...merge.merged.sync,
        pendingChanges: true,
        deviceId: getOrCreateDeviceId(),
        updatedAt: Date.now(),
      },
    });
  }
  notifyProgressSaved();
}
