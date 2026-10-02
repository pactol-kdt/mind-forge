"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useGameStore } from "@/stores/gameStore";
import { ALL_PUZZLE_TYPES, type PuzzleType } from "@/types/puzzles";
import {
  accuracyOf,
  averageResponseMs,
  categoryStrength,
  fastestCategory,
  formatSeconds,
  labelFor,
  mostChallengingCategory,
  strongestCategory,
} from "@/lib/game/statistics";
import { getUpgradeDisplay } from "@/lib/game/upgrades";
import { getMilestone } from "@/lib/game/milestones";
import { getChallenge } from "@/lib/game/challenges";
import { evaluateObjectives } from "@/lib/challenges/challengeObjectives";
import { getWeeklyChallenge } from "@/lib/game/weeklyChallenge";
import { setPendingRunConfig } from "@/lib/game/pendingRun";

export function ResultsScreen() {
  const router = useRouter();
  const run = useGameStore((s) => s.run);
  const startRun = useGameStore((s) => s.startRun);
  const startDaily = useGameStore((s) => s.startDaily);
  const resetToIdle = useGameStore((s) => s.resetToIdle);

  useEffect(() => {
    if (run.status !== "game-over") {
      router.replace("/");
    }
  }, [run.status, router]);

  if (run.status !== "game-over") {
    return (
      <MobileContainer className="items-center justify-center">
        <p className="text-sm text-slate-400">Loading results…</p>
      </MobileContainer>
    );
  }

  const accuracy =
    run.totalAnswers === 0
      ? 0
      : Math.round((run.correctAnswers / run.totalAnswers) * 100);

  const strongest = strongestCategory(run.categoryStats);
  const challenging = mostChallengingCategory(run.categoryStats);
  const fastest = fastestCategory(run.categoryStats);
  const isDaily = run.mode === "daily";

  const playAgain = () => {
    if (isDaily) startDaily();
    else {
      setPendingRunConfig({
        mode: run.runMode,
        challengeId: run.challengeId,
        difficultyTier: run.difficultyTier,
        specialistCategory: run.specialistCategory,
        weeklyId: run.weeklyId,
        seed: run.runMode === "seeded" ? run.seed : undefined,
      });
      startRun({
        mode: run.runMode,
        challengeId: run.challengeId,
        difficultyTier: run.difficultyTier,
        specialistCategory: run.specialistCategory,
        weeklyId: run.weeklyId,
        seed: run.runMode === "seeded" ? run.seed : undefined,
      });
    }
    router.push("/play");
  };

  const goHome = () => {
    resetToIdle();
    router.push("/");
  };

  return (
    <MobileContainer className="gap-4">
      <div className="pt-2 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300/80">
          {isDaily
            ? "Daily Training Complete"
            : run.runMode === "weekly"
              ? "Weekly Challenge"
              : run.challengeId
                ? "Challenge Complete"
                : "Run Complete"}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">
          {isDaily
            ? "Session Done"
            : run.challengeId
              ? getChallenge(run.challengeId)?.name ?? "Challenge"
              : "Game Over"}
        </h1>
        {run.archetype ? (
          <p className="mt-1 text-sm text-cyan-300/90">Build · {run.archetype}</p>
        ) : null}
      </div>

      <Card glow className="text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
          {isDaily ? "Session Score" : "Final Score"}
        </p>
        <p className="mt-2 font-mono text-4xl font-bold tabular-nums text-cyan-300">
          {run.score.toLocaleString("en-US")}
        </p>
        <p className="mt-2 font-mono text-sm text-amber-300">
          XP +{run.xpEarned}
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {!isDaily ? (
          <Stat label="Floor Reached" value={String(run.floor)} />
        ) : (
          <Stat
            label="Correct"
            value={`${run.correctAnswers}/${run.totalAnswers}`}
          />
        )}
        <Stat label="Accuracy" value={`${accuracy}%`} />
        <Stat label="Best Streak" value={`${run.bestStreak}x`} />
        <Stat label="Puzzles" value={String(run.puzzlesCompleted)} />
        {!isDaily ? (
          <>
            <Stat label="Bosses" value={String(run.bossesDefeated)} />
            <Stat label="Elites" value={String(run.elitesCleared)} />
          </>
        ) : null}
      </div>

      {!isDaily && run.seed ? (
        <Card>
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
            Seed
          </p>
          <p className="mt-1 break-all font-mono text-sm text-cyan-200">
            {run.seed}
          </p>
          <Button
            className="mt-2"
            size="sm"
            variant="secondary"
            fullWidth
            onClick={() => {
              void navigator.clipboard?.writeText(run.seed);
            }}
          >
            Copy Seed
          </Button>
        </Card>
      ) : null}

      {!isDaily && (run.challengeId || run.runMode === "weekly") ? (
        <Card>
          <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
            Objective
          </p>
          {(() => {
            const objectives =
              run.runMode === "weekly"
                ? getWeeklyChallenge(run.weeklyId).objectives
                : getChallenge(run.challengeId ?? "")?.objectives;
            const result = evaluateObjectives(objectives, {
              floorReached: run.floor,
              score: run.score,
              accuracy: run.totalAnswers
                ? run.correctAnswers / run.totalAnswers
                : 0,
              bossesDefeated: run.bossesDefeated,
              elitesCleared: run.elitesCleared,
            });
            return (
              <ul className="space-y-1 text-sm text-slate-300">
                {result.items.map((item) => (
                  <li key={item.label}>
                    {item.label}: {Math.min(item.current, item.target)} /{" "}
                    {item.target}
                    {item.done ? " ✓" : ""}
                  </li>
                ))}
                {result.allComplete ? (
                  <li className="text-cyan-300">Reward applied (+200 XP)</li>
                ) : (
                  <li className="text-slate-500">Objective in progress</li>
                )}
              </ul>
            );
          })()}
        </Card>
      ) : null}

      {run.pendingUnlocks.length > 0 ? (
        <Card className="border-amber-400/40">
          <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-amber-300">
            New Unlocks
          </p>
          <ul className="space-y-1 text-sm text-slate-200">
            {run.pendingUnlocks.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {run.pendingLevelUps.length > 0 ? (
        <Card className="border-amber-400/40 text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-300">
            Level Up
          </p>
          <p className="mt-1 text-2xl font-bold text-white">
            Level {run.pendingLevelUps[run.pendingLevelUps.length - 1]}
          </p>
        </Card>
      ) : null}

      {Object.keys(run.ratingDeltas).length > 0 ? (
        <Card>
          <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
            Rating Changes
          </p>
          <ul className="space-y-1 text-sm text-slate-300">
            {(Object.entries(run.ratingDeltas) as Array<
              [PuzzleType, { from: number; to: number }]
            >)
              .slice(0, 4)
              .map(([type, delta]) => (
                <li key={type} className="flex justify-between">
                  <span>{labelFor(type)}</span>
                  <span className="font-mono">
                    {Math.round(delta.from)} → {Math.round(delta.to)}
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      ) : null}

      {Object.keys(run.masteryLevelUps).length > 0 ? (
        <Card>
          <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
            Mastery Ups
          </p>
          <ul className="space-y-1 text-sm text-slate-300">
            {(Object.entries(run.masteryLevelUps) as Array<
              [PuzzleType, { from: number; to: number }]
            >).map(([type, delta]) => (
              <li key={type}>
                {labelFor(type)} Lv. {delta.from} → {delta.to}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {run.newPersonalBests.length > 0 ? (
        <Card>
          <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
            New Personal Bests
          </p>
          <ul className="space-y-1 text-sm text-cyan-200">
            {run.newPersonalBests.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {run.pendingMilestones.length > 0 ? (
        <Card>
          <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
            Milestones Unlocked
          </p>
          <ul className="space-y-1 text-sm text-amber-200">
            {run.pendingMilestones.map((id) => (
              <li key={id}>{getMilestone(id)?.name ?? id}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {!isDaily ? (
        <Card>
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
            Your Run
          </p>
          <ul className="space-y-3">
            {ALL_PUZZLE_TYPES.map((type) => {
              const strength = categoryStrength(run.categoryStats[type]);
              return (
                <li key={type}>
                  <div className="mb-1 flex justify-between text-xs text-slate-400">
                    <span>{labelFor(type)}</span>
                    <span className="font-mono">{strength}/10</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-cyan-400/80"
                      style={{ width: `${strength * 10}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 space-y-1 text-sm text-slate-300">
            {strongest ? (
              <p>
                Strongest this run:{" "}
                <span className="text-white">{labelFor(strongest)}</span>
              </p>
            ) : null}
            {challenging ? (
              <p>
                Most challenging this run:{" "}
                <span className="text-white">{labelFor(challenging)}</span>
              </p>
            ) : null}
            {fastest ? (
              <p>
                Fastest category:{" "}
                <span className="text-white">{labelFor(fastest)}</span>
              </p>
            ) : null}
          </div>
        </Card>
      ) : (
        <Card>
          <p className="mb-3 text-[10px] uppercase tracking-[0.16em] text-slate-500">
            By Category
          </p>
          <ul className="space-y-2 text-sm">
            {ALL_PUZZLE_TYPES.map((type) => {
              const stat = run.categoryStats[type];
              if (!stat || stat.attempted === 0) return null;
              return (
                <li key={type} className="flex justify-between text-slate-300">
                  <span>{labelFor(type)}</span>
                  <span className="font-mono">
                    {stat.correct}/{stat.attempted}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card>
        <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
          Category Breakdown
        </p>
        <ul className="space-y-4">
          {ALL_PUZZLE_TYPES.map((type) => (
            <CategoryBlock key={type} type={type} />
          ))}
        </ul>
      </Card>

      {run.upgrades.length > 0 ? (
        <Card>
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
            Upgrades This Run
          </p>
          <ul className="space-y-1 text-sm text-slate-300">
            {run.upgrades.map((u) => (
              <li key={u.upgradeId}>
                {getUpgradeDisplay(u).name}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="mt-auto space-y-3 pb-2">
        <Button fullWidth size="xl" onClick={playAgain}>
          {isDaily ? "Train Again" : "Play Again"}
        </Button>
        <Button fullWidth size="lg" variant="secondary" onClick={goHome}>
          Return Home
        </Button>
      </div>
    </MobileContainer>
  );
}

function CategoryBlock({ type }: { type: PuzzleType }) {
  const run = useGameStore((s) => s.run);
  const stat = run.categoryStats[type];
  if (!stat || stat.attempted === 0) {
    return (
      <li className="text-sm text-slate-500">
        <span className="text-slate-300">{labelFor(type)}</span> — not played
      </li>
    );
  }
  return (
    <li className="text-sm">
      <p className="font-medium text-slate-200">{labelFor(type)}</p>
      <p className="mt-1 font-mono text-xs tabular-nums text-slate-400">
        Accuracy {accuracyOf(stat)}% · Avg{" "}
        {formatSeconds(averageResponseMs(stat))} · Peak diff{" "}
        {stat.highestDifficulty} · Score{" "}
        {stat.scoreContribution.toLocaleString("en-US")}
      </p>
    </li>
  );
}

function Stat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <Card className={`text-center ${className}`}>
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-white">
        {value}
      </p>
    </Card>
  );
}
