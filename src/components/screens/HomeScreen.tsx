"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  getGameDataSnapshot,
  getServerGameDataSnapshot,
  subscribeGameData,
} from "@/lib/storage/gameStorage";
import { useHasMounted } from "@/hooks/useHasMounted";
import { xpProgress } from "@/lib/game/progression";
import { todayKey } from "@/lib/game/dailyTraining";
import { useGameStore } from "@/stores/gameStore";
import { setPendingRunConfig } from "@/lib/game/pendingRun";
import { getWeeklyChallenge } from "@/lib/game/weeklyChallenge";
import { clearUnlockNotices } from "@/lib/progression/unlocks";
import { saveGameData, loadGameData } from "@/lib/storage/gameStorage";
import { useEffect } from "react";
import { SyncStatusBadge } from "@/components/account/SyncStatusBadge";

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function HomeScreen() {
  const router = useRouter();
  const mounted = useHasMounted();
  const startDaily = useGameStore((s) => s.startDaily);
  const stored = useSyncExternalStore(
    subscribeGameData,
    getGameDataSnapshot,
    getServerGameDataSnapshot
  );
  const data = mounted ? stored : getServerGameDataSnapshot();
  const { profile, lifetime, meta, modeBests } = data;
  const xp = xpProgress(profile);
  const dailyDone = data.daily?.dateKey === todayKey() && data.daily.completed;
  const weekly = getWeeklyChallenge();
  const weeklyBest = data.weeklyHistory.find((w) => w.weekId === weekly.weekId);
  const standardBest = modeBests["standard:standard"];

  useEffect(() => {
    if (!mounted) return;
    if (meta.pendingUnlockNotices.length === 0) return;
    // Auto-clear after showing once via state — keep notices for UI toast below
  }, [mounted, meta.pendingUnlockNotices.length]);

  const dismissUnlocks = () => {
    const current = loadGameData();
    saveGameData({ ...current, meta: clearUnlockNotices(current.meta) });
  };

  return (
    <MobileContainer className="justify-between gap-5">
      <div className="flex flex-1 flex-col justify-center pt-3">
        <div className="text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-xl text-cyan-300 shadow-[0_0_40px_rgba(34,211,238,0.25)]"
            aria-hidden
          >
            ◆
          </div>
          <h1 className="text-4xl font-bold tracking-[0.12em] text-white">
            MINDFORGE
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Train your mind. Climb forever.
          </p>
          <div className="mt-2">
            <SyncStatusBadge />
          </div>
        </div>

        <Card className="mt-6 text-center" glow>
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
            Player Level
          </p>
          <p className="mt-1 font-mono text-3xl font-bold text-white">
            {profile.playerLevel}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-cyan-400"
              style={{ width: `${xp.ratio * 100}%` }}
            />
          </div>
          <p className="mt-2 font-mono text-xs text-slate-400">
            {formatNumber(xp.current)} / {formatNumber(xp.needed)} XP
          </p>
        </Card>

        {meta.pendingUnlockNotices.length > 0 ? (
          <Card className="mt-3 border-amber-400/40" role="status" aria-live="polite">
            <p className="text-[10px] uppercase tracking-[0.16em] text-amber-300">
              New Unlock
            </p>
            <ul className="mt-2 space-y-1 text-left text-sm text-slate-200">
              {meta.pendingUnlockNotices.slice(0, 3).map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
            <Button
              className="mt-3"
              fullWidth
              size="sm"
              variant="secondary"
              onClick={dismissUnlocks}
            >
              Got it
            </Button>
          </Card>
        ) : null}

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Card className="text-center">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
              Recent Best
            </p>
            <p className="mt-1 font-mono text-lg font-semibold text-cyan-300">
              {formatNumber(standardBest?.highestScore ?? lifetime.bestScore)}
            </p>
          </Card>
          <Card className="text-center">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
              Weekly PB
            </p>
            <p className="mt-1 font-mono text-lg font-semibold text-white">
              {formatNumber(weeklyBest?.bestScore ?? 0)}
            </p>
          </Card>
        </div>
      </div>

      <div className="space-y-2.5 pb-2">
        <Button
          fullWidth
          size="xl"
          onClick={() => {
            setPendingRunConfig({ mode: "standard", difficultyTier: "standard" });
            router.push("/play");
          }}
        >
          Start Run
        </Button>
        <Button
          fullWidth
          size="lg"
          variant="secondary"
          disabled={dailyDone}
          onClick={() => {
            startDaily();
            router.push("/play");
          }}
        >
          {dailyDone ? "Daily Complete" : "Daily Training"}
        </Button>
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            fullWidth
            size="md"
            variant="ghost"
            onClick={() => router.push("/challenges")}
          >
            Challenges
          </Button>
          <Button
            fullWidth
            size="md"
            variant="ghost"
            onClick={() => router.push("/weekly")}
          >
            Weekly
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <Button
            fullWidth
            size="sm"
            variant="ghost"
            onClick={() => router.push("/setup")}
          >
            Setup
          </Button>
          <Button
            fullWidth
            size="sm"
            variant="ghost"
            onClick={() => router.push("/history")}
          >
            History
          </Button>
          <Button
            fullWidth
            size="sm"
            variant="ghost"
            onClick={() => router.push("/profile")}
          >
            Profile
          </Button>
        </div>
        <Button
          fullWidth
          size="sm"
          variant="ghost"
          onClick={() => router.push("/settings")}
        >
          Settings
        </Button>
        <Button
          fullWidth
          size="sm"
          variant="ghost"
          onClick={() => router.push("/account")}
        >
          Account
        </Button>
      </div>
    </MobileContainer>
  );
}
