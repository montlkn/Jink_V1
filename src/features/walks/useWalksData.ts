import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { log } from "@/lib/log";

import {
  fetchWalkDetail as fetchWalkGeometry,
  fetchWalkSummaries,
  getSession,
} from "@/services/gateways";
import {
  SHOULD_USE_DEMO_WALKS,
  getDemoWalkGeometry,
  getDemoWalkSummaries,
} from "@/lib/walks/demoData";
import { toWalkDetail, toWalkSummaryList } from "./selectors";
import type { WalkDetail, WalkSummaryItem } from "./selectors";
import type { WalkGeometry, WalkSummary } from "@/types/walks";

type RefreshFn = (options?: { force?: boolean }) => Promise<WalksReadyValue>;
type SelectFn = (walkId: string) => Promise<void>;

type LoadState =
  | { status: "loading" }
  | { status: "error"; error: unknown }
  | { status: "ready"; value: WalksReadyValue };

export type WalksReadyValue = {
  userId: string | null;
  summaries: WalkSummaryItem[];
  selectedWalk: WalkDetail | null;
  selectedWalkId: string | null;
  fetchedAt: number;
  isSelecting: boolean;
};

export type WalksDataState =
  | { status: "loading"; refresh: RefreshFn; select: SelectFn }
  | { status: "error"; error: unknown; refresh: RefreshFn; select: SelectFn }
  | { status: "ready"; value: WalksReadyValue; refresh: RefreshFn; select: SelectFn };

type LoadOptions = {
  walkId?: string | null;
  force?: boolean;
};

type HydrateOptions = {
  forceRefresh?: boolean;
};

type WalkHistoryDataset = {
  summaries: WalkSummary[];
  selectedWalk: WalkGeometry | null;
};

const summariesCache = new Map<string, WalkSummary[]>();
const geometryCache = new Map<string, WalkGeometry>();

const fetchSummariesWithCache = async (
  userId: string | null,
  options?: HydrateOptions
): Promise<WalkSummary[]> => {
  if (!userId) {
    return getDemoWalkSummaries();
  }

  if (!options?.forceRefresh && summariesCache.has(userId)) {
    return summariesCache.get(userId) as WalkSummary[];
  }

  if (SHOULD_USE_DEMO_WALKS) {
    const fallback = getDemoWalkSummaries();
    summariesCache.set(userId, fallback);
    return fallback;
  }

  try {
    const summaries = await fetchWalkSummaries({
      userId,
      platform: Platform.OS,
    });

    const normalized = Array.isArray(summaries) ? summaries.filter(Boolean) : [];

    if (normalized.length > 0) {
      summariesCache.set(userId, normalized);
      return normalized;
    }

    log.warn("[walks] No walk summaries returned; using demo data.");
  } catch (error) {
    log.warn("[walks] Failed to load walk summaries", (error as Error)?.message);
  }

  const fallback = getDemoWalkSummaries();
  summariesCache.set(userId, fallback);
  return fallback;
};

const fetchGeometryWithCache = async (
  walkId: string,
  options?: HydrateOptions
): Promise<WalkGeometry> => {
  if (!walkId) {
    throw new Error("walkId is required");
  }

  if (!options?.forceRefresh && geometryCache.has(walkId)) {
    return geometryCache.get(walkId) as WalkGeometry;
  }

  if (SHOULD_USE_DEMO_WALKS) {
    const geometry = getDemoWalkGeometry(walkId);
    geometryCache.set(walkId, geometry);
    return geometry;
  }

  try {
    const geometry = await fetchWalkGeometry({
      walkId,
      platform: Platform.OS,
      tolerance: 0.00005,
    });
    geometryCache.set(walkId, geometry);
    return geometry;
  } catch (error) {
    log.warn("[walks] Failed to load walk geometry", (error as Error)?.message);
    const geometry = getDemoWalkGeometry(walkId);
    geometryCache.set(walkId, geometry);
    return geometry;
  }
};

const hydrateWalkHistoryDataset = async (
  userId: string | null,
  walkId?: string | null,
  options?: HydrateOptions
): Promise<WalkHistoryDataset> => {
  const summaries = await fetchSummariesWithCache(userId, options);
  const targetWalkId = walkId ?? summaries[0]?.id ?? null;
  const selectedWalk = targetWalkId
    ? await fetchGeometryWithCache(targetWalkId, options)
    : null;

  return {
    summaries,
    selectedWalk,
  };
};

export function useWalksData(): WalksDataState {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const isMountedRef = useRef(true);
  const selectedWalkIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const resolveUserId = useCallback(async (): Promise<string | null> => {
    const session = await getSession();
    return session?.user?.id ?? null;
  }, []);

  const loadWalkData = useCallback(
    async (options?: LoadOptions): Promise<WalksReadyValue> => {
      const userId = await resolveUserId();

      const requestedWalkId = options?.walkId ?? selectedWalkIdRef.current ?? null;

      const dataset = await hydrateWalkHistoryDataset(userId, requestedWalkId, {
        forceRefresh: options?.force,
      });

      const summaries = toWalkSummaryList(dataset.summaries);

      const resolvedWalkId =
        options?.walkId ??
        dataset.selectedWalk?.walkId ??
        selectedWalkIdRef.current ??
        summaries[0]?.id ??
        null;

      let selectedWalk = dataset.selectedWalk;

      if (!selectedWalk && resolvedWalkId) {
        selectedWalk = await fetchGeometryWithCache(resolvedWalkId, {
          forceRefresh: options?.force,
        });
      }

      const normalizedSelected = toWalkDetail(selectedWalk);

      selectedWalkIdRef.current = normalizedSelected?.walkId ?? resolvedWalkId ?? null;

      return {
        userId,
        summaries,
        selectedWalk: normalizedSelected,
        selectedWalkId: selectedWalkIdRef.current,
        fetchedAt: Date.now(),
        isSelecting: false,
      };
    },
    [resolveUserId]
  );

  const runInitialLoad = useCallback(() => {
    let cancelled = false;
    setState({ status: "loading" });

    loadWalkData()
      .then((value) => {
        if (cancelled || !isMountedRef.current) {
          return;
        }
        setState({ status: "ready", value });
      })
      .catch((error) => {
        log.error("[walks] Failed to load walks data", error);
        if (cancelled || !isMountedRef.current) {
          return;
        }
        setState({ status: "error", error });
      });

    return () => {
      cancelled = true;
    };
  }, [loadWalkData]);

  useEffect(() => runInitialLoad(), [runInitialLoad]);

  const refresh = useCallback<RefreshFn>(
    async (options) => {
      setState({ status: "loading" });
      try {
        const value = await loadWalkData({ force: options?.force ?? true });
        if (isMountedRef.current) {
          setState({ status: "ready", value });
        }
        return value;
      } catch (error) {
        if (isMountedRef.current) {
          setState({ status: "error", error });
        }
        throw error;
      }
    },
    [loadWalkData]
  );

  const select = useCallback<SelectFn>(
    async (walkId) => {
      selectedWalkIdRef.current = walkId;

      setState((prev) => {
        if (prev.status !== "ready") {
          return prev;
        }
        return {
          status: "ready",
          value: {
            ...prev.value,
            selectedWalkId: walkId,
            isSelecting: true,
          },
        };
      });

      try {
        const value = await loadWalkData({ walkId });
        if (isMountedRef.current) {
          setState({ status: "ready", value });
        }
      } catch (error) {
        log.error("[walks] Failed to select walk", error);
        if (isMountedRef.current) {
          setState({ status: "error", error });
        }
        throw error;
      }
    },
    [loadWalkData]
  );

  return useMemo<WalksDataState>(() => {
    if (state.status === "ready") {
      return { status: "ready", value: state.value, refresh, select };
    }

    if (state.status === "error") {
      return { status: "error", error: state.error, refresh, select };
    }

    return { status: "loading", refresh, select };
  }, [state, refresh, select]);
}
