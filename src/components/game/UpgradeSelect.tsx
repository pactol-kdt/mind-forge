"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ActiveUpgrade, GameUpgrade } from "@/types/game";
import {
  getSynergyHint,
  RARITY_COLORS,
  RARITY_LABELS,
} from "@/lib/game/upgrades";
import { Button } from "@/components/ui/Button";

interface UpgradeSelectProps {
  choices: GameUpgrade[];
  announcement?: string | null;
  confirming?: string | null;
  owned?: ActiveUpgrade[];
  rerolls?: number;
  onReroll?: () => void;
  onSelect: (id: string) => void;
}

export function UpgradeSelect({
  choices,
  announcement,
  confirming,
  owned = [],
  rerolls = 0,
  onReroll,
  onSelect,
}: UpgradeSelectProps) {
  const reduce = useReducedMotion();

  return (
    <div className="flex flex-1 flex-col gap-4 pt-2">
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/90">
          Roguelike Upgrade
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white">
          {confirming ? confirming : "Choose Your Upgrade"}
        </h2>
        {announcement && !confirming ? (
          <p className="mt-1 text-sm text-slate-400">{announcement}</p>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {choices.map((upgrade, i) => {
          const synergy = getSynergyHint(owned, upgrade);
          return (
            <motion.button
              key={upgrade.id}
              type="button"
              disabled={Boolean(confirming)}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => onSelect(upgrade.id)}
              className={[
                "rounded-2xl border bg-slate-900/90 p-4 text-left transition-colors",
                "hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
                "touch-manipulation min-h-[4.5rem]",
                RARITY_COLORS[upgrade.rarity],
                confirming === upgrade.name ? "ring-2 ring-cyan-400" : "",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-base font-semibold text-white">
                  {upgrade.name}
                </p>
                <span className="text-[10px] uppercase tracking-wider opacity-80">
                  {RARITY_LABELS[upgrade.rarity]}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-300">{upgrade.description}</p>
              {synergy ? (
                <p className="mt-2 text-[11px] text-cyan-300/90">{synergy}</p>
              ) : null}
            </motion.button>
          );
        })}
      </div>

      {!confirming ? (
        <div className="space-y-2 pb-2">
          {rerolls > 0 && onReroll ? (
            <Button fullWidth size="md" variant="secondary" onClick={onReroll}>
              Reroll ({rerolls} left)
            </Button>
          ) : null}
          <p className="text-center text-xs text-slate-500">
            Choose one — lasts for this run
          </p>
        </div>
      ) : (
        <Button fullWidth disabled variant="secondary">
          Continuing…
        </Button>
      )}
    </div>
  );
}
