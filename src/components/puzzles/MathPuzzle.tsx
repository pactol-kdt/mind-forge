"use client";

import type { MathPuzzle } from "@/types/puzzles";

interface MathPuzzleViewProps {
  puzzle: MathPuzzle;
  disabled?: boolean;
  onAnswer: (value: number | string) => void;
}

export function MathPuzzleView({
  puzzle,
  disabled,
  onAnswer,
}: MathPuzzleViewProps) {
  if (puzzle.variant === "comparison") {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <p className="text-center text-sm text-slate-400">Which is larger?</p>
        <div className="grid grid-cols-1 gap-3">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAnswer("left")}
            className="flex min-h-16 flex-col items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 hover:border-cyan-500/50 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 touch-manipulation disabled:opacity-60"
          >
            <span className="text-[10px] uppercase tracking-wider text-slate-500">
              Left
            </span>
            <span className="font-mono text-2xl font-bold text-white">
              {puzzle.leftExpression}
            </span>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAnswer("right")}
            className="flex min-h-16 flex-col items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 hover:border-cyan-500/50 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 touch-manipulation disabled:opacity-60"
          >
            <span className="text-[10px] uppercase tracking-wider text-slate-500">
              Right
            </span>
            <span className="font-mono text-2xl font-bold text-white">
              {puzzle.rightExpression}
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (puzzle.variant === "missing-operator") {
    return (
      <div className="flex flex-1 flex-col">
        <div className="mb-6 flex flex-1 items-center justify-center">
          <p className="font-mono text-3xl font-bold text-white sm:text-4xl">
            {puzzle.left} ? {puzzle.right} = {puzzle.result}
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {(puzzle.operatorChoices ?? ["+", "−", "×", "÷"]).map((op) => (
            <button
              key={op}
              type="button"
              disabled={disabled}
              onClick={() => onAnswer(op)}
              aria-label={`Operator ${op}`}
              className="flex min-h-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 font-mono text-2xl font-semibold text-slate-100 hover:border-cyan-500/50 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 touch-manipulation disabled:opacity-60"
            >
              {op}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (puzzle.variant === "target") {
    return (
      <div className="flex flex-1 flex-col">
        <p className="mb-2 text-center text-sm text-slate-400">
          Pick the expression that equals the target
        </p>
        <p className="mb-4 text-center font-mono text-3xl font-bold text-cyan-300">
          Target: {puzzle.target}
        </p>
        {puzzle.numbers ? (
          <p className="mb-4 text-center text-xs text-slate-500">
            Numbers hint: {puzzle.numbers.join(", ")}
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-3">
          {(puzzle.expressionChoices ?? []).map((expr, index) => (
            <button
              key={`${puzzle.id}-expr-${index}`}
              type="button"
              disabled={disabled}
              onClick={() => onAnswer(expr)}
              className="flex min-h-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 font-mono text-xl font-semibold text-slate-100 hover:border-cyan-500/50 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 touch-manipulation disabled:opacity-60"
            >
              {expr}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {puzzle.variant === "equation-chain" && puzzle.chainLines ? (
        <ul className="mb-4 space-y-1 text-center font-mono text-lg text-slate-200">
          {puzzle.chainLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      {puzzle.variant === "constraint" && puzzle.constraintLines ? (
        <ul className="mb-4 space-y-1 text-center text-slate-300">
          {puzzle.constraintLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      <div className="mb-6 flex flex-1 items-center justify-center">
        <p
          className="font-mono text-4xl font-bold tracking-wide text-white sm:text-5xl"
          aria-label={`Expression: ${puzzle.expression}`}
        >
          {puzzle.expression}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3" role="group" aria-label="Answer choices">
        {(puzzle.choices ?? []).map((choice, index) => (
          <button
            key={`${puzzle.id}-choice-${index}`}
            type="button"
            disabled={disabled}
            onClick={() => onAnswer(choice as number | string)}
            aria-label={`Answer ${choice}`}
            className={[
              "flex min-h-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800",
              "font-mono text-2xl font-semibold text-slate-100",
              "transition-colors hover:border-cyan-500/50 hover:bg-slate-700",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
              "touch-manipulation disabled:opacity-60",
            ].join(" ")}
          >
            {choice}
          </button>
        ))}
      </div>
    </div>
  );
}
