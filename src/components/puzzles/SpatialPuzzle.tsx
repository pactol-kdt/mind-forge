"use client";

import type { SpatialPuzzle } from "@/types/puzzles";

interface SpatialPuzzleViewProps {
  puzzle: SpatialPuzzle;
  disabled?: boolean;
  onAnswer: (index: number) => void;
}

function MiniGrid({
  cells,
  size,
  selected,
  onClick,
  disabled,
  label,
}: {
  cells: string[];
  size: number;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  label: string;
}) {
  const gap = size >= 3 ? "gap-1" : "gap-1.5";
  const cell =
    size >= 3
      ? "h-8 w-8 text-sm sm:h-9 sm:w-9"
      : "h-10 w-10 text-base sm:h-11 sm:w-11";

  const inner = (
    <div
      className={`grid ${gap}`}
      style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      aria-hidden
    >
      {cells.map((c, i) => (
        <span
          key={i}
          className={`flex items-center justify-center rounded-md bg-slate-950/60 text-cyan-100 ${cell}`}
        >
          {c}
        </span>
      ))}
    </div>
  );

  if (!onClick) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-3">
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      aria-pressed={selected}
      className={[
        "rounded-2xl border p-3 transition-colors touch-manipulation",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
        selected
          ? "border-cyan-400 bg-slate-800"
          : "border-slate-700 bg-slate-800/80 hover:border-cyan-500/40",
        disabled ? "opacity-60" : "",
      ].join(" ")}
    >
      {inner}
    </button>
  );
}

export function SpatialPuzzleView({
  puzzle,
  disabled,
  onAnswer,
}: SpatialPuzzleViewProps) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <p className="text-center text-sm text-slate-300">{puzzle.prompt}</p>
      <div className="flex justify-center">
        <MiniGrid
          cells={puzzle.source}
          size={puzzle.gridSize}
          label="Source pattern"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {puzzle.choices.map((choice, index) => (
          <MiniGrid
            key={`${puzzle.id}-opt-${index}`}
            cells={choice}
            size={puzzle.gridSize}
            disabled={disabled}
            onClick={() => onAnswer(index)}
            label={`Option ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
