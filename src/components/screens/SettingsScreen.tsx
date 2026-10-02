"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  getGameDataSnapshot,
  getServerGameDataSnapshot,
  resetAllProgress,
  saveSettings,
  subscribeGameData,
} from "@/lib/storage/gameStorage";
import { useHasMounted } from "@/hooks/useHasMounted";
import { setMuted } from "@/lib/game/feedbackFx";

export function SettingsScreen() {
  const router = useRouter();
  const mounted = useHasMounted();
  const stored = useSyncExternalStore(
    subscribeGameData,
    getGameDataSnapshot,
    getServerGameDataSnapshot
  );
  const data = mounted ? stored : getServerGameDataSnapshot();
  const [confirmReset, setConfirmReset] = useState(false);

  const toggle = (key: "sound" | "haptics" | "reducedMotion" | "highContrast") => {
    const next = { ...data.settings, [key]: !data.settings[key] };
    saveSettings(next);
    if (key === "sound") setMuted(!next.sound);
  };

  return (
    <MobileContainer className="gap-4">
      <div className="pt-2 text-center">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
      </div>

      <Card className="space-y-3">
        {(
          [
            ["sound", "Sound"],
            ["haptics", "Haptics"],
            ["reducedMotion", "Reduced motion preference"],
            ["highContrast", "Enhanced contrast"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-left text-sm text-slate-200"
          >
            <span>{label}</span>
            <span className="font-mono text-cyan-300">
              {data.settings[key] ? "On" : "Off"}
            </span>
          </button>
        ))}
      </Card>

      <Card>
        <p className="text-sm text-slate-300">
          Mindforge tracks in-game training performance only. It does not
          measure IQ or provide medical assessments. Signed-in accounts may
          store progress and settings in the cloud so you can continue on other
          devices. See Account for export, import, and deletion controls.
        </p>
      </Card>

      {!confirmReset ? (
        <Button
          fullWidth
          variant="danger"
          onClick={() => setConfirmReset(true)}
        >
          Reset All Progress
        </Button>
      ) : (
        <Card className="space-y-3 border-rose-500/40">
          <p className="text-sm text-rose-200">
            Reset all Mindforge progress? This removes lifetime statistics,
            profile ratings, mastery, XP, and milestones. This cannot be undone.
          </p>
          <Button
            fullWidth
            variant="danger"
            onClick={() => {
              resetAllProgress();
              setConfirmReset(false);
            }}
          >
            Confirm Reset
          </Button>
          <Button
            fullWidth
            variant="secondary"
            onClick={() => setConfirmReset(false)}
          >
            Cancel
          </Button>
        </Card>
      )}

      <div className="mt-auto space-y-2 pb-2">
        <Button fullWidth variant="secondary" onClick={() => router.push("/account")}>
          Account & sync
        </Button>
        <Button fullWidth variant="secondary" onClick={() => router.push("/")}>
          Home
        </Button>
      </div>
    </MobileContainer>
  );
}
