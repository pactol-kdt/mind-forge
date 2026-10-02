"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

interface ScoreProps {
  score: number;
  delta?: number;
}

export function Score({ score, delta }: ScoreProps) {
  const reduce = useReducedMotion();

  return (
    <div className="relative text-right">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
        Score
      </p>
      <p className="font-mono text-lg font-semibold tabular-nums text-slate-100 sm:text-xl">
        {score.toLocaleString("en-US")}
      </p>
      <AnimatePresence>
        {delta && delta > 0 ? (
          <motion.span
            key={delta}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute -bottom-4 right-0 text-xs font-semibold text-cyan-300"
          >
            +{delta}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
