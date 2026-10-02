"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Puzzle, PuzzleAnswer } from "@/types/puzzles";
import { PUZZLE_TYPE_LABELS } from "@/types/puzzles";
import type { FeedbackState, PuzzlePhase } from "@/types/game";
import { puzzleInitialPhase } from "@/lib/puzzles";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { FeedbackOverlay } from "./FeedbackOverlay";
import { MemoryPuzzleView } from "@/components/puzzles/MemoryPuzzle";
import { AttentionPuzzleView } from "@/components/puzzles/AttentionPuzzle";
import { MathPuzzleView } from "@/components/puzzles/MathPuzzle";
import { CombinedPuzzleView } from "@/components/puzzles/CombinedPuzzle";
import { LogicPuzzleView } from "@/components/puzzles/LogicPuzzle";
import { SpatialPuzzleView } from "@/components/puzzles/SpatialPuzzle";

interface PuzzleContainerProps {
  puzzle: Puzzle;
  phase: PuzzlePhase;
  feedback: FeedbackState | null;
  onAnswer: (answer: PuzzleAnswer) => void;
  onBeginAnswering: () => void;
  onDistraction?: (answer: number) => void;
  onTimeout: () => void;
  active?: boolean;
}

function PuzzleTimer({
  limitMs,
  onTimeout,
}: {
  limitMs: number;
  onTimeout: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(limitMs);

  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => {
      const remaining = Math.max(0, limitMs - (Date.now() - started));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        window.clearInterval(id);
        onTimeout();
      }
    }, 50);
    return () => window.clearInterval(id);
  }, [limitMs, onTimeout]);

  return (
    <div className="mb-4">
      <ProgressBar
        value={timeLeft}
        max={limitMs}
        label="Time"
        tone={timeLeft < limitMs * 0.25 ? "rose" : "cyan"}
      />
    </div>
  );
}

function instructionsFor(puzzle: Puzzle, phase: PuzzlePhase): string {
  if (puzzle.type === "memory") {
    if (phase === "presenting") return puzzle.prompt ?? "Remember the sequence";
    if (phase === "distraction") return "Solve the distraction";
    if (puzzle.variant === "reverse") return "Enter in reverse";
    if (puzzle.variant === "missing") return "Find the missing symbol";
    if (puzzle.variant === "position") return "Find the position";
    if (puzzle.variant === "chunk") return "Which chunk appeared?";
    if (puzzle.variant === "ordered-groups") return "Answer about the groups";
    if (puzzle.variant === "transform-recall")
      return puzzle.prompt ?? "Enter the transformed sequence";
    return "Recreate the sequence";
  }
  if (puzzle.type === "attention") {
    if (puzzle.prompt) return puzzle.prompt;
    if (puzzle.variant === "stroop") return "Follow the rule carefully";
    if (puzzle.variant === "find-two" || puzzle.variant === "multi-target")
      return "Find all targets";
    if (puzzle.variant === "direction") return "Find the mismatched arrow";
    if (puzzle.variant === "symbol-count") return "Count the symbols";
    return "Tap the odd one out";
  }
  if (puzzle.type === "math") {
    if (puzzle.variant === "comparison") return "Compare the expressions";
    if (puzzle.variant === "missing-operator") return "Choose the operator";
    if (puzzle.variant === "target") return "Reach the target";
    if (puzzle.variant === "equation-chain") return "Complete the chain";
    if (puzzle.variant === "constraint") return "Satisfy the constraints";
    if (puzzle.variant === "estimation") return "Choose the closest estimate";
    return puzzle.prompt || "Solve the expression";
  }
  if (puzzle.type === "logic") return puzzle.prompt || "Reason carefully";
  if (puzzle.type === "spatial") return puzzle.prompt || "Think spatially";
  return phase === "presenting" ? "Memorize" : puzzle.prompt || "Solve with memory";
}

export function PuzzleContainer({
  puzzle,
  phase,
  feedback,
  onAnswer,
  onBeginAnswering,
  onDistraction,
  onTimeout,
  active = true,
}: PuzzleContainerProps) {
  const reduce = useReducedMotion();

  // Elite/announce sometimes leaves phase at "presenting" for puzzles that
  // should already be interactive — promote so timer + taps work.
  useEffect(() => {
    if (
      active &&
      phase === "presenting" &&
      puzzleInitialPhase(puzzle) === "answering"
    ) {
      onBeginAnswering();
    }
  }, [active, phase, puzzle, onBeginAnswering]);

  const effectivePhase: PuzzlePhase =
    phase === "presenting" && puzzleInitialPhase(puzzle) === "answering"
      ? "answering"
      : phase;
  const inputDisabled = !active || effectivePhase === "feedback";
  const showTimer =
    active &&
    (effectivePhase === "answering" || effectivePhase === "distraction") &&
    typeof puzzle.timeLimit === "number" &&
    puzzle.timeLimit > 0;

  return (
    <Card
      glow
      className="relative mt-4 flex min-h-[22rem] flex-1 flex-col overflow-hidden"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400/90">
            {PUZZLE_TYPE_LABELS[puzzle.type]}
            <span className="ml-2 text-slate-500">· {puzzle.variant}</span>
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {instructionsFor(puzzle, effectivePhase)}
          </p>
        </div>
      </div>

      {showTimer ? (
        <PuzzleTimer
          key={`timer-${puzzle.id}-${effectivePhase}`}
          limitMs={
            effectivePhase === "distraction"
              ? Math.min(puzzle.timeLimit!, 10000)
              : puzzle.timeLimit!
          }
          onTimeout={onTimeout}
        />
      ) : null}

      <motion.div
        key={`puzzle-${puzzle.id}`}
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-1 flex-col"
      >
        {puzzle.type === "memory" ? (
          <MemoryPuzzleView
            key={`memory-${puzzle.id}`}
            puzzle={puzzle}
            phase={active ? effectivePhase : "presenting"}
            onBeginAnswering={onBeginAnswering}
            onAnswer={onAnswer}
            onDistraction={onDistraction}
          />
        ) : null}
        {puzzle.type === "attention" ? (
          <AttentionPuzzleView
            puzzle={puzzle}
            disabled={inputDisabled}
            onAnswer={onAnswer}
          />
        ) : null}
        {puzzle.type === "math" ? (
          <MathPuzzleView
            puzzle={puzzle}
            disabled={inputDisabled}
            onAnswer={onAnswer}
          />
        ) : null}
        {puzzle.type === "logic" ? (
          <LogicPuzzleView
            puzzle={puzzle}
            disabled={inputDisabled}
            onAnswer={onAnswer}
          />
        ) : null}
        {puzzle.type === "spatial" ? (
          <SpatialPuzzleView
            puzzle={puzzle}
            disabled={inputDisabled}
            onAnswer={onAnswer}
          />
        ) : null}
        {puzzle.type === "combined" ? (
          <CombinedPuzzleView
            key={`combined-${puzzle.id}`}
            puzzle={puzzle}
            phase={active ? effectivePhase : "presenting"}
            disabled={inputDisabled}
            onBeginAnswering={onBeginAnswering}
            onAnswer={onAnswer}
          />
        ) : null}
      </motion.div>

      <AnimatePresence>
        {effectivePhase === "feedback" && feedback ? (
          <FeedbackOverlay key="feedback" feedback={feedback} />
        ) : null}
      </AnimatePresence>
    </Card>
  );
}
