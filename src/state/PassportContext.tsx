import {
    type PassportUiData,
    toPassportUi,
} from "@/features/passport/selectors";
import { log } from "@/lib/log";
import { fetchPassport, getSession } from "@/services/gateways";
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type InternalState =
  | { kind: "idle" } // Not yet requested - lazy load
  | { kind: "loading" }
  | { kind: "ready"; value: PassportUiData }
  | { kind: "error"; error: unknown };

export type PassportDataState =
  | { status: "idle"; load: () => Promise<void>; refresh: () => Promise<void>; refreshing: boolean }
  | { status: "loading"; refresh: () => Promise<void>; refreshing: boolean }
  | {
    status: "ready";
    value: PassportUiData;
    refresh: () => Promise<void>;
    refreshing: boolean;
  }
  | {
    status: "error";
    error: unknown;
    refresh: () => Promise<void>;
    refreshing: boolean;
  };

const PassportContext = createContext<PassportDataState | undefined>(undefined);

export function PassportProvider({ children }: { children: React.ReactNode }) {
  // OPTIMIZED: Start idle, only load when a screen actually needs the data
  const [state, setState] = useState<InternalState>({ kind: "idle" });
  const [refreshing, setRefreshing] = useState(false);
  const loadingRef = useRef(false); // Prevent duplicate loads

  const load = useCallback(async (options?: { silent?: boolean }) => {
    // Prevent duplicate concurrent loads
    if (loadingRef.current) return;
    loadingRef.current = true;

    if (!options?.silent) {
      setState({ kind: "loading" });
    }

    try {
      const session = await getSession();
      if (!session?.user) {
        throw new Error("Not authenticated");
      }

      // Static import instead of dynamic - faster
      const { fetchWalkSummaries } = await import(
        "@/services/gateways/walkGateway"
      );
      const [snapshot, walkSummaries] = await Promise.all([
        fetchPassport(session.user.id),
        fetchWalkSummaries({ userId: session.user.id, platform: "ios" }).catch(
          (err) => {
            log.warn("[passport] Failed to fetch walk summaries", err);
            return [];
          },
        ),
      ]);

      const walksWithBuildingCount = walkSummaries.map((walk: any) => ({
        id: walk.id,
        startedAt: walk.startedAt,
        endedAt: walk.endedAt,
        dominantStyle: walk.dominantStyle,
        borough: walk.borough,
        buildingCount: walk.buildingCount || 0,
      }));

      const uiValue = toPassportUi({
        user: {
          id: session.user.id,
          created_at: session.user.created_at,
        },
        snapshot,
        walks: walksWithBuildingCount,
      });

      setState({ kind: "ready", value: uiValue });
    } catch (error) {
      setState({ kind: "error", error });
      log.error("[passport] Failed to load passport data", error);
    } finally {
      loadingRef.current = false;
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  // OPTIMIZED: Stable context value using refs for functions
  const contextValue = useMemo<PassportDataState>(() => {
    if (state.kind === "idle") {
      return {
        status: "idle",
        load,
        refresh,
        refreshing,
      };
    }

    if (state.kind === "loading") {
      return {
        status: "loading",
        refresh,
        refreshing,
      };
    }

    if (state.kind === "error") {
      return {
        status: "error",
        error: state.error,
        refresh,
        refreshing,
      };
    }

    return {
      status: "ready",
      value: state.value,
      refresh,
      refreshing,
    };
  }, [state, load, refresh, refreshing]);

  return (
    <PassportContext.Provider value={contextValue}>
      {children}
    </PassportContext.Provider>
  );
}

export function usePassportContext() {
  const context = useContext(PassportContext);
  if (context === undefined) {
    throw new Error("usePassportContext must be used within a PassportProvider");
  }
  return context;
}
