"use client";

import { MobileContainer } from "@/components/layout/MobileContainer";

export function ScreenLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <MobileContainer className="items-center justify-center">
      <p className="text-sm text-slate-400">{label}</p>
    </MobileContainer>
  );
}
