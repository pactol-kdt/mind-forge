"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect, type ReactNode } from "react";
import { useSyncStore } from "@/stores/syncStore";

function SyncBootstrap({ children }: { children: ReactNode }) {
  const init = useSyncStore((s) => s.init);

  useEffect(() => {
    void init();

    const onOnline = () => {
      const state = useSyncStore.getState();
      if (state.account.status === "authenticated" && state.syncStatus !== "synced") {
        void state.syncNow();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        const state = useSyncStore.getState();
        if (
          state.account.status === "authenticated" &&
          state.syncStatus === "pending"
        ) {
          void state.syncNow();
        }
      }
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);

    // Multi-tab: refresh on storage events from other tabs
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("mindforge:data")) {
        window.dispatchEvent(new Event("mindforge:data"));
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("storage", onStorage);
    };
  }, [init]);

  return <>{children}</>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SyncBootstrap>{children}</SyncBootstrap>
    </SessionProvider>
  );
}
