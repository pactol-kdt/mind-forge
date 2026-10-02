"use client";

import { motion, useReducedMotion } from "framer-motion";

interface LivesProps {
  lives: number;
  max?: number;
}

export function Lives({ lives, max = 3 }: LivesProps) {
  const reduce = useReducedMotion();

  return (
    <div className="flex items-center gap-1.5" aria-label={`${lives} lives remaining`}>
      {Array.from({ length: max }, (_, i) => {
        const alive = i < lives;
        return (
          <motion.span
            key={i}
            aria-hidden
            animate={
              reduce
                ? undefined
                : alive
                  ? { scale: 1, opacity: 1 }
                  : { scale: 0.7, opacity: 0.25 }
            }
            className={[
              "inline-flex h-7 w-7 items-center justify-center text-lg",
              alive ? "text-rose-400" : "text-slate-600",
            ].join(" ")}
          >
            ♥
          </motion.span>
        );
      })}
    </div>
  );
}
