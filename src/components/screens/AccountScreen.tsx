"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SyncStatusBadge } from "@/components/account/SyncStatusBadge";
import { useSyncStore, applyImportedData } from "@/stores/syncStore";
import {
  loadGameData,
  resetAllProgress,
} from "@/lib/storage/gameStorage";
import { EXPORT_VERSION } from "@/lib/sync/syncTypes";
import {
  assertPayloadSize,
  validateExport,
} from "@/lib/validation/playerDataSchema";
import { createDefaultSyncState } from "@/types/profile";
import { normalizeData } from "@/lib/storage/gameStorage";

function formatSyncTime(ts: number | null): string {
  if (!ts) return "Never";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export function AccountScreen() {
  const router = useRouter();
  const account = useSyncStore((s) => s.account);
  const syncStatus = useSyncStore((s) => s.syncStatus);
  const cloudEnabled = useSyncStore((s) => s.cloudEnabled);
  const providers = useSyncStore((s) => s.providers);
  const needsMigrationChoice = useSyncStore((s) => s.needsMigrationChoice);
  const conflicts = useSyncStore((s) => s.conflicts);
  const syncNow = useSyncStore((s) => s.syncNow);
  const resolveKeepLocal = useSyncStore((s) => s.resolveKeepLocal);
  const resolveKeepCloud = useSyncStore((s) => s.resolveKeepCloud);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [alsoClearLocal, setAlsoClearLocal] = useState(false);
  const [confirmClearLocal, setConfirmClearLocal] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    level: number;
    runs: number;
    floor: number;
    milestones: number;
    raw: unknown;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [devEmail, setDevEmail] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const data = loadGameData();

  const exportLocal = () => {
    const current = loadGameData();
    const payload = {
      exportVersion: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      profile: current,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const date = new Date().toISOString().slice(0, 10);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mindforge-profile-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Export downloaded.");
  };

  const onPickImport = async (file: File) => {
    if (file.size > 1_000_000) {
      setMessage("Import file is too large.");
      return;
    }
    const text = await file.text();
    if (!assertPayloadSize(text)) {
      setMessage("Import file is too large.");
      return;
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      setMessage("Invalid JSON.");
      return;
    }
    const parsed = validateExport(json);
    if (!parsed.success) {
      setMessage("This file is not a valid Mindforge export.");
      return;
    }
    const p = parsed.data.profile;
    setImportPreview({
      level: p.profile.playerLevel,
      runs: p.profile.totalRuns,
      floor: p.personalBests.highestFloor,
      milestones: p.milestones.length,
      raw: parsed.data,
    });
  };

  const applyImport = (mode: "merge" | "replace") => {
    if (!importPreview) return;
    const exportData = importPreview.raw as {
      profile: Parameters<typeof normalizeData>[0];
    };
    const normalized = normalizeData({
      ...exportData.profile,
      sync: createDefaultSyncState(Date.now()),
    });
    applyImportedData(normalized, mode);
    setImportPreview(null);
    setMessage(
      mode === "merge"
        ? "Import merged with current progress."
        : "Import replaced current progress."
    );
  };

  const deleteAccount = async () => {
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    });
    if (!res.ok) {
      setMessage("We couldn't delete the cloud account. Try again.");
      return;
    }
    if (alsoClearLocal) resetAllProgress();
    await signOut({ callbackUrl: "/account" });
  };

  return (
    <MobileContainer className="gap-4">
      <div className="pt-2 text-center">
        <h1 className="text-3xl font-bold text-white">Account</h1>
        <p className="mt-1 text-sm text-slate-400">
          Identity, sync, and data controls
        </p>
      </div>

      <SyncStatusBadge />

      {account.status === "authenticated" ? (
        <Card className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
            Signed in as
          </p>
          <p className="text-sm text-white">
            {account.displayName || account.email || account.userId}
          </p>
          {account.email ? (
            <p className="text-xs text-slate-400">{account.email}</p>
          ) : null}
          <p className="text-xs text-slate-500">
            Last synced: {formatSyncTime(data.sync.lastSuccessfulSync)}
          </p>
          <Button fullWidth onClick={() => void syncNow()}>
            Sync Now
          </Button>
        </Card>
      ) : (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Save your progress</h2>
          <p className="text-sm text-slate-300">
            Sign in to back up your progress and continue on other devices.
          </p>
          {!cloudEnabled ? (
            <p className="text-xs text-amber-200/90">
              Cloud sync is not configured on this deployment. Guest play still
              works locally.
            </p>
          ) : null}
          {providers.includes("google") ? (
            <Button fullWidth onClick={() => void signIn("google")}>
              Continue with Google
            </Button>
          ) : null}
          {providers.includes("github") ? (
            <Button
              fullWidth
              variant="secondary"
              onClick={() => void signIn("github")}
            >
              Continue with GitHub
            </Button>
          ) : null}
          {providers.includes("dev-login") ? (
            <div className="space-y-2">
              <label className="block text-xs text-slate-400" htmlFor="dev-email">
                Dev login email
              </label>
              <input
                id="dev-email"
                type="email"
                value={devEmail}
                onChange={(e) => setDevEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
              <Button
                fullWidth
                variant="secondary"
                onClick={() =>
                  void signIn("dev-login", { email: devEmail, redirect: true })
                }
              >
                Continue with Email (dev)
              </Button>
            </div>
          ) : null}
          <Button
            fullWidth
            variant="ghost"
            onClick={() => router.push("/")}
          >
            Not now
          </Button>
        </Card>
      )}

      {needsMigrationChoice ? (
        <Card className="space-y-3 border-cyan-500/30">
          <h2 className="text-base font-semibold text-white">Local progress found</h2>
          <p className="text-sm text-slate-300">
            Mindforge found progress on this device. Cloud has no existing
            profile yet.
          </p>
          <p className="text-xs text-slate-400">
            Local: Level {data.profile.playerLevel} · Highest floor{" "}
            {data.personalBests.highestFloor}
          </p>
          <Button fullWidth onClick={() => void resolveKeepLocal()}>
            Upload local progress
          </Button>
        </Card>
      ) : null}

      {syncStatus === "conflict" && conflicts.length > 0 ? (
        <Card className="space-y-3 border-amber-500/40">
          <h2 className="text-base font-semibold text-white">Save conflict</h2>
          <p className="text-sm text-slate-300">
            Mindforge found progress from two devices. We can safely merge most
            of it.
          </p>
          <Button fullWidth onClick={() => void syncNow()}>
            Merge progress
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              fullWidth
              size="sm"
              variant="secondary"
              onClick={() => void resolveKeepLocal()}
            >
              Keep local
            </Button>
            <Button
              fullWidth
              size="sm"
              variant="secondary"
              onClick={() => void resolveKeepCloud()}
            >
              Keep cloud
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
          Data
        </h2>
        <Button fullWidth variant="secondary" onClick={exportLocal}>
          Export my data
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onPickImport(f);
          }}
        />
        <Button
          fullWidth
          variant="secondary"
          onClick={() => fileRef.current?.click()}
        >
          Import data
        </Button>
      </Card>

      {importPreview ? (
        <Card className="space-y-3 border-cyan-500/30">
          <h2 className="text-base font-semibold text-white">
            Import Mindforge data
          </h2>
          <ul className="space-y-1 text-sm text-slate-300">
            <li>Player level: {importPreview.level}</li>
            <li>Total runs: {importPreview.runs}</li>
            <li>Highest floor: {importPreview.floor}</li>
            <li>Milestones: {importPreview.milestones}</li>
          </ul>
          <Button fullWidth onClick={() => applyImport("merge")}>
            Merge with current progress
          </Button>
          <Button
            fullWidth
            variant="secondary"
            onClick={() => applyImport("replace")}
          >
            Replace current progress
          </Button>
          <Button
            fullWidth
            variant="ghost"
            onClick={() => setImportPreview(null)}
          >
            Cancel
          </Button>
        </Card>
      ) : null}

      {message ? (
        <p className="text-center text-sm text-cyan-200" role="status">
          {message}
        </p>
      ) : null}

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
          Device
        </h2>
        {!confirmClearLocal ? (
          <Button
            fullWidth
            variant="danger"
            onClick={() => setConfirmClearLocal(true)}
          >
            Clear local data on this device
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-rose-200">
              Clear progress stored on this device? Cloud progress stays safe if
              you are signed in and synchronized.
            </p>
            <Button
              fullWidth
              variant="danger"
              onClick={() => {
                resetAllProgress();
                setConfirmClearLocal(false);
                setMessage("Local data cleared.");
              }}
            >
              Confirm clear local
            </Button>
            <Button
              fullWidth
              variant="ghost"
              onClick={() => setConfirmClearLocal(false)}
            >
              Cancel
            </Button>
          </div>
        )}
      </Card>

      {account.status === "authenticated" ? (
        <Card className="space-y-3">
          <Button
            fullWidth
            variant="secondary"
            onClick={() => void signOut({ callbackUrl: "/" })}
          >
            Sign out
          </Button>
          <p className="text-xs text-slate-500">
            Signing out keeps local progress on this device.
          </p>
          {!confirmDelete ? (
            <Button
              fullWidth
              variant="danger"
              onClick={() => setConfirmDelete(true)}
            >
              Delete account
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-rose-200">
                This permanently deletes your Mindforge cloud account and
                cloud-stored progression.
              </p>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={alsoClearLocal}
                  onChange={(e) => setAlsoClearLocal(e.target.checked)}
                />
                Also remove Mindforge progress stored on this device?
              </label>
              <Button fullWidth variant="danger" onClick={() => void deleteAccount()}>
                Confirm delete account
              </Button>
              <Button
                fullWidth
                variant="ghost"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </div>
          )}
        </Card>
      ) : null}

      <Button fullWidth variant="ghost" onClick={() => router.push("/")}>
        Back
      </Button>
      <Button fullWidth variant="ghost" onClick={() => router.push("/settings")}>
        Settings
      </Button>
    </MobileContainer>
  );
}
