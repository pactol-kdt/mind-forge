"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { FeedbackState } from "@/types/game";

interface FeedbackOverlayProps {
  feedback: FeedbackState;
}

export function FeedbackOverlay({ feedback }: FeedbackOverlayProps) {
  const reduce = useReducedMotion();
  const {
    correct,
    pointsEarned,
    correctAnswerDisplay,
    streak,
    secondChanceSaved,
  } = feedback;

  const saved = Boolean(secondChanceSaved);
  const lockedIn =
    correct &&
    !saved &&
    pointsEarned === 0 &&
    feedback.bossAdvance === "continue";

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={reduce ? false : { opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduce ? undefined : { opacity: 0, scale: 0.96 }}
      className={[
        "absolute inset-0 z-20 flex flex-col items-center justify-center rounded-3xl p-6 text-center",
        correct && !saved
          ? "bg-emerald-950/90 ring-1 ring-emerald-400/40"
          : saved
            ? "bg-amber-950/90 ring-1 ring-amber-400/40"
            : "bg-rose-950/90 ring-1 ring-rose-400/40",
      ].join(" ")}
    >
      <motion.div
        initial={reduce ? false : correct ? { scale: 0.5 } : { x: -8 }}
        animate={
          reduce
            ? undefined
            : correct && !saved
              ? { scale: [0.5, 1.15, 1] }
              : { x: [0, -8, 8, -6, 6, 0] }
        }
        transition={{ duration: 0.4 }}
        className={[
          "mb-3 flex h-16 w-16 items-center justify-center rounded-full text-3xl font-bold",
          correct && !saved
            ? "bg-emerald-500/20 text-emerald-300"
            : saved
              ? "bg-amber-500/20 text-amber-300"
              : "bg-rose-500/20 text-rose-300",
        ].join(" ")}
        aria-hidden
      >
        {correct && !saved ? "✓" : saved ? "◈" : "✕"}
      </motion.div>

      <p
        className={[
          "text-2xl font-bold tracking-wide",
          correct && !saved
            ? "text-emerald-200"
            : saved
              ? "text-amber-200"
              : "text-rose-200",
        ].join(" ")}
      >
        {saved
          ? "Second Chance"
          : lockedIn
            ? "Locked In"
            : correct
              ? "Correct"
              : "Incorrect"}
      </p>

      {correct && !saved && !lockedIn ? (
        <>
          <p className="mt-2 font-mono text-3xl font-semibold text-cyan-300">
            +{pointsEarned}
          </p>
          {streak >= 2 ? (
            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
              {streak}x Streak
            </p>
          ) : null}
        </>
      ) : lockedIn ? (
        <p className="mt-3 text-sm text-slate-300">Hold that sequence…</p>
      ) : saved ? (
        <>
          <p className="mt-3 text-sm text-amber-100/90">Life protected — charge used</p>
          {feedback.bossAdvance === "retry" ? (
            <p className="mt-2 text-sm font-medium text-amber-200/90">
              Retrying this boss…
            </p>
          ) : null}
        </>
      ) : (
        <>
          {correctAnswerDisplay ? (
            <p className="mt-3 max-w-[16rem] text-sm text-slate-300">
              Answer:{" "}
              <span className="font-medium text-white">{correctAnswerDisplay}</span>
            </p>
          ) : null}
          <p className="mt-3 text-sm text-rose-300/90">−1 life</p>
          {feedback.bossAdvance === "retry" ? (
            <p className="mt-2 text-sm font-medium text-amber-200/90">
              Retrying this boss…
            </p>
          ) : null}
        </>
      )}
    </motion.div>
  );
}
