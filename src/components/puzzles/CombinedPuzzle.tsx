"use client";

import { useEffect } from "react";
import type { CombinedPuzzle } from "@/types/puzzles";
import type { PuzzlePhase } from "@/types/game";
import { MEMORY_SYMBOL_GLYPHS } from "@/lib/puzzles/memory";

interface CombinedPuzzleViewProps {
  puzzle: CombinedPuzzle;
  phase: PuzzlePhase;
  disabled?: boolean;
  onBeginAnswering: () => void;
  onAnswer: (value: number | string) => void;
}

export function CombinedPuzzleView({
  puzzle,
  phase,
  disabled,
  onBeginAnswering,
  onAnswer,
}: CombinedPuzzleViewProps) {
  const needsPresent =
    puzzle.variant === "memory-math" ||
    puzzle.variant === "memory-logic" ||
    puzzle.variant === "memory-spatial";

  useEffect(() => {
    if (!needsPresent || phase !== "presenting") return;
    const id = window.setTimeout(() => {
      onBeginAnswering();
    }, puzzle.displayDurationMs ?? 3000);
    return () => window.clearTimeout(id);
  }, [phase, puzzle.displayDurationMs, onBeginAnswering, needsPresent]);

  if (phase === "presenting" && puzzle.variant === "memory-math" && puzzle.mapping) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-sm text-slate-400">Memorize the values</p>
        <ul className="space-y-3">
          {puzzle.mapping.map((m) => (
            <li
              key={m.symbol}
              className="flex min-w-[12rem] items-center justify-between gap-6 rounded-2xl border border-slate-700 bg-slate-800 px-5 py-3"
            >
              <span className="text-3xl text-cyan-200">
                {MEMORY_SYMBOL_GLYPHS[m.symbol]}
              </span>
              <span className="font-mono text-2xl font-bold text-white">
                {m.value}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (
    phase === "presenting" &&
    puzzle.variant === "memory-logic" &&
    puzzle.rememberedSequence
  ) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-sm text-slate-400">Memorize the sequence</p>
        <p className="font-mono text-3xl text-cyan-200">
          {puzzle.rememberedSequence.join(" ")}
        </p>
      </div>
    );
  }

  if (
    phase === "presenting" &&
    puzzle.variant === "memory-spatial" &&
    puzzle.sourceGrid
  ) {
    const size = puzzle.gridSize ?? 3;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="text-sm text-slate-400">Memorize the ★ location</p>
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        >
          {puzzle.sourceGrid.map((cell, i) => (
            <div
              key={i}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-xl text-cyan-200"
            >
              {cell}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (puzzle.variant === "attention-math") {
    const size = puzzle.gridSize ?? 3;
    return (
      <div className="flex flex-1 flex-col gap-4">
        <p className="text-center text-sm text-slate-400">
          {puzzle.mathPrompt ?? puzzle.prompt}
        </p>
        <div
          className="mx-auto grid gap-2"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        >
          {(puzzle.gridCells ?? []).map((cell, i) => (
            <div
              key={i}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-xl text-cyan-200"
            >
              {cell}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {puzzle.choices.map((choice, index) => (
            <button
              key={`${puzzle.id}-${index}`}
              type="button"
              disabled={disabled}
              onClick={() => onAnswer(choice)}
              className="flex min-h-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 font-mono text-2xl font-semibold text-slate-100 hover:border-cyan-500/50 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 touch-manipulation disabled:opacity-60"
            >
              {choice}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const displayExpr = (puzzle.expression ?? "")
    .split(" ")
    .map((token) => {
      const glyph =
        MEMORY_SYMBOL_GLYPHS[token as keyof typeof MEMORY_SYMBOL_GLYPHS];
      return glyph ?? token;
    })
    .join(" ");

  return (
    <div className="flex flex-1 flex-col">
      {puzzle.prompt ? (
        <p className="mb-2 text-center text-sm text-slate-400">{puzzle.prompt}</p>
      ) : (
        <p className="mb-2 text-center text-sm text-slate-400">
          Solve using memory
        </p>
      )}
      <div className="mb-6 flex flex-1 items-center justify-center">
        <p className="font-mono text-3xl font-bold text-white sm:text-4xl">
          {displayExpr}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {puzzle.choices.map((choice, index) => (
          <button
            key={`${puzzle.id}-${index}`}
            type="button"
            disabled={disabled}
            onClick={() => onAnswer(choice)}
            className="flex min-h-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 font-mono text-2xl font-semibold text-slate-100 hover:border-cyan-500/50 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 touch-manipulation disabled:opacity-60"
          >
            {typeof choice === "string"
              ? MEMORY_SYMBOL_GLYPHS[
                  choice as keyof typeof MEMORY_SYMBOL_GLYPHS
                ] ?? choice
              : choice}
          </button>
        ))}
      </div>
    </div>
  );
}
