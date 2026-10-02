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
import { ALL_PUZZLE_TYPES, PUZZLE_TYPE_LABELS } from "@/types/puzzles";
import { STANDARD_TRAINING_CATEGORIES } from "@/types/categories";
import { getMilestone } from "@/lib/game/milestones";
import { getTrainingRecommendations } from "@/lib/game/trainingRecommendations";

export function ProfileScreen() {
  const router = useRouter();
  const mounted = useHasMounted();
  const stored = useSyncExternalStore(
    subscribeGameData,
    getGameDataSnapshot,
    getServerGameDataSnapshot
  );
  const data = mounted ? stored : getServerGameDataSnapshot();
  const { profile, personalBests, milestones, lifetime } = data;
  const xp = xpProgress(profile);
  const recs = getTrainingRecommendations(profile, 2);

  return (
    <MobileContainer className="gap-4">
      <div className="pt-2 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/80">
          Mindforge Profile
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">
          Level {profile.playerLevel}
        </h1>
        <p className="mt-2 font-mono text-sm text-slate-400">
          {xp.current} / {xp.needed} XP
        </p>
        <div className="mx-auto mt-3 h-2 max-w-xs overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-cyan-400"
            style={{ width: `${xp.ratio * 100}%` }}
          />
        </div>
      </div>

      <Card>
        <p className="mb-3 text-[10px] uppercase tracking-[0.16em] text-slate-500">
          Training Rating
        </p>
        <ul className="space-y-3">
          {STANDARD_TRAINING_CATEGORIES.map((type) => {
            const cat = profile.categories[type];
            const pct = Math.round(cat.rating);
            return (
              <li key={type}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-slate-300">
                    {PUZZLE_TYPE_LABELS[type]}
                  </span>
                  <span className="font-mono text-cyan-300">{pct}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-cyan-400/80"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[11px] text-slate-500">
          Performance ratings calibrate challenge level. They are not IQ or
          medical measures.
        </p>
      </Card>

      <Card>
        <p className="mb-3 text-[10px] uppercase tracking-[0.16em] text-slate-500">
          Category Mastery
        </p>
        <ul className="space-y-2">
          {ALL_PUZZLE_TYPES.map((type) => (
            <li
              key={type}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-slate-300">{PUZZLE_TYPE_LABELS[type]}</span>
              <span className="font-mono text-white">
                Lv. {profile.categories[type].masteryLevel}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="text-center">
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
            Runs
          </p>
          <p className="mt-1 font-mono text-xl text-white">
            {lifetime.gamesPlayed}
          </p>
        </Card>
        <Card className="text-center">
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
            Solved
          </p>
          <p className="mt-1 font-mono text-xl text-white">
            {lifetime.totalPuzzlesSolved}
          </p>
        </Card>
        <Card className="text-center">
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
            Best Floor
          </p>
          <p className="mt-1 font-mono text-xl text-white">
            {personalBests.highestFloor}
          </p>
        </Card>
        <Card className="text-center">
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
            Best Streak
          </p>
          <p className="mt-1 font-mono text-xl text-white">
            {personalBests.bestStreak}x
          </p>
        </Card>
      </div>

      {recs.length > 0 ? (
        <Card>
          <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
            Recommendations
          </p>
          <ul className="space-y-2 text-sm text-slate-300">
            {recs.map((r) => (
              <li key={r.category}>
                <span className="font-medium text-white">
                  {PUZZLE_TYPE_LABELS[r.category]}
                </span>
                <span className="block text-xs text-slate-400">{r.message}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {milestones.length > 0 ? (
        <Card>
          <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
            Milestones
          </p>
          <ul className="space-y-1 text-sm text-slate-300">
            {milestones.slice(-8).map((id) => (
              <li key={id}>{getMilestone(id)?.name ?? id}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="mt-auto space-y-3 pb-2">
        <Button fullWidth size="lg" onClick={() => router.push("/play")}>
          Start Run
        </Button>
        <Button
          fullWidth
          size="md"
          variant="secondary"
          onClick={() => router.push("/")}
        >
          Home
        </Button>
      </div>
    </MobileContainer>
  );
}
