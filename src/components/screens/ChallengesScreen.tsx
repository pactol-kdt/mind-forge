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
import { CHALLENGE_DEFINITIONS } from "@/lib/game/challenges";
import { setPendingRunConfig } from "@/lib/game/pendingRun";
import type { PuzzleType } from "@/types/puzzles";
import { PUZZLE_TYPE_LABELS } from "@/types/puzzles";
import { FOCUS_CATEGORY_OPTS } from "@/lib/game/choicePath";

const SPECIALIST_OPTS = FOCUS_CATEGORY_OPTS;

export function ChallengesScreen() {
  const router = useRouter();
  const mounted = useHasMounted();
  const data = useSyncExternalStore(
    subscribeGameData,
    getGameDataSnapshot,
    getServerGameDataSnapshot
  );
  const live = mounted ? data : getServerGameDataSnapshot();
  const unlocked = new Set(live.meta.unlockedChallengeIds);
  const [specialist, setSpecialist] = useState<PuzzleType>("memory");

  const startChallenge = (id: string) => {
    setPendingRunConfig({
      mode: "challenge",
      challengeId: id,
      difficultyTier: "standard",
      specialistCategory: id === "specialist" ? specialist : undefined,
    });
    router.push("/play");
  };

  return (
    <MobileContainer className="gap-4">
      <div className="pt-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
          ← Home
        </Button>
        <h1 className="mt-3 text-2xl font-bold tracking-wide text-white">
          Challenge Modes
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Each mode changes rules meaningfully.
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-3 pb-4">
        {CHALLENGE_DEFINITIONS.map((c) => {
          const isUnlocked =
            unlocked.has(c.id) ||
            c.unlockPlayerLevel <= live.profile.playerLevel;
          const best = live.modeBests[`challenge:${c.id}`];
          const clears = live.meta.completedChallenges[c.id] ?? 0;

          return (
            <Card key={c.id} className={!isUnlocked ? "opacity-50" : ""}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-white">{c.name}</h2>
                  <p className="mt-0.5 text-sm text-slate-400">{c.description}</p>
                </div>
                <span className="shrink-0 rounded-md border border-slate-600 px-2 py-0.5 text-[10px] uppercase text-slate-300">
                  {c.rewardMultiplier}x
                </span>
              </div>
              <ul className="mt-2 list-inside list-disc text-xs text-slate-400">
                {c.rules.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-slate-500">
                Completions: {clears}
                {best
                  ? ` · Best ${best.highestScore.toLocaleString()} (F${best.highestFloor})`
                  : ""}
              </p>
              {c.specialistPick && isUnlocked ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SPECIALIST_OPTS.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSpecialist(cat)}
                      className={[
                        "rounded-lg border px-2 py-1 text-[11px]",
                        specialist === cat
                          ? "border-cyan-400 text-cyan-200"
                          : "border-slate-700 text-slate-400",
                      ].join(" ")}
                    >
                      {PUZZLE_TYPE_LABELS[cat]}
                    </button>
                  ))}
                </div>
              ) : null}
              <Button
                className="mt-3"
                fullWidth
                size="md"
                disabled={!isUnlocked}
                onClick={() => startChallenge(c.id)}
              >
                {isUnlocked
                  ? "Start"
                  : `Unlock at Level ${c.unlockPlayerLevel}`}
              </Button>
            </Card>
          );
        })}
      </div>
    </MobileContainer>
  );
}
