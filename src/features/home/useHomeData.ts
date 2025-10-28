import { useEffect, useMemo, useRef, useState } from "react";
import { getUserAestheticProfile } from "@/services/gateways/quizGateway";
import {
  getSession,
  fetchActiveQuests,
  fetchXpSnapshot,
  type ActiveQuestsResponse,
  type XpSnapshot,
} from "@/services/gateways";
import { getRecentTasteSummary } from "@/services/recentTasteSummaryService";
import { extractTopArchetypesFromScores } from "@/utils/archetypeColorBlend";
import { getTimeUntilMidnight, getTimeUntilMonday } from "@/utils/questTimers";
import { getXpForNextLevel } from "@/utils/xpLevel";
import { log } from "@/lib/log";
import {
  EMPTY_HOME_QUESTS,
  toUiProfile,
  toUiQuests,
  toUiTaste,
  type HomeQuestSet,
} from "./homeSelectors";

type HomeData = {
  profile: ReturnType<typeof toUiProfile>;
  archetypeData: Record<string, unknown>[];
  tasteSummary: ReturnType<typeof toUiTaste>;
  summaryLoading: boolean;
  quests: HomeQuestSet;
  userXP: number;
  userLevel: number;
  xpForNextLevel: number;
  timers: {
    daily: string;
    weekly: string;
  };
};

type HomeDataState =
  | { status: "loading" }
  | { status: "error"; error: unknown }
  | { status: "ready"; value: HomeData };

export function useHomeData(): HomeDataState {
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileRaw, setProfileRaw] = useState<unknown>(null);
  const [archetypeData, setArchetypeData] = useState<Record<string, unknown>[]>([]);
  const [tasteSummaryRaw, setTasteSummaryRaw] = useState<unknown>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [quests, setQuests] = useState<HomeQuestSet>(EMPTY_HOME_QUESTS);
  const [userXP, setUserXP] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [xpForNextLevelState, setXpForNextLevelState] = useState(100);
  const [timers, setTimers] = useState({ daily: "", weekly: "" });
  const [error, setError] = useState<unknown>(null);
  const timersInitialized = useRef(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoadingProfile(true);
        const session = await getSession();

        if (!session) {
          throw new Error("No session");
        }

        const profile = await getUserAestheticProfile(session.user.id);
        if (!alive) return;

        setProfileRaw(profile);

        if (profile?.archetype_scores) {
          const sorted = extractTopArchetypesFromScores(profile.archetype_scores);
          setArchetypeData(sorted);
        } else {
          setArchetypeData([]);
        }
      } catch (err) {
        log.error("[home] Error fetching archetypes", err);
        if (alive) {
          setError((prev: unknown) => (prev == null ? err : prev));
          setArchetypeData([]);
        }
      } finally {
        if (alive) {
          setLoadingProfile(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    if (!archetypeData.length) {
      setTasteSummaryRaw(null);
      setSummaryLoading(false);
      return () => {
        alive = false;
      };
    }

    (async () => {
      try {
        setSummaryLoading(true);
        setTasteSummaryRaw(null);

        const session = await getSession();
        if (!session) {
          return;
        }

        const summary = await getRecentTasteSummary({
          userId: session.user.id,
          archetypes: archetypeData,
        });

        if (alive) {
          setTasteSummaryRaw(summary);
        }
      } catch (err) {
        log.error("[home] Error building taste summary", err);
        if (alive) {
          setError((prev: unknown) => (prev == null ? err : prev));
          setTasteSummaryRaw(null);
        }
      } finally {
        if (alive) {
          setSummaryLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [archetypeData]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const session = await getSession();

        if (!session?.user) {
          throw new Error("No session");
        }

        const [{ daily, weekly }, xpSnapshot]: [ActiveQuestsResponse, XpSnapshot] =
          await Promise.all([
            fetchActiveQuests({ userId: session.user.id }),
            fetchXpSnapshot({ userId: session.user.id }),
          ]);

        if (!alive) return;

        setQuests(toUiQuests({ daily, weekly }));

        const xpValue = xpSnapshot?.xp ?? 0;
        const levelValue = xpSnapshot?.level ?? 1;

        setUserXP(xpValue);
        setUserLevel(levelValue);
        setXpForNextLevelState(getXpForNextLevel(levelValue));
      } catch (err) {
        log.error("[home] Error loading quests", err);
        if (alive) {
          setError((prev: unknown) => (prev == null ? err : prev));
          setQuests(EMPTY_HOME_QUESTS);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (timersInitialized.current) {
      return;
    }
    timersInitialized.current = true;

    const updateTimers = () => {
      const dailyTimer = getTimeUntilMidnight();
      const weeklyTimer = getTimeUntilMonday();
      setTimers({
        daily: dailyTimer.formatted,
        weekly: weeklyTimer.formatted,
      });
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => {
      clearInterval(interval);
      timersInitialized.current = false;
    };
  }, []);

  return useMemo<HomeDataState>(() => {
    if (loadingProfile) {
      return { status: "loading" };
    }

    if (error && !archetypeData.length) {
      return { status: "error", error };
    }

    return {
      status: "ready",
      value: {
        profile: toUiProfile(profileRaw),
        archetypeData,
        tasteSummary: toUiTaste(tasteSummaryRaw),
        summaryLoading,
        quests,
        userXP,
        userLevel,
        xpForNextLevel: xpForNextLevelState,
        timers,
      },
    };
  }, [
    archetypeData,
    error,
    loadingProfile,
    profileRaw,
    quests,
    summaryLoading,
    tasteSummaryRaw,
    timers,
    userLevel,
    userXP,
    xpForNextLevelState,
  ]);
}
