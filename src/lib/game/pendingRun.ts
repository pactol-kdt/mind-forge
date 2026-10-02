import type { RunConfig } from "@/types/run";

let pending: Partial<RunConfig> | null = null;

export function setPendingRunConfig(config: Partial<RunConfig>): void {
  pending = config;
}

export function takePendingRunConfig(): Partial<RunConfig> | undefined {
  const c = pending ?? undefined;
  pending = null;
  return c;
}
