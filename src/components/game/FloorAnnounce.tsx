"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";

interface FloorAnnounceProps {
  title: string;
  message: string;
  onContinue: () => void;
}

export function FloorAnnounce({
  title,
  message,
  onContinue,
}: FloorAnnounceProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-1 flex-col items-center justify-center gap-6 text-center"
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/90">
          {title}
        </p>
        <p className="mt-3 max-w-xs text-lg text-slate-200">{message}</p>
      </div>
      <Button size="xl" onClick={onContinue}>
        Continue
      </Button>
    </motion.div>
  );
}
