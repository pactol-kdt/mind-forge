"use client";

import { motion, useReducedMotion } from "framer-motion";

interface StreakProps {
  streak: number;
}

export function Streak({ streak }: StreakProps) {
  const reduce = useReducedMotion();
  const meaningful = streak >= 2;

  return (
    <div className="text-center">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
        Streak
      </p>
      <motion.p
        key={streak}
        initial={reduce || !meaningful ? false : { scale: 0.85 }}
        animate={{ scale: 1 }}
        className={[
          "font-mono text-lg font-semibold tabular-nums sm:text-xl",
          meaningful ? "text-amber-300" : "text-slate-400",
        ].join(" ")}
      >
        {streak > 0 ? `${streak}x` : "—"}
      </motion.p>
    </div>
  );
}
