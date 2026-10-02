"use client";

import dynamic from "next/dynamic";
import { ScreenLoading } from "@/components/layout/ScreenLoading";

const ResultsScreen = dynamic(
  () =>
    import("@/components/screens/ResultsScreen").then((m) => m.ResultsScreen),
  {
    ssr: false,
    loading: () => <ScreenLoading label="Loading results…" />,
  }
);

export function ResultsPageClient() {
  return <ResultsScreen />;
}
