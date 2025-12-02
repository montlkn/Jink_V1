import {
  EMPTY_HOME_QUESTS,
  type HomeQuestSet,
  toUiProfile,
  toUiQuests,
  toUiTaste,
} from "@/features/home/homeSelectors";
import { log } from "@/lib/log";
import {
  type ActiveQuestsResponse,
  fetchActiveQuests,
  fetchRecentScanCount,
  fetchUserStreak,
  fetchWalkSummaries,
  fetchXpSnapshot,
  getSession,
  type StreakSnapshot,
  type XpSnapshot,
} from "@/services/gateways";
import { getUserAestheticProfile } from "@/services/gateways/quizGateway";
import {
  DEFAULT_TASTE_ACTION,
  getActionableTaste,
  getRecentTasteLine,
  getRecentTasteSummary,
  type RecentScan,
  type RecentWalk,
  type TasteAction,
} from "@/services/recentTasteSummary";
import { extractTopArchetypesFromScores } from "@/utils/archetypeColorBlend";
import { getTimeUntilMidnight, getTimeUntilMonday } from "@/utils/questTimers";
import { getXpForNextLevel } from "@/utils/xpLevel";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

type HomeData = {
  profile: ReturnType<typeof toUiProfile>;
  archetypeData: Record<string, unknown>[];
  tasteSummary: ReturnType<typeof toUiTaste>;
  summaryLoading: boolean;
  quests: HomeQuestSet;
  userXP: number;
  userLevel: number;
  xpForNextLevel: number;
  streakCount: number;
  tasteSignals: {
    last10Scans: RecentScan[];
    last3Walks: RecentWalk[];
  };
  tasteAction: TasteAction;
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
  const [archetypeData, setArchetypeData] = useState<Record<string, unknown>[]>(
    [],
  );
  const [tasteSummaryRaw, setTasteSummaryRaw] = useState<unknown>(null);
  const [tasteSignals, setTasteSignals] = useState<{
    last10Scans: RecentScan[];
    last3Walks: RecentWalk[];
  }>({
    last10Scans: [],
    last3Walks: [],
  });
  const [tasteAction, setTasteAction] = useState<TasteAction>(
    DEFAULT_TASTE_ACTION,
  );
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [quests, setQuests] = useState<HomeQuestSet>(EMPTY_HOME_QUESTS);
  const [userXP, setUserXP] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [xpForNextLevelState, setXpForNextLevelState] = useState(100);
  const [streakCount, setStreakCount] = useState(0);
  const [timers, setTimers] = useState({ daily: "", weekly: "" });
  const [error, setError] = useState<unknown>(null);
  const timersInitialized = useRef(false);

  const fetchProfile = async () => {
    let alive = true;

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
        // Ensure it's a proper array
        setArchetypeData(Array.isArray(sorted) ? Array.from(sorted) : []);
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

    return () => {
      alive = false;
    };
  };

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  // Refetch profile when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, []),
  );

  useEffect(() => {
    let alive = true;

    if (!archetypeData.length) {
      setTasteSummaryRaw(null);
      setSummaryLoading(false);
      setTasteSignals({
        last10Scans: [],
        last3Walks: [],
      });
      setTasteAction(DEFAULT_TASTE_ACTION);
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

        let summary = null;
        let walkSummaries = null;
        let tasteLine = null;

        try {
          summary = await getRecentTasteSummary({
            userId: session.user.id,
            archetypes: archetypeData,
          });
        } catch (err) {
          log.error("[home] Error in getRecentTasteSummary", err);
        }

        try {
          walkSummaries = await fetchWalkSummaries({
            userId: session.user.id,
            platform: Platform.OS,
          });
        } catch (err) {
          log.error("[home] Error in fetchWalkSummaries", err);
        }

        try {
          const [streak, scanCount] = await Promise.all([
            fetchUserStreak(session.user.id),
            fetchRecentScanCount(session.user.id, 7),
          ]);
          tasteLine = await getRecentTasteLine({
            userId: session.user.id,
            archetypes: archetypeData,
            streakCount: streak?.streakCount ?? 0,
            recentScanCount: scanCount,
          });
        } catch (err) {
          log.error("[home] Error in getRecentTasteLine", err);
        }

        const recentWalks: RecentWalk[] = Array.isArray(walkSummaries)
          ? walkSummaries.slice(0, 3).map((walk) => {
            const raw = walk as Record<string, unknown>;
            const dominantStyle = typeof raw.dominantStyle === "string"
              ? raw.dominantStyle
              : typeof raw.dominant_style === "string"
              ? (raw.dominant_style as string)
              : undefined;
            const dominantArchitect = typeof raw.dominantArchitect === "string"
              ? raw.dominantArchitect
              : typeof raw.dominant_architect === "string"
              ? (raw.dominant_architect as string)
              : undefined;
            const eraData = (() => {
              const rawEra = raw.era;
              if (
                rawEra &&
                typeof rawEra === "object" &&
                rawEra !== null &&
                typeof (rawEra as Record<string, unknown>).start === "number" &&
                typeof (rawEra as Record<string, unknown>).end === "number"
              ) {
                return {
                  start: (rawEra as Record<string, number>).start,
                  end: (rawEra as Record<string, number>).end,
                };
              }

              const rawEraStart = raw.eraStart ?? raw.era_start;
              const rawEraEnd = raw.eraEnd ?? raw.era_end;
              if (
                typeof rawEraStart === "number" && typeof rawEraEnd === "number"
              ) {
                return {
                  start: rawEraStart,
                  end: rawEraEnd,
                };
              }

              const startedAt = typeof walk.startedAt === "string"
                ? new Date(walk.startedAt)
                : null;
              if (startedAt && !Number.isNaN(startedAt.getTime())) {
                const year = startedAt.getFullYear();
                return {
                  start: year,
                  end: year,
                };
              }

              return undefined;
            })();

            return {
              dominantStyle,
              dominantArchitect,
              era: eraData,
            };
          })
          : [];

        const action = await getActionableTaste({
          last10Scans: [],
          last3Walks: recentWalks,
        });

        // Prefer AI-generated tasteLine over action headline
        const aiGeneratedHeadline = tasteLine?.text?.trim();
        const fallbackHeadline = firstNonEmptyText([
          summary?.text,
        ]);
        const fallbackCentral = extractPrimaryArchetype(archetypeData);

        const resolvedAction = aiGeneratedHeadline
          ? {
            ...(action ?? DEFAULT_TASTE_ACTION),
            headline: aiGeneratedHeadline,
            central: fallbackCentral ??
              (action?.central ?? DEFAULT_TASTE_ACTION.central),
          }
          : action && action !== DEFAULT_TASTE_ACTION
          ? action
          : fallbackHeadline
          ? {
            ...DEFAULT_TASTE_ACTION,
            headline: clampTasteHeadline(fallbackHeadline),
            central: fallbackCentral ?? DEFAULT_TASTE_ACTION.central,
          }
          : DEFAULT_TASTE_ACTION;

        if (alive) {
          setTasteSummaryRaw(summary);
          setTasteSignals({
            last10Scans: [],
            last3Walks: recentWalks,
          });
          setTasteAction(resolvedAction);
        }
      } catch (err) {
        log.error("[home] Error building taste summary", err);
        if (alive) {
          setError((prev: unknown) => (prev == null ? err : prev));
          setTasteSummaryRaw(null);
          setTasteSignals({
            last10Scans: [],
            last3Walks: [],
          });
          setTasteAction(DEFAULT_TASTE_ACTION);
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

        const [{ daily, weekly }, xpSnapshot, streakSnapshot]: [
          ActiveQuestsResponse,
          XpSnapshot,
          StreakSnapshot,
        ] = await Promise.all([
          fetchActiveQuests({ userId: session.user.id }),
          fetchXpSnapshot({ userId: session.user.id }),
          fetchUserStreak(session.user.id),
        ]);

        if (!alive) return;

        setQuests(toUiQuests({ daily, weekly }));

        const xpValue = xpSnapshot?.xp ?? 0;
        const levelValue = xpSnapshot?.level ?? 1;

        setUserXP(xpValue);
        setUserLevel(levelValue);
        setXpForNextLevelState(getXpForNextLevel(levelValue));
        setStreakCount(streakSnapshot?.streakCount ?? 0);
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
        streakCount,
        tasteSignals,
        tasteAction,
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
    streakCount,
    tasteSignals,
    tasteAction,
    tasteSummaryRaw,
    timers,
    userLevel,
    userXP,
    xpForNextLevelState,
  ]);
}

function firstNonEmptyText(
  candidates: (string | null | undefined)[],
): string | null {
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return null;
}

function clampTasteHeadline(headline: string): string {
  // No clamping - AI is instructed to keep it short (8-10 words)
  return headline.replace(/\s+/g, " ").trim();
}

function extractPrimaryArchetype(
  archetypes: Record<string, unknown>[],
): TasteAction["central"] | null {
  if (!Array.isArray(archetypes) || archetypes.length === 0) {
    return null;
  }
  const primary = archetypes[0];
  if (!primary || typeof primary !== "object") {
    return null;
  }
  const primaryRecord = primary as Record<string, unknown>;
  let rawName: string | null = null;
  if (typeof primaryRecord.name === "string") {
    rawName = primaryRecord.name;
  } else if (typeof primaryRecord.archetype === "string") {
    rawName = primaryRecord.archetype;
  }
  if (typeof rawName === "string") {
    const label = rawName.trim();
    if (label.length > 0) {
      return { kind: "style", label };
    }
  }
  return null;
}
