"use client";

import dynamic from "next/dynamic";
import { ScreenLoading } from "@/components/layout/ScreenLoading";

const PlayScreen = dynamic(
  () =>
    import("@/components/screens/PlayScreen").then((m) => m.PlayScreen),
  {
    ssr: false,
    loading: () => <ScreenLoading label="Entering the forge…" />,
  }
);

export function PlayPageClient() {
  return <PlayScreen />;
}
