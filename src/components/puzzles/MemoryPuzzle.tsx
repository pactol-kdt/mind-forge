"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { MemoryPuzzle, MemorySymbol } from "@/types/puzzles";
import type { PuzzlePhase } from "@/types/game";
import { MEMORY_SYMBOL_GLYPHS } from "@/lib/puzzles/memory";
import { Button } from "@/components/ui/Button";

interface MemoryPuzzleViewProps {
  puzzle: MemoryPuzzle;
  phase: PuzzlePhase;
  onBeginAnswering: () => void;
  onAnswer: (answer: MemorySymbol[] | MemorySymbol | number) => void;
  onDistraction?: (answer: number) => void;
}

export function MemoryPuzzleView({
  puzzle,
  phase,
  onBeginAnswering,
  onAnswer,
  onDistraction,
}: MemoryPuzzleViewProps) {
  const reduce = useReducedMotion();
  const [selection, setSelection] = useState<MemorySymbol[]>([]);

  useEffect(() => {
    if (phase !== "presenting") return;
    const id = window.setTimeout(() => {
      onBeginAnswering();
    }, puzzle.displayDurationMs);
    return () => window.clearTimeout(id);
  }, [phase, puzzle.displayDurationMs, onBeginAnswering]);

  if (phase === "presenting") {
    if (puzzle.variant === "chunk" && puzzle.chunks) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-xs text-slate-500">Memorize the chunks…</p>
          <div className="space-y-3">
            {puzzle.chunks.map((chunk, i) => (
              <div
                key={i}
                className="flex gap-2 rounded-xl bg-slate-800 px-4 py-2 text-2xl text-cyan-200"
              >
                {chunk.join(" ")}
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (puzzle.variant === "ordered-groups" && puzzle.chunks) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-xs text-slate-500">Memorize group order…</p>
          {puzzle.chunks.map((chunk, i) => (
            <div key={i} className="text-center">
              <p className="text-[10px] uppercase text-slate-500">Group {i + 1}</p>
              <p className="text-2xl text-cyan-200">{chunk.join(" ")}</p>
            </div>
          ))}
        </div>
      );
    }
    if (puzzle.variant === "position" && puzzle.positions && puzzle.gridSize) {
      const size = puzzle.gridSize;
      const map = new Map(puzzle.positions.map((p) => [p.index, p.symbol]));
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-xs text-slate-500">Memorize positions…</p>
          <div
            className={`grid gap-2 ${size === 4 ? "grid-cols-4" : "grid-cols-3"}`}
          >
            {Array.from({ length: size * size }, (_, i) => {
              const symbol = map.get(i);
              return (
                <div
                  key={i}
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-2xl text-cyan-200"
                >
                  {symbol ? MEMORY_SYMBOL_GLYPHS[symbol] : ""}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {puzzle.sequence.map((symbol, i) => (
            <motion.span
              key={`${symbol}-${i}`}
              initial={reduce ? false : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-3xl text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.15)] sm:h-16 sm:w-16 sm:text-4xl"
              aria-hidden
            >
              {MEMORY_SYMBOL_GLYPHS[symbol]}
            </motion.span>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          {puzzle.memorizeOnly
            ? "Memorize — hold it through the next challenge"
            : puzzle.variant === "reverse"
              ? "Memorize — you will enter it in reverse"
              : puzzle.variant === "boss"
                ? "Memorize — a distraction comes next"
                : "Memorize…"}
        </p>
      </div>
    );
  }

  if (phase === "distraction" && puzzle.distraction) {
    return (
      <div className="flex flex-1 flex-col">
        <p className="mb-4 text-center text-sm text-amber-200">
          Quick distraction — then recall the sequence
        </p>
        <p className="mb-6 text-center font-mono text-4xl font-bold text-white">
          {puzzle.distraction.expression}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {puzzle.distraction.choices.map((choice, index) => (
            <button
              key={`dist-${index}`}
              type="button"
              onClick={() => onDistraction?.(choice)}
              className="flex min-h-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 font-mono text-2xl font-semibold text-slate-100 hover:border-cyan-500/50 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 touch-manipulation"
            >
              {choice}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (puzzle.variant === "chunk" && puzzle.chunkChoices) {
    return (
      <div className="flex flex-1 flex-col gap-3">
        <p className="text-center text-sm text-slate-400">
          {puzzle.prompt ?? "Which chunk appeared?"}
        </p>
        <div className="grid grid-cols-1 gap-3">
          {puzzle.chunkChoices.map((chunk, i) => (
            <button
              key={i}
              type="button"
              disabled={phase !== "answering"}
              onClick={() => onAnswer(i)}
              className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 text-2xl text-cyan-200 hover:border-cyan-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 touch-manipulation disabled:opacity-50"
            >
              {chunk.join(" ")}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (puzzle.variant === "ordered-groups" && puzzle.chunks) {
    return (
      <div className="flex flex-1 flex-col gap-3">
        <p className="text-center text-sm text-slate-400">
          {puzzle.prompt ?? "Which group?"}
        </p>
        <div className="grid grid-cols-1 gap-3">
          {puzzle.chunks.map((chunk, i) => (
            <button
              key={i}
              type="button"
              disabled={phase !== "answering"}
              onClick={() => onAnswer(i)}
              className="flex min-h-14 flex-col items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 px-3 py-2 hover:border-cyan-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 touch-manipulation disabled:opacity-50"
            >
              <span className="text-[10px] uppercase text-slate-500">
                Group {i + 1}
              </span>
              <span className="text-2xl text-cyan-200">{chunk.join(" ")}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (puzzle.variant === "missing") {
    const idx = puzzle.missingIndex ?? 0;
    return (
      <div className="flex flex-1 flex-col">
        <p className="mb-4 text-center text-sm text-slate-400">
          Which symbol is missing?
        </p>
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {puzzle.sequence.map((symbol, i) => (
            <span
              key={i}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-2xl text-cyan-200"
            >
              {i === idx ? "?" : MEMORY_SYMBOL_GLYPHS[symbol]}
            </span>
          ))}
        </div>
        <div className="mx-auto grid w-full max-w-xs grid-cols-3 gap-3">
          {puzzle.symbolPool.map((symbol) => (
            <button
              key={symbol}
              type="button"
              disabled={phase !== "answering"}
              onClick={() => onAnswer(symbol)}
              aria-label={symbol}
              className="flex h-16 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-3xl text-slate-100 hover:border-cyan-500/50 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 touch-manipulation disabled:opacity-50"
            >
              {MEMORY_SYMBOL_GLYPHS[symbol]}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (puzzle.variant === "position" && puzzle.gridSize) {
    const size = puzzle.gridSize;
    return (
      <div className="flex flex-1 flex-col items-center">
        <p className="mb-4 text-center text-sm text-slate-400">
          Where was{" "}
          <span className="text-cyan-300">
            {puzzle.promptSymbol
              ? MEMORY_SYMBOL_GLYPHS[puzzle.promptSymbol]
              : "?"}
          </span>
          ?
        </p>
        <div
          className={`grid gap-2 ${size === 4 ? "grid-cols-4" : "grid-cols-3"}`}
        >
          {Array.from({ length: size * size }, (_, i) => (
            <button
              key={i}
              type="button"
              disabled={phase !== "answering"}
              onClick={() => onAnswer(i)}
              aria-label={`Position ${i + 1}`}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-500 hover:border-cyan-500/50 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 touch-manipulation disabled:opacity-50"
            >
              ·
            </button>
          ))}
        </div>
      </div>
    );
  }

  // sequence / reverse / boss / interference / transform-recall
  const targetSeq =
    puzzle.variant === "transform-recall" && puzzle.transformedSequence
      ? puzzle.transformedSequence
      : puzzle.sequence;
  const targetLen = targetSeq.length;
  const prompt =
    puzzle.variant === "reverse"
      ? "Enter the sequence in reverse"
      : puzzle.variant === "transform-recall"
        ? puzzle.prompt ?? "Enter the transformed sequence"
        : "Recreate the sequence";

  const pushSymbol = (symbol: MemorySymbol) => {
    if (phase !== "answering") return;
    const next = [...selection, symbol];
    setSelection(next);
    if (next.length >= targetLen) onAnswer(next);
  };

  return (
    <div className="flex flex-1 flex-col">
      <p className="mb-3 text-center text-sm text-slate-400">{prompt}</p>
      <div
        className="mb-5 flex min-h-14 flex-wrap items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 px-3 py-3"
        aria-label="Your answer"
      >
        {Array.from({ length: targetLen }, (_, i) => {
          const symbol = selection[i];
          return (
            <span
              key={i}
              className={[
                "flex h-10 w-10 items-center justify-center rounded-xl text-xl",
                symbol
                  ? "bg-slate-800 text-cyan-200"
                  : "bg-slate-900/80 text-slate-600",
              ].join(" ")}
            >
              {symbol ? MEMORY_SYMBOL_GLYPHS[symbol] : "·"}
            </span>
          );
        })}
      </div>

      <div className="mx-auto grid w-full max-w-xs grid-cols-3 gap-3">
        {puzzle.symbolPool.map((symbol) => (
          <button
            key={symbol}
            type="button"
            onClick={() => pushSymbol(symbol)}
            disabled={phase !== "answering"}
            aria-label={symbol}
            className="flex h-16 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-3xl text-slate-100 hover:border-cyan-500/50 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 touch-manipulation disabled:opacity-50"
          >
            {MEMORY_SYMBOL_GLYPHS[symbol]}
          </button>
        ))}
      </div>

      <div className="mt-auto pt-4">
        <Button
          variant="ghost"
          size="md"
          fullWidth
          onClick={() => setSelection((s) => s.slice(0, -1))}
          disabled={selection.length === 0 || phase !== "answering"}
        >
          Undo
        </Button>
      </div>
    </div>
  );
}
