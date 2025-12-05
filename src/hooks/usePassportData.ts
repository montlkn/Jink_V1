import {
  type PassportUiData,
  toPassportUi,
} from "@/features/passport/selectors";
import { log } from "@/lib/log";
import { fetchPassport, getSession } from "@/services/gateways";
import { useCallback, useEffect, useMemo, useState } from "react";

type InternalState =
  | { kind: "loading" }
  | { kind: "ready"; value: PassportUiData }
  | { kind: "error"; error: unknown };

type PassportDataState =
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

export function usePassportData(): PassportDataState {
  const [state, setState] = useState<InternalState>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setState({ kind: "loading" });
    }

    try {
      const session = await getSession();
      if (!session?.user) {
        throw new Error("Not authenticated");
      }

      // Fetch passport data and walk summaries in parallel
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

      // Get building count from walk context if available
      const walksWithBuildingCount = walkSummaries.map((walk: any) => ({
        id: walk.id,
        startedAt: walk.startedAt,
        endedAt: walk.endedAt,
        dominantStyle: walk.dominantStyle,
        borough: walk.borough,
        buildingCount: walk.buildingCount || 0, // Use buildingCount from walk if available
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
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  return useMemo<PassportDataState>(() => {
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
  }, [state, refresh, refreshing]);
}
