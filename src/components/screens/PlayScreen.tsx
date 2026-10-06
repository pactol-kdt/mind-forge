"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { GameHeader } from "@/components/game/GameHeader";
import { PuzzleContainer } from "@/components/game/PuzzleContainer";
import { UpgradeSelect } from "@/components/game/UpgradeSelect";
import { FloorAnnounce } from "@/components/game/FloorAnnounce";
import { Button } from "@/components/ui/Button";
import { useGameStore } from "@/stores/gameStore";
import { getUpgradeById } from "@/lib/game/upgrades";
import { takePendingRunConfig } from "@/lib/game/pendingRun";
import { evaluateObjectives } from "@/lib/challenges/challengeObjectives";
import { getChallenge } from "@/lib/game/challenges";
import { getWeeklyChallenge } from "@/lib/game/weeklyChallenge";
import { PUZZLE_TYPE_LABELS, type PuzzleType } from "@/types/puzzles";
import { puzzleInitialPhase } from "@/lib/puzzles";
import {
  FOCUS_CATEGORY_OPTS,
  choiceTrialLabel,
  pickChoicePathOptions,
} from "@/lib/game/choicePath";

export function PlayScreen() {
  const router = useRouter();
  const run = useGameStore((s) => s.run);
  const puzzle = useGameStore((s) => s.puzzle);
  const phase = useGameStore((s) => s.phase);
  const feedback = useGameStore((s) => s.feedback);
  const lastPointsEarned = useGameStore((s) => s.lastPointsEarned);
  const submitAnswer = useGameStore((s) => s.submitAnswer);
  const submitDistraction = useGameStore((s) => s.submitDistraction);
  const beginAnswering = useGameStore((s) => s.beginAnswering);
  const timeout = useGameStore((s) => s.timeout);
  const startRun = useGameStore((s) => s.startRun);
  const selectUpgrade = useGameStore((s) => s.selectUpgrade);
  const rerollUpgrades = useGameStore((s) => s.rerollUpgrades);
  const dismissAnnouncement = useGameStore((s) => s.dismissAnnouncement);
  const choosePath = useGameStore((s) => s.choosePath);
  const chooseGamble = useGameStore((s) => s.chooseGamble);
  const [pendingUpgradeId, setPendingUpgradeId] = useState<string | null>(null);
  const [specialistCategory, setSpecialistCategory] =
    useState<PuzzleType | null>(null);
  const [committingUpgrade, setCommittingUpgrade] = useState(false);
  const confirmKey = `${run.floor}-${run.status}`;
  const [lastConfirmKey, setLastConfirmKey] = useState(confirmKey);
  if (lastConfirmKey !== confirmKey) {
    setLastConfirmKey(confirmKey);
    setPendingUpgradeId(null);
    setSpecialistCategory(null);
    setCommittingUpgrade(false);
  }

  const pendingUpgrade = pendingUpgradeId
    ? getUpgradeById(pendingUpgradeId)
    : undefined;
  const needsSpecialistPick =
    pendingUpgrade?.effect.kind === "specialist" && !specialistCategory;

  useEffect(() => {
    if (run.status === "idle") {
      const pending = takePendingRunConfig();
      startRun(pending);
    }
  }, [run.status, startRun]);

  useEffect(() => {
    if (run.status === "game-over") {
      router.replace("/results");
    }
  }, [run.status, router]);

  // Recover stuck interaction: announce with no message, or presenting on
  // puzzles that should already be answerable (no timer / dead buttons).
  useEffect(() => {
    const state = useGameStore.getState();
    if (state.run.status === "announce" && !state.run.announcement) {
      useGameStore.setState({
        run: {
          ...state.run,
          status: state.run.mode === "daily" ? "daily" : "playing",
        },
      });
      return;
    }
    if (
      (state.run.status === "playing" || state.run.status === "daily") &&
      state.phase === "presenting" &&
      state.puzzle &&
      puzzleInitialPhase(state.puzzle) === "answering"
    ) {
      beginAnswering();
    }
  }, [
    run.status,
    run.announcement,
    run.mode,
    phase,
    puzzle,
    beginAnswering,
  ]);

  const onTimeout = useCallback(() => {
    const { phase: p, run: r } = useGameStore.getState();
    if (p === "distraction") {
      submitDistraction(-1);
      return;
    }
    // Always allow timeout to resolve even if status briefly mismatched
    if (r.status === "playing" || r.status === "daily" || r.status === "announce") {
      timeout();
    }
  }, [timeout, submitDistraction]);

  const objectives =
    run.runMode === "weekly"
      ? getWeeklyChallenge(run.weeklyId).objectives
      : run.challengeId
        ? getChallenge(run.challengeId)?.objectives
        : undefined;
  const accuracy =
    run.totalAnswers === 0 ? 0 : run.correctAnswers / run.totalAnswers;
  const objProgress = evaluateObjectives(objectives, {
    floorReached: run.floor,
    score: run.score,
    accuracy,
    bossesDefeated: run.bossesDefeated,
    elitesCleared: run.elitesCleared,
  });

  if (run.status === "game-over") {
    return (
      <MobileContainer className="items-center justify-center">
        <p className="text-sm text-slate-400">Loading results…</p>
      </MobileContainer>
    );
  }

  if (run.status === "upgrade") {
    const commitUpgrade = () => {
      if (!pendingUpgradeId || committingUpgrade) return;
      const u = getUpgradeById(pendingUpgradeId);
      if (u?.effect.kind === "specialist" && !specialistCategory) return;
      setCommittingUpgrade(true);
      if (u?.effect.kind === "specialist" && specialistCategory) {
        selectUpgrade(pendingUpgradeId, specialistCategory);
      } else {
        selectUpgrade(pendingUpgradeId);
      }
    };

    return (
      <MobileContainer>
        <GameHeader
          floor={run.floor}
          score={run.score}
          streak={run.streak}
          lives={run.lives}
          maxLives={run.maxLives}
          upgradeCount={run.upgrades.length}
        />
        {needsSpecialistPick ? (
          <div className="flex flex-1 flex-col gap-4 pt-4">
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/90">
                Specialist
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                Pick a focus category
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                +30% score in that category, −5% elsewhere
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {FOCUS_CATEGORY_OPTS.map((cat) => (
                <Button
                  key={cat}
                  fullWidth
                  size="lg"
                  variant={specialistCategory === cat ? "primary" : "secondary"}
                  onClick={() => setSpecialistCategory(cat)}
                >
                  {PUZZLE_TYPE_LABELS[cat]}
                </Button>
              ))}
            </div>
            <Button
              fullWidth
              size="lg"
              disabled={!specialistCategory}
              onClick={() => {
                if (!specialistCategory) return;
                setCommittingUpgrade(true);
                selectUpgrade(pendingUpgradeId!, specialistCategory);
              }}
            >
              Confirm Specialist
            </Button>
            <Button
              fullWidth
              variant="ghost"
              onClick={() => {
                setPendingUpgradeId(null);
                setSpecialistCategory(null);
              }}
            >
              Back
            </Button>
          </div>
        ) : (
          <UpgradeSelect
            choices={run.pendingUpgradeChoices}
            announcement={run.announcement}
            pendingName={pendingUpgrade?.name ?? null}
            committing={committingUpgrade}
            owned={run.upgrades}
            rerolls={run.upgradeRerolls}
            onReroll={rerollUpgrades}
            onPick={(id) => {
              setPendingUpgradeId(id);
              setSpecialistCategory(null);
            }}
            onConfirm={commitUpgrade}
            onCancel={() => {
              setPendingUpgradeId(null);
              setSpecialistCategory(null);
            }}
          />
        )}
      </MobileContainer>
    );
  }

  if (!puzzle && run.status !== "announce") {
    return (
      <MobileContainer className="items-center justify-center">
        <p className="text-sm text-slate-400">Preparing forge…</p>
      </MobileContainer>
    );
  }

  if (run.status === "announce" && run.announcement) {
    const isChoice = run.floorType === "choice" && !run.choiceCategory;
    const isGamble =
      run.specialModifier === "gamble" && run.gambleRisk === undefined;

    return (
      <MobileContainer>
        <GameHeader
          floor={run.floor}
          score={run.score}
          streak={run.streak}
          lives={run.lives}
          maxLives={run.maxLives}
          floorType={run.floorType}
          upgradeCount={run.upgrades.length}
        />
        {isChoice ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Choose Your Path
            </p>
            <p className="max-w-xs text-sm text-slate-300">{run.announcement}</p>
            <div className="flex w-full flex-col gap-2">
              {pickChoicePathOptions(
                run.seed,
                run.floor,
                run.recentCategories,
                Object.fromEntries(
                  Object.entries(run.categoryStats).map(([k, v]) => [
                    k,
                    v.attempted,
                  ])
                ) as Partial<Record<PuzzleType, number>>
              ).map((cat) => (
                <Button
                  key={cat}
                  fullWidth
                  size="lg"
                  onClick={() => choosePath(cat)}
                >
                  {choiceTrialLabel(cat)} (+30% reward)
                </Button>
              ))}
            </div>
          </div>
        ) : isGamble ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">
              Gamble Floor
            </p>
            <p className="max-w-xs text-sm text-slate-300">
              Safe keeps normal rewards. Risk raises difficulty and payout.
            </p>
            <div className="flex w-full flex-col gap-2">
              <Button fullWidth size="lg" onClick={() => chooseGamble(false)}>
                Safe
              </Button>
              <Button
                fullWidth
                size="lg"
                variant="secondary"
                onClick={() => chooseGamble(true)}
              >
                Risk
              </Button>
            </div>
          </div>
        ) : (
          <FloorAnnounce
            title={
              run.floorType === "boss"
                ? "Boss Floor"
                : run.floorType === "elite"
                  ? "Elite Floor"
                  : run.floorType === "special"
                    ? "Special Floor"
                    : "Floor Event"
            }
            message={run.announcement}
            onContinue={dismissAnnouncement}
          />
        )}
      </MobileContainer>
    );
  }

  if (!puzzle) {
    return (
      <MobileContainer className="items-center justify-center">
        <p className="text-sm text-slate-400">Preparing forge…</p>
      </MobileContainer>
    );
  }

  return (
    <MobileContainer>
      <GameHeader
        floor={run.floor}
        score={run.score}
        streak={run.streak}
        lives={run.lives}
        maxLives={run.maxLives}
        lastPoints={phase === "feedback" ? lastPointsEarned : undefined}
        floorType={run.floorType}
        upgradeCount={run.upgrades.length}
      />
      {objProgress.items[0] ? (
        <p className="mb-1 text-center text-[11px] text-slate-500" aria-live="polite">
          Objective: {objProgress.items[0].label} —{" "}
          {Math.min(objProgress.items[0].current, objProgress.items[0].target)} /{" "}
          {objProgress.items[0].target}
        </p>
      ) : null}
      {run.specialistCategory ? (
        <p className="mb-1 text-center text-[11px] text-slate-500">
          Focus: {PUZZLE_TYPE_LABELS[run.specialistCategory]}
        </p>
      ) : null}
      <PuzzleContainer
        puzzle={puzzle}
        phase={phase}
        feedback={feedback}
        onAnswer={submitAnswer}
        onBeginAnswering={beginAnswering}
        onDistraction={submitDistraction}
        onTimeout={onTimeout}
        active={
          run.status === "playing" ||
          run.status === "feedback" ||
          run.status === "daily" ||
          // Failsafe: allow answering if announce banner was cleared
          (run.status === "announce" && !run.announcement)
        }
      />
    </MobileContainer>
  );
}
