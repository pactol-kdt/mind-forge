/**
 * Lightweight multi-stage puzzle helpers for bosses / interference / elites.
 * Shared state is plain data passed between stages.
 */

export type PuzzleStageType =
  | "instruction"
  | "memorize"
  | "observe"
  | "answer"
  | "transition"
  | "secondary-puzzle"
  | "recall";

export interface PuzzleStage {
  id: string;
  type: PuzzleStageType;
  durationMs?: number;
  prompt?: string;
  payload?: unknown;
}

export interface MultiStageState {
  stages: PuzzleStage[];
  currentStage: number;
  sharedState: Record<string, unknown>;
}

export function createMultiStage(
  stages: PuzzleStage[],
  sharedState: Record<string, unknown> = {}
): MultiStageState {
  return { stages, currentStage: 0, sharedState };
}

export function currentStage(state: MultiStageState): PuzzleStage | undefined {
  return state.stages[state.currentStage];
}

export function advanceStage(state: MultiStageState): MultiStageState {
  return {
    ...state,
    currentStage: Math.min(state.currentStage + 1, state.stages.length),
  };
}

export function isComplete(state: MultiStageState): boolean {
  return state.currentStage >= state.stages.length;
}

export function setShared<T>(
  state: MultiStageState,
  key: string,
  value: T
): MultiStageState {
  return {
    ...state,
    sharedState: { ...state.sharedState, [key]: value },
  };
}
