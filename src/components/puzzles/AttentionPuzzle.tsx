"use client";

import { useState } from "react";
import type { AttentionPuzzle } from "@/types/puzzles";
import { STROOP_COLOR_CLASS } from "@/lib/puzzles/attention";

interface AttentionPuzzleViewProps {
  puzzle: AttentionPuzzle;
  disabled?: boolean;
  onAnswer: (answer: number | number[] | string) => void;
}

export function AttentionPuzzleView({
  puzzle,
  disabled,
  onAnswer,
}: AttentionPuzzleViewProps) {
  const [picked, setPicked] = useState<number[]>([]);

  if (puzzle.variant === "stroop") {
    const colorClass =
      STROOP_COLOR_CLASS[puzzle.stroopColor ?? "Blue"] ?? "text-sky-400";
    return (
      <div className="flex flex-1 flex-col">
        <p className="mb-3 text-center text-sm text-slate-400">
          Select the{" "}
          <span className="font-semibold text-white">
            {puzzle.stroopAsk === "word" ? "WORD meaning" : "ink COLOR name"}
          </span>
        </p>
        <div className="mb-6 flex flex-1 items-center justify-center">
          <p
            className={`text-5xl font-bold tracking-wide ${colorClass}`}
            aria-label={`Word ${puzzle.stroopWord} shown in ${puzzle.stroopColor}`}
          >
            {puzzle.stroopWord?.toUpperCase()}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(puzzle.stroopChoices ?? []).map((choice) => (
            <button
              key={choice}
              type="button"
              disabled={disabled}
              onClick={() => onAnswer(choice)}
              className="flex min-h-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-lg font-semibold text-slate-100 hover:border-cyan-500/50 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 touch-manipulation disabled:opacity-60"
            >
              {choice}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const sizeClass =
    puzzle.gridSize <= 3
      ? "grid-cols-3 max-w-[17rem] gap-3"
      : puzzle.gridSize === 4
        ? "grid-cols-4 max-w-[20rem] gap-2.5"
        : "grid-cols-5 max-w-[22rem] gap-2";

  const cellSize =
    puzzle.gridSize <= 3
      ? "h-14 w-14 text-3xl sm:h-16 sm:w-16"
      : puzzle.gridSize === 4
        ? "h-12 w-12 text-2xl sm:h-14 sm:w-14"
        : "h-10 w-10 text-xl sm:h-11 sm:w-11";

  const handleCell = (index: number) => {
    if (disabled) return;
    if (
      puzzle.variant === "find-two" ||
      puzzle.variant === "multi-target" ||
      puzzle.variant === "alternating"
    ) {
      const need = puzzle.targetIndices?.length ?? 2;
      const next = picked.includes(index)
        ? picked.filter((i) => i !== index)
        : [...picked, index].slice(0, need);
      setPicked(next);
      if (next.length === need) onAnswer(next);
      return;
    }
    onAnswer(index);
  };

  if (puzzle.variant === "symbol-count") {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <p className="text-center text-sm text-slate-400">
          {puzzle.prompt ?? "How many?"}
        </p>
        <div
          className={`mx-auto grid ${sizeClass}`}
          role="group"
          aria-label="Count grid"
        >
          {puzzle.cells.map((symbol, index) => (
            <div
              key={index}
              className={[
                "flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-800",
                cellSize,
              ].join(" ")}
            >
              {symbol}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(puzzle.countChoices ?? []).map((n) => (
            <button
              key={n}
              type="button"
              disabled={disabled}
              onClick={() => onAnswer(n)}
              className="flex min-h-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 font-mono text-2xl text-white hover:border-cyan-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 touch-manipulation disabled:opacity-60"
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3">
      {puzzle.variant === "find-two" ||
      puzzle.variant === "multi-target" ||
      puzzle.variant === "alternating" ? (
        <p className="text-sm text-slate-400">
          {puzzle.prompt ?? "Tap targets"} ({picked.length}/
          {puzzle.targetIndices?.length ?? 2})
        </p>
      ) : puzzle.variant === "direction" ? (
        <p className="text-sm text-slate-400">Tap the mismatched arrow</p>
      ) : (
        <p className="text-sm text-slate-400">
          {puzzle.prompt ?? "Tap the odd one out"}
        </p>
      )}
      <div className={`grid ${sizeClass}`} role="group" aria-label="Attention grid">
        {puzzle.cells.map((symbol, index) => (
          <button
            key={`${puzzle.id}-${index}`}
            type="button"
            disabled={disabled}
            onClick={() => handleCell(index)}
            aria-label={`Cell ${index + 1}, symbol ${symbol}`}
            aria-pressed={picked.includes(index)}
            className={[
              "flex items-center justify-center rounded-2xl border bg-slate-800 text-slate-100",
              "transition-colors hover:border-cyan-500/40 hover:bg-slate-700",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
              "touch-manipulation disabled:opacity-60",
              picked.includes(index)
                ? "border-cyan-400 ring-1 ring-cyan-400/50"
                : "border-slate-700",
              cellSize,
            ].join(" ")}
          >
            <span aria-hidden>{symbol}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
