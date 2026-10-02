"use client";

import { useSyncExternalStore, useState } from "react";
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
import { DIFFICULTY_TIERS } from "@/lib/game/modifiers";
import { normalizeSeed, randomSeedString } from "@/lib/game/seededRandom";
import { setPendingRunConfig } from "@/lib/game/pendingRun";
import type { DifficultyTier } from "@/types/run";

export function SetupScreen() {
  const router = useRouter();
  const mounted = useHasMounted();
  const data = useSyncExternalStore(
    subscribeGameData,
    getGameDataSnapshot,
    getServerGameDataSnapshot
  );
  const live = mounted ? data : getServerGameDataSnapshot();
  const unlockedTiers = new Set(live.meta.difficultyTiersUnlocked);
  const [tier, setTier] = useState<DifficultyTier>("standard");
  const [seed, setSeed] = useState("");
  const [showSeed, setShowSeed] = useState(false);

  const selected = DIFFICULTY_TIERS.find((t) => t.id === tier)!;

  const start = () => {
    const useSeed = showSeed && seed.trim().length > 0;
    setPendingRunConfig({
      mode: useSeed ? "seeded" : "standard",
      difficultyTier: tier,
      seed: useSeed ? normalizeSeed(seed) : undefined,
    });
    router.push("/play");
  };

  return (
    <MobileContainer className="gap-4">
      <div className="pt-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
          ← Home
        </Button>
        <h1 className="mt-3 text-2xl font-bold text-white">Standard Run</h1>
        <p className="mt-1 text-sm text-slate-400">
          One tap to play — advanced options optional.
        </p>
      </div>

      <Card>
        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
          Difficulty
        </p>
        <div className="mt-2 flex flex-col gap-2">
          {DIFFICULTY_TIERS.map((t) => {
            const open =
              unlockedTiers.has(t.id) ||
              t.unlockPlayerLevel <= live.profile.playerLevel;
            return (
              <button
                key={t.id}
                type="button"
                disabled={!open}
                onClick={() => setTier(t.id)}
                className={[
                  "rounded-xl border p-3 text-left",
                  tier === t.id
                    ? "border-cyan-400 bg-cyan-400/10"
                    : "border-slate-700 bg-slate-900/60",
                  !open ? "opacity-40" : "",
                ].join(" ")}
              >
                <div className="flex justify-between gap-2">
                  <span className="font-semibold text-white">{t.name}</span>
                  <span className="text-[11px] text-slate-400">
                    Score {(t.effects.scoreMultiplier ?? 1).toFixed(2)}x · XP{" "}
                    {(t.effects.xpMultiplier ?? 1).toFixed(2)}x
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{t.description}</p>
                {!open ? (
                  <p className="mt-1 text-[11px] text-amber-300/80">
                    Unlocks at level {t.unlockPlayerLevel}
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <button
          type="button"
          className="text-sm text-cyan-300"
          onClick={() => setShowSeed((v) => !v)}
        >
          {showSeed ? "Hide advanced options" : "Advanced options"}
        </button>
        {showSeed ? (
          <div className="mt-3 space-y-2">
            <label className="block text-[10px] uppercase tracking-[0.16em] text-slate-500">
              Seed
            </label>
            <input
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="MINDFORGE-482731"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-sm text-white"
              aria-label="Run seed"
            />
            <Button
              fullWidth
              size="sm"
              variant="secondary"
              onClick={() => setSeed(randomSeedString())}
            >
              Generate Random Seed
            </Button>
          </div>
        ) : null}
      </Card>

      <Card className="text-sm text-slate-300">
        <p className="font-semibold text-white">{selected.name}</p>
        <p className="mt-1">
          Difficulty pressure and rewards match the selected tier. Defaults stay
          one-tap friendly from Home.
        </p>
      </Card>

      <Button fullWidth size="xl" onClick={start}>
        Start
      </Button>
    </MobileContainer>
  );
}
