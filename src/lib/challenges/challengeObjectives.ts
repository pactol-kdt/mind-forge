import type { ChallengeObjective } from "@/types/run";

export interface ObjectiveProgressInput {
  floorReached: number;
  score: number;
  accuracy: number;
  bossesDefeated: number;
  elitesCleared: number;
}

export function evaluateObjectives(
  objectives: ChallengeObjective[] | undefined,
  input: ObjectiveProgressInput
): { allComplete: boolean; items: Array<{ label: string; current: number; target: number; done: boolean }> } {
  if (!objectives || objectives.length === 0) {
    return { allComplete: true, items: [] };
  }

  const items = objectives.map((o) => {
    switch (o.type) {
      case "reach-floor":
        return {
          label: `Reach Floor ${o.value}`,
          current: input.floorReached,
          target: o.value,
          done: input.floorReached >= o.value,
        };
      case "score":
        return {
          label: `Score ${o.value.toLocaleString()}`,
          current: input.score,
          target: o.value,
          done: input.score >= o.value,
        };
      case "accuracy":
        return {
          label: `Accuracy ${Math.round(o.value * 100)}%`,
          current: Math.round(input.accuracy * 100),
          target: Math.round(o.value * 100),
          done: input.accuracy >= o.value,
        };
      case "bosses-defeated":
        return {
          label: `Defeat ${o.value} boss${o.value === 1 ? "" : "es"}`,
          current: input.bossesDefeated,
          target: o.value,
          done: input.bossesDefeated >= o.value,
        };
      case "elite-cleared":
        return {
          label: `Clear ${o.value} elite floors`,
          current: input.elitesCleared,
          target: o.value,
          done: input.elitesCleared >= o.value,
        };
    }
  });

  return { allComplete: items.every((i) => i.done), items };
}
