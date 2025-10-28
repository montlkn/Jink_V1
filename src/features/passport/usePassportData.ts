import { useCallback, useEffect, useMemo, useState } from "react";
import type { PassportUiData } from "./selectors";
import { toPassportUi } from "./selectors";
import { fetchPassport, getSession } from "@/services/gateways";
import { log } from "@/lib/log";

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

      const snapshot = await fetchPassport(session.user.id);
      const uiValue = toPassportUi({
        user: {
          id: session.user.id,
          created_at: session.user.created_at,
        },
        snapshot,
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
