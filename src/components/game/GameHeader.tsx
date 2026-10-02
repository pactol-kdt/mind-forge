"use client";

import { Lives } from "./Lives";
import { Score } from "./Score";
import { Streak } from "./Streak";
import type { FloorType } from "@/types/game";

interface GameHeaderProps {
  floor: number;
  score: number;
  streak: number;
  lives: number;
  maxLives?: number;
  lastPoints?: number;
  floorType?: FloorType;
  upgradeCount?: number;
}

export function GameHeader({
  floor,
  score,
  streak,
  lives,
  maxLives = 3,
  lastPoints,
  floorType = "normal",
  upgradeCount = 0,
}: GameHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
          Floor
        </p>
        <p className="font-mono text-2xl font-bold tabular-nums text-white">
          {floor}
        </p>
        {floorType !== "normal" && floorType !== "upgrade" ? (
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300/90">
            {floorType}
          </p>
        ) : null}
        {upgradeCount > 0 ? (
          <p className="mt-0.5 text-[10px] text-slate-500">
            {upgradeCount} upgrade{upgradeCount === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col items-center gap-2">
        <Lives lives={lives} max={maxLives} />
        <Streak streak={streak} />
      </div>

      <Score score={score} delta={lastPoints} />
    </header>
  );
}
