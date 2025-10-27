import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchActiveQuests,
  fetchXpSummary,
  supabaseGateway,
} from "@/services/gateways";
import { QuestCollection, XpSnapshot, toQuestCollection, toXpSnapshot } from "./selectors";

type RefreshFn = () => Promise<QuestsReadyValue>;

type LoadState =
  | { status: "loading" }
  | { status: "error"; error: unknown }
  | { status: "ready"; value: QuestsReadyValue };

export type QuestsReadyValue = {
  userId: string;
  quests: QuestCollection;
  xp: XpSnapshot;
  fetchedAt: number;
};

export type QuestsDataState =
  | { status: "loading"; refresh: RefreshFn }
  | { status: "error"; error: unknown; refresh: RefreshFn }
  | { status: "ready"; value: QuestsReadyValue; refresh: RefreshFn };

export function useQuestsData(explicitUserId?: string): QuestsDataState {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const resolveUserId = useCallback(async (): Promise<string> => {
    if (explicitUserId) {
      return explicitUserId;
    }

    const { data, error } = await supabaseGateway.auth.getSession();
    if (error) {
      throw error;
    }

    const sessionUserId = data?.session?.user?.id;
    if (!sessionUserId) {
      throw new Error("No active session for quest data.");
    }

    return sessionUserId;
  }, [explicitUserId]);

  const loadQuestData = useCallback(async (): Promise<QuestsReadyValue> => {
    const userId = await resolveUserId();
    const [questsRaw, xpRaw] = await Promise.all([
      fetchActiveQuests(userId),
      fetchXpSummary(userId),
    ]);

    return {
      userId,
      quests: toQuestCollection(questsRaw),
      xp: toXpSnapshot(xpRaw),
      fetchedAt: Date.now(),
    };
  }, [resolveUserId]);

  const runInitialLoad = useCallback(() => {
    let cancelled = false;
    setState({ status: "loading" });

    loadQuestData()
      .then((value) => {
        if (cancelled || !isMountedRef.current) {
          return;
        }
        setState({ status: "ready", value });
      })
      .catch((error) => {
        console.error("Failed to load quests data", error);
        if (cancelled || !isMountedRef.current) {
          return;
        }
        setState({ status: "error", error });
      });

    return () => {
      cancelled = true;
    };
  }, [loadQuestData]);

  useEffect(() => runInitialLoad(), [runInitialLoad]);

  const refresh = useCallback<RefreshFn>(async () => {
    setState({ status: "loading" });
    try {
      const value = await loadQuestData();
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
  }, [loadQuestData]);

  return useMemo<QuestsDataState>(() => {
    if (state.status === "ready") {
      return { status: "ready", value: state.value, refresh };
    }

    if (state.status === "error") {
      return { status: "error", error: state.error, refresh };
    }

    return { status: "loading", refresh };
  }, [state, refresh]);
}
