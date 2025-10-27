import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { getUserAestheticProfile } from "@/api/quizApi";
import {
  getActiveDailyQuest,
  getActiveWeeklyQuest,
  getUserXP,
  getXPForNextLevel,
} from "@/services/questService";
import { getRecentTasteSummary } from "@/services/recentTasteSummaryService";
import { extractTopArchetypesFromScores } from "@/utils/archetypeColorBlend";
import { getTimeUntilMidnight, getTimeUntilMonday } from "@/utils/questTimers";
import { toUiProfile, toUiQuests, toUiTaste } from "./homeSelectors";

export type HomeQuestReward = {
  type: string;
  icon: string;
  label: string;
};

export type HomeQuest = {
  type: "daily" | "weekly";
  questType: string | null;
  title: string | null;
  description: string | null;
  xpReward: number;
  additionalRewards: HomeQuestReward[];
  progress: number;
  total: number | null;
  completed: boolean;
};

export type HomeData = {
  profile: ReturnType<typeof toUiProfile>;
  archetypeData: Array<Record<string, unknown>>;
  tasteSummary: ReturnType<typeof toUiTaste>;
  summaryLoading: boolean;
  quests: ReturnType<typeof toUiQuests> & {
    daily: HomeQuest | null;
    weekly: HomeQuest | null;
  };
  userXP: number;
  userLevel: number;
  xpForNextLevel: number;
  timers: {
    daily: string;
    weekly: string;
  };
};

export type LoadingState = { status: "loading" };
export type ErrorState = { status: "error"; error: unknown };
export type ReadyState<T> = { status: "ready"; value: T };
export type HomeDataState = LoadingState | ErrorState | ReadyState<HomeData>;

export function useHomeData(): HomeDataState {
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileRaw, setProfileRaw] = useState<any>(null);
  const [archetypeData, setArchetypeData] = useState<Array<Record<string, unknown>>>([]);
  const [tasteSummaryRaw, setTasteSummaryRaw] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [dailyQuest, setDailyQuest] = useState<HomeQuest | null>(null);
  const [weeklyQuest, setWeeklyQuest] = useState<HomeQuest | null>(null);
  const [userXP, setUserXP] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [xpForNextLevelState, setXpForNextLevelState] = useState(100);
  const [timers, setTimers] = useState<{ daily: string; weekly: string }>({
    daily: "",
    weekly: "",
  });
  const [error, setError] = useState<unknown>(null);
  const timersInitialized = useRef(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchProfile() {
      try {
        setLoadingProfile(true);
        const { data } = await supabase.auth.getSession();
        const session = data?.session;
        if (!session) {
          throw new Error("No session");
        }
        const profile = await getUserAestheticProfile(session.user.id);
        if (!isMounted) return;
        setProfileRaw(profile);
        if (profile?.archetype_scores) {
          const sorted = extractTopArchetypesFromScores(profile.archetype_scores);
          setArchetypeData(sorted);
        } else {
          setArchetypeData([]);
        }
      } catch (err) {
        console.error("Error fetching archetypes:", err);
        if (isMounted) {
          setError((prev) => prev ?? err);
          setArchetypeData([]);
        }
      } finally {
        if (isMounted) {
          setLoadingProfile(false);
        }
      }
    }
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function hydrateSummary() {
      if (!archetypeData.length) {
        setTasteSummaryRaw(null);
        setSummaryLoading(false);
        return;
      }

      try {
        setSummaryLoading(true);
        setTasteSummaryRaw(null);

        const { data } = await supabase.auth.getSession();
        const session = data?.session;
        if (!session) {
          return;
        }

        const summary = await getRecentTasteSummary({
          userId: session.user.id,
          archetypes: archetypeData,
        });

        if (isMounted) {
          setTasteSummaryRaw(summary);
        }
      } catch (err) {
        console.error("Error building taste summary:", err);
        if (isMounted) {
          setError((prev) => prev ?? err);
          setTasteSummaryRaw(null);
        }
      } finally {
        if (isMounted) {
          setSummaryLoading(false);
        }
      }
    }

    hydrateSummary();

    return () => {
      isMounted = false;
    };
  }, [archetypeData]);

  useEffect(() => {
    let isMounted = true;

    async function loadQuests() {
      try {
        const [daily, weekly, xpData] = await Promise.all([
          getActiveDailyQuest(),
          getActiveWeeklyQuest(),
          getUserXP(),
        ]);

        if (!isMounted) return;

        const xpValue = xpData?.ep ?? xpData?.xp ?? 0;
        const levelValue = xpData?.level ?? 1;

        setUserXP(xpValue);
        setUserLevel(levelValue);
        setXpForNextLevelState(getXPForNextLevel(levelValue));

        if (daily) {
          setDailyQuest({
            type: "daily",
            questType: daily.quest_type ?? null,
            title: daily.title ?? null,
            description: daily.description ?? null,
            xpReward: daily.xp_reward ?? 0,
            additionalRewards: [
              ...(Array.isArray(daily.rewards?.stamps)
                ? daily.rewards.stamps.map((stamp: string) => ({
                    type: "stamp",
                    icon: "bookmark",
                    label: stamp,
                  }))
                : []),
              ...(Array.isArray(daily.rewards?.achievements)
                ? daily.rewards.achievements.map((achievement: string) => ({
                    type: "achievement",
                    icon: "ribbon",
                    label: achievement,
                  }))
                : []),
            ],
            progress: daily.progress ?? 0,
            total: typeof daily.target_count === "number" ? daily.target_count : 0,
            completed: Boolean(daily.completed),
          });
        } else {
          setDailyQuest(null);
        }

        if (weekly) {
          setWeeklyQuest({
            type: "weekly",
            questType: weekly.quest_type ?? null,
            title: weekly.title ?? null,
            description: weekly.description ?? null,
            xpReward: weekly.xp_reward ?? 0,
            additionalRewards: [
              ...(Array.isArray(weekly.rewards?.stamps)
                ? weekly.rewards.stamps.map((stamp: string) => ({
                    type: "stamp",
                    icon: "bookmark",
                    label: stamp,
                  }))
                : []),
              ...(Array.isArray(weekly.rewards?.achievements)
                ? weekly.rewards.achievements.map((achievement: string) => ({
                    type: "achievement",
                    icon: "ribbon",
                    label: achievement,
                  }))
                : []),
            ],
            progress: weekly.progress ?? 0,
            total: typeof weekly.target_count === "number" ? weekly.target_count : 0,
            completed: Boolean(weekly.completed),
          });
        } else {
          setWeeklyQuest(null);
        }
      } catch (err) {
        console.error("Error loading quests:", err);
        if (isMounted) {
          setError((prev) => prev ?? err);
        }
      }
    }

    loadQuests();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (timersInitialized.current) {
      return;
    }
    timersInitialized.current = true;

    const updateTimers = () => {
      setTimers({
        daily: getTimeUntilMidnight().formatted,
        weekly: getTimeUntilMonday().formatted,
      });
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => {
      clearInterval(interval);
      timersInitialized.current = false;
    };
  }, []);

  const state = useMemo<HomeDataState>(() => {
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
        quests: {
          ...toUiQuests(
            [dailyQuest, weeklyQuest].filter(Boolean) as Array<HomeQuest>
          ),
          daily: dailyQuest,
          weekly: weeklyQuest,
        },
        userXP,
        userLevel,
        xpForNextLevel: xpForNextLevelState,
        timers,
      },
    };
  }, [
    archetypeData,
    dailyQuest,
    error,
    loadingProfile,
    profileRaw,
    summaryLoading,
    tasteSummaryRaw,
    timers,
    userLevel,
    userXP,
    weeklyQuest,
    xpForNextLevelState,
  ]);

  return state;
}
