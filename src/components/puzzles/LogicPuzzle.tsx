"use client";

import type { LogicPuzzle } from "@/types/puzzles";

interface LogicPuzzleViewProps {
  puzzle: LogicPuzzle;
  disabled?: boolean;
  onAnswer: (value: string) => void;
}

export function LogicPuzzleView({
  puzzle,
  disabled,
  onAnswer,
}: LogicPuzzleViewProps) {
  return (
    <div className="flex flex-1 flex-col">
      <p className="mb-3 text-center text-sm text-slate-300">{puzzle.prompt}</p>
      {puzzle.detailLines?.map((line, i) => (
        <p
          key={i}
          className="mb-1 text-center font-mono text-base text-slate-200"
        >
          {line}
        </p>
      ))}
      {puzzle.items && puzzle.variant === "symbol-pattern" ? null : null}
      <div className="mt-auto grid grid-cols-2 gap-3 pt-4">
        {puzzle.choices.map((choice, index) => (
          <button
            key={`${puzzle.id}-${index}`}
            type="button"
            disabled={disabled}
            onClick={() => onAnswer(choice)}
            aria-label={`Answer ${choice}`}
            className="flex min-h-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 px-3 text-lg font-semibold text-slate-100 hover:border-cyan-500/50 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 touch-manipulation disabled:opacity-60"
          >
            {choice}
          </button>
        ))}
      </div>
    </div>
  );
}
