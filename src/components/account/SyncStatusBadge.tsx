"use client";

import { useSyncStore } from "@/stores/syncStore";

const LABELS: Record<string, string> = {
  idle: "",
  syncing: "Syncing…",
  synced: "Saved",
  offline: "Offline — progress saved locally",
  pending: "Sync pending",
  error: "Sync failed",
  conflict: "Sync conflict",
};

export function SyncStatusBadge() {
  const account = useSyncStore((s) => s.account);
  const status = useSyncStore((s) => s.syncStatus);
  const lastError = useSyncStore((s) => s.lastError);
  const syncNow = useSyncStore((s) => s.syncNow);
  const cloudEnabled = useSyncStore((s) => s.cloudEnabled);

  if (!cloudEnabled || account.status !== "authenticated") return null;
  if (status === "idle" || status === "synced") {
    return (
      <p className="text-center text-[11px] text-slate-500" aria-live="polite">
        {status === "synced" ? "Saved" : null}
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1" aria-live="polite">
      <p className="text-[11px] text-amber-200/90">{LABELS[status]}</p>
      {lastError ? (
        <p className="max-w-xs text-center text-[11px] text-slate-400">{lastError}</p>
      ) : null}
      {(status === "error" || status === "pending" || status === "offline") && (
        <button
          type="button"
          onClick={() => void syncNow()}
          className="text-[11px] font-medium text-cyan-300 underline-offset-2 hover:underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}
