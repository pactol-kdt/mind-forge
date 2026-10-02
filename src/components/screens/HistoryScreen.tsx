"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  getGameDataSnapshot,
  getServerGameDataSnapshot,
  subscribeGameData,
} from "@/lib/storage/gameStorage";
import { useHasMounted } from "@/hooks/useHasMounted";

export function HistoryScreen() {
  const router = useRouter();
  const mounted = useHasMounted();
  const data = useSyncExternalStore(
    subscribeGameData,
    getGameDataSnapshot,
    getServerGameDataSnapshot
  );
  const live = mounted ? data : getServerGameDataSnapshot();

  return (
    <MobileContainer className="gap-4">
      <div className="pt-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
          ← Home
        </Button>
        <h1 className="mt-3 text-2xl font-bold text-white">Recent Runs</h1>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 pb-4">
        {live.runHistory.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-400">
              No runs recorded yet. Start a run to build history.
            </p>
          </Card>
        ) : (
          live.runHistory.map((entry, i) => (
            <Card key={`${entry.timestamp}-${i}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold capitalize text-white">
                    {entry.challengeId ?? entry.mode}
                    {entry.difficultyTier !== "standard"
                      ? ` · ${entry.difficultyTier}`
                      : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Floor {entry.floorReached}
                    {entry.archetype ? ` · ${entry.archetype}` : ""}
                  </p>
                </div>
                <p className="font-mono text-cyan-300">
                  {entry.score.toLocaleString()}
                </p>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Accuracy {Math.round(entry.accuracy * 100)}%
                {entry.seed ? ` · ${entry.seed}` : ""}
              </p>
            </Card>
          ))
        )}
      </div>
    </MobileContainer>
  );
}
