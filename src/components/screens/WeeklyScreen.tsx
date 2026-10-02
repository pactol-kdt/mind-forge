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
import { getWeeklyChallenge } from "@/lib/game/weeklyChallenge";
import { setPendingRunConfig } from "@/lib/game/pendingRun";

export function WeeklyScreen() {
  const router = useRouter();
  const mounted = useHasMounted();
  const data = useSyncExternalStore(
    subscribeGameData,
    getGameDataSnapshot,
    getServerGameDataSnapshot
  );
  const live = mounted ? data : getServerGameDataSnapshot();
  const weekly = getWeeklyChallenge();
  const record = live.weeklyHistory.find((w) => w.weekId === weekly.weekId);

  return (
    <MobileContainer className="gap-4">
      <div className="pt-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
          ← Home
        </Button>
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/90">
          Weekly Challenge
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">{weekly.name}</h1>
        <p className="mt-1 text-sm text-slate-400">{weekly.description}</p>
        <p className="mt-2 font-mono text-xs text-slate-500">
          {weekly.weekId} · Seed {weekly.seed}
        </p>
      </div>

      <Card glow>
        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
          Rules
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-300">
          {weekly.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-cyan-300">
          Score multiplier: {weekly.rewardMultiplier}x
        </p>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <p className="text-[10px] uppercase text-slate-500">Best</p>
          <p className="mt-1 font-mono text-lg text-white">
            {(record?.bestScore ?? 0).toLocaleString()}
          </p>
        </Card>
        <Card className="text-center">
          <p className="text-[10px] uppercase text-slate-500">Floor</p>
          <p className="mt-1 font-mono text-lg text-white">
            {record?.highestFloor ?? 0}
          </p>
        </Card>
        <Card className="text-center">
          <p className="text-[10px] uppercase text-slate-500">Attempts</p>
          <p className="mt-1 font-mono text-lg text-white">
            {record?.attempts ?? 0}
          </p>
        </Card>
      </div>

      <Button
        fullWidth
        size="xl"
        onClick={() => {
          setPendingRunConfig({
            mode: "weekly",
            difficultyTier: "standard",
          });
          router.push("/play");
        }}
      >
        Start Challenge
      </Button>
    </MobileContainer>
  );
}
