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
  /** Selected upgrade waiting for confirm (name shown in header) */
  pendingName?: string | null;
  /** True after confirm while floor advances */
  committing?: boolean;
  owned?: ActiveUpgrade[];
  rerolls?: number;
  onReroll?: () => void;
  /** First tap — select candidate */
  onPick: (id: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function UpgradeSelect({
  choices,
  announcement,
  pendingName,
  committing,
  owned = [],
  rerolls = 0,
  onReroll,
  onPick,
  onConfirm,
  onCancel,
}: UpgradeSelectProps) {
  const reduce = useReducedMotion();
  const locked = Boolean(pendingName) || Boolean(committing);

  return (
    <div className="flex flex-1 flex-col gap-4 pt-2">
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/90">
          Roguelike Upgrade
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white">
          {committing
            ? pendingName
              ? `${pendingName}`
              : "Continuing…"
            : pendingName
              ? `Confirm ${pendingName}?`
              : "Choose Your Upgrade"}
        </h2>
        {announcement && !pendingName ? (
          <p className="mt-1 text-sm text-slate-400">{announcement}</p>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {choices.map((upgrade, i) => {
          const synergy = getSynergyHint(owned, upgrade);
          const selected = pendingName === upgrade.name;
          return (
            <motion.button
              key={upgrade.id}
              type="button"
              disabled={locked && !selected}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => {
                if (committing) return;
                if (selected) return;
                onPick(upgrade.id);
              }}
              className={[
                "rounded-2xl border bg-slate-900/90 p-4 text-left transition-colors",
                "hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
                "touch-manipulation min-h-[4.5rem]",
                RARITY_COLORS[upgrade.rarity],
                selected ? "ring-2 ring-cyan-400" : "",
                locked && !selected ? "opacity-50" : "",
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

      {committing ? (
        <Button fullWidth disabled variant="secondary">
          Continuing…
        </Button>
      ) : pendingName ? (
        <div className="space-y-2 pb-2">
          <Button fullWidth size="lg" onClick={onConfirm}>
            Confirm
          </Button>
          <Button fullWidth size="md" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      ) : (
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
      )}
    </div>
  );
}
