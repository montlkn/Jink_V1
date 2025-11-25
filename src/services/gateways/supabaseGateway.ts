import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";
import {
  createClient,
  processLock,
  type AuthChangeEvent,
  type AuthError,
  type Session,
} from "@supabase/supabase-js";
import { log } from "@/lib/log";
import type { WalkGeometry, WalkSummary } from "@/types/walks";
import "react-native-url-polyfill/auto";

type QuestType = "daily" | "weekly";

type ProfileQuestFields = {
  daily_quest_id: string | null;
  daily_quest_progress: number | null;
  daily_quest_completed: boolean | null;
  weekly_quest_id: string | null;
  weekly_quest_progress: number | null;
  weekly_quest_completed: boolean | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  updated_at: string | null;
};

type ProfileQuestRow = ProfileQuestFields;

type ProfileQuestState = {
  questId: string | null;
  progress: number;
  completed: boolean;
};

type QuestRow = {
  id: string;
  type: QuestType;
  title: string | null;
  description: string | null;
  quest_type: string | null;
  target_count: number | null;
  xp_reward: number | null;
  ep_reward?: number | null;
  rewards?: unknown;
  active_from?: string | null;
  active_until?: string | null;
};

type QuestWithState = QuestRow & {
  progress: number;
  completed: boolean;
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("[supabaseGateway] Missing Supabase environment variables");
}

export const supabaseGateway = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
    lock: processLock,
  },
});

const supabase = supabaseGateway;

if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

export type FetchActiveQuestsResult = {
  daily: QuestWithState | null;
  weekly: QuestWithState | null;
};

export type FetchXpSummaryResult = {
  xp: number;
  level: number;
  xpSpent: number;
};

export type XpSnapshot = FetchXpSummaryResult;
export type ActiveQuestsResponse = FetchActiveQuestsResult;

type CompleteQuestParams = {
  userId: string;
  questId: string;
  now?: number;
};

export type CompleteQuestResult = {
  questId: string;
  type: QuestType;
  completed: boolean;
  updatedAt: string;
};

const QUEST_FIELD_MAP = {
  daily: {
    id: "daily_quest_id",
    progress: "daily_quest_progress",
    completed: "daily_quest_completed",
  },
  weekly: {
    id: "weekly_quest_id",
    progress: "weekly_quest_progress",
    completed: "weekly_quest_completed",
  },
} as const satisfies Record<
  QuestType,
  {
    id: keyof ProfileQuestFields;
    progress: keyof ProfileQuestFields;
    completed: keyof ProfileQuestFields;
  }
>;

export const getSupabaseClient = () => supabase;

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data?.session ?? null;
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

type ExchangeCodeForSessionParams = {
  code: string;
};

type ExchangeCodeForSessionResult = {
  session: Session | null;
  error: AuthError | null;
};

export async function exchangeCodeForSession(
  params: ExchangeCodeForSessionParams
): Promise<ExchangeCodeForSessionResult> {
  const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);

  return {
    session: data?.session ?? null,
    error,
  };
}

type SetSessionParams = {
  accessToken: string;
  refreshToken: string;
};

type SetSessionResult = {
  session: Session | null;
  error: AuthError | null;
};

export async function setSession(params: SetSessionParams): Promise<SetSessionResult> {
  const { data, error } = await supabase.auth.setSession({
    access_token: params.accessToken,
    refresh_token: params.refreshToken,
  });

  return {
    session: data?.session ?? null,
    error,
  };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

type SignUpWithPasswordParams = Parameters<typeof supabase.auth.signUp>[0];
type SignInWithPasswordParams = Parameters<typeof supabase.auth.signInWithPassword>[0];
type SignInWithOAuthParams = Parameters<typeof supabase.auth.signInWithOAuth>[0];
type SignInWithOtpParams = Parameters<typeof supabase.auth.signInWithOtp>[0];
type VerifyOtpParamsType = Parameters<typeof supabase.auth.verifyOtp>[0];

export async function signInWithPassword(params: SignInWithPasswordParams) {
  return supabase.auth.signInWithPassword(params);
}

export async function signUpWithPassword(params: SignUpWithPasswordParams) {
  return supabase.auth.signUp(params);
}

export async function signInWithOAuth(params: SignInWithOAuthParams) {
  return supabase.auth.signInWithOAuth(params);
}

export async function signInWithOtp(params: SignInWithOtpParams) {
  return supabase.auth.signInWithOtp(params);
}

export async function verifyOtp(params: VerifyOtpParamsType) {
  return supabase.auth.verifyOtp(params);
}

const coerceNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const coerceString = (value: unknown): string | null =>
  typeof value === "string" && value.length ? value : null;

function extractQuestState(
  profile: ProfileQuestFields,
  questType: QuestType
): ProfileQuestState {
  const fields = QUEST_FIELD_MAP[questType];
  const questId = coerceString((profile as any)[fields.id]);
  const progress = coerceNumber((profile as any)[fields.progress], 0);
  const completed = Boolean((profile as any)[fields.completed]);

  return {
    questId,
    progress,
    completed,
  };
}

function applyQuestAssignment(
  profile: ProfileQuestFields,
  questType: QuestType,
  questId: string
) {
  if (questType === "daily") {
    profile.daily_quest_id = questId;
    profile.daily_quest_progress = 0;
    profile.daily_quest_completed = false;
  } else {
    profile.weekly_quest_id = questId;
    profile.weekly_quest_progress = 0;
    profile.weekly_quest_completed = false;
  }
}

async function ensureQuest({
  userId,
  questType,
  profile,
  nowIso,
}: {
  userId: string;
  questType: QuestType;
  profile: ProfileQuestFields;
  nowIso: string;
}): Promise<QuestWithState | null> {
  const state = extractQuestState(profile, questType);

  if (!state.questId || state.completed) {
    const { data: newQuest, error: findQuestError } = await supabase
      .from("quests")
      .select("*")
      .eq("type", questType)
      .gte("active_until", nowIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findQuestError) {
      throw findQuestError;
    }

    if (newQuest) {
      const updatePayload =
        questType === "daily"
          ? {
              daily_quest_id: newQuest.id,
              daily_quest_progress: 0,
              daily_quest_completed: false,
            }
          : {
              weekly_quest_id: newQuest.id,
              weekly_quest_progress: 0,
              weekly_quest_completed: false,
            };

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", userId);

      if (updateError) {
        throw updateError;
      }

      applyQuestAssignment(profile, questType, newQuest.id);

      return {
        ...(newQuest as QuestRow),
        progress: 0,
        completed: false,
      };
    }
  }

  const activeQuestState = extractQuestState(profile, questType);
  if (!activeQuestState.questId) {
    return null;
  }

  const { data: questRow, error: questError } = await supabase
    .from("quests")
    .select("*")
    .eq("id", activeQuestState.questId)
    .maybeSingle();

  if (questError) {
    throw questError;
  }

  if (!questRow) {
    return null;
  }

  return {
    ...(questRow as QuestRow),
    progress: activeQuestState.progress,
    completed: activeQuestState.completed,
  };
}

export async function fetchActiveQuests(
  user: string | { userId: string }
): Promise<FetchActiveQuestsResult> {
  const userId = typeof user === "string" ? user : user.userId;
  if (!userId) {
    throw new Error("userId is required to fetch active quests");
  }
  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select(
      "daily_quest_id, daily_quest_progress, daily_quest_completed, " +
        "weekly_quest_id, weekly_quest_progress, weekly_quest_completed"
    )
    .eq("id", userId)
    .single();

  if (profileError) {
    throw profileError;
  }

  const profileSource = (profileRow ?? {}) as Partial<ProfileQuestRow>;

  const profile: ProfileQuestFields = {
    daily_quest_id: coerceString(profileSource.daily_quest_id),
    daily_quest_progress: coerceNumber(profileSource.daily_quest_progress, 0),
    daily_quest_completed: Boolean(profileSource.daily_quest_completed),
    weekly_quest_id: coerceString(profileSource.weekly_quest_id),
    weekly_quest_progress: coerceNumber(profileSource.weekly_quest_progress, 0),
    weekly_quest_completed: Boolean(profileSource.weekly_quest_completed),
  };

  const nowIso = new Date().toISOString();

  const [daily, weekly] = await Promise.all([
    ensureQuest({ userId, questType: "daily", profile, nowIso }),
    ensureQuest({ userId, questType: "weekly", profile, nowIso }),
  ]);

  return { daily, weekly };
}

async function updateQuestProgress(
  userId: string,
  questType: QuestType,
  increment = 1
): Promise<boolean> {
  const { data, error } = await supabase.rpc("update_quest_progress", {
    p_user_id: userId,
    p_quest_type: questType,
    p_progress_increment: increment,
  });

  if (error) {
    throw error;
  }

  return Boolean(data);
}

type ProfileXpRow = {
  xp: number | null;
  level: number | null;
  xp_spent: number | null;
};

export async function fetchXpSummary(userId: string): Promise<FetchXpSummaryResult> {
  const { data, error } = await supabase
    .from("profiles")
    .select("xp, level, xp_spent")
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }

  const source = (data ?? {}) as Partial<ProfileXpRow>;

  return {
    xp: coerceNumber(source.xp, 0),
    level: Math.max(1, coerceNumber(source.level, 1)),
    xpSpent: coerceNumber(source.xp_spent, 0),
  };
}

export async function fetchXpSnapshot(params: { userId: string }): Promise<FetchXpSummaryResult> {
  if (!params?.userId) {
    throw new Error("userId is required to fetch XP snapshot");
  }
  return fetchXpSummary(params.userId);
}

type AwardXpParams = {
  amount: number;
  source?: string;
  userId?: string;
  progressIncrement?: number;
};

export async function awardXp(params: AwardXpParams): Promise<void> {
  const { amount, source = "building_scan", userId: explicitUserId, progressIncrement = 1 } = params;

  if (!Number.isFinite(amount)) {
    throw new Error("amount must be a finite number");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  const userId = explicitUserId ?? user?.id;
  if (!userId) {
    throw new Error("No user logged in");
  }

  // Fetch user's streak to apply multiplier
  let finalAmount = amount;
  try {
    const streakData = await fetchUserStreak(userId);
    finalAmount = Math.round(amount * streakData.multiplier);
    if (streakData.multiplier > 1) {
      log.info(`[supabaseGateway] XP multiplier applied: ${amount} × ${streakData.multiplier} = ${finalAmount}`);
    }
  } catch (streakError) {
    log.warn("[supabaseGateway] Failed to fetch streak for XP multiplier, using base amount", streakError);
  }

  const { error } = await supabase.rpc("award_xp", {
    p_user_id: userId,
    p_amount: finalAmount,
  });

  if (error) {
    throw error;
  }

  // Update daily streak after awarding XP
  if (source === "building_scan") {
    try {
      const streakUpdate = await updateDailyStreak(userId);
      if (streakUpdate.isNewDay) {
        log.info(`[supabaseGateway] Daily streak updated: ${streakUpdate.streakCount} days`);
      }
    } catch (streakUpdateError) {
      log.warn("[supabaseGateway] Failed to update daily streak", streakUpdateError);
    }
  }

  if (source !== "building_scan") {
    return;
  }

  try {
    const { daily, weekly } = await fetchActiveQuests({ userId });
    const updates: Promise<boolean>[] = [];

    if (daily && daily.quest_type === "scan" && !daily.completed) {
      updates.push(updateQuestProgress(userId, "daily", progressIncrement));
    }
    if (weekly && weekly.quest_type === "scan" && !weekly.completed) {
      updates.push(updateQuestProgress(userId, "weekly", progressIncrement));
    }

    if (updates.length) {
      await Promise.all(updates);
    }
  } catch (questError) {
    log.warn(
      "[supabaseGateway] Failed to update quest progress after awarding XP",
      questError
    );
  }
}

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, bio, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as ProfileRow | null) ?? null;
}

export type UpdateProfileParams = {
  userId: string;
  patch: Partial<Pick<ProfileRow, "full_name" | "username" | "avatar_url" | "bio" >>;
};

export async function updateProfile(params: UpdateProfileParams): Promise<ProfileRow> {
  const { userId, patch } = params;
  const sanitizedPatch = Object.fromEntries(
    Object.entries(patch).filter(([_, value]) => value !== undefined)
  );

  const { data, error } = await supabase
    .from("profiles")
    .update(sanitizedPatch)
    .eq("id", userId)
    .select("id, full_name, username, avatar_url, bio, updated_at")
    .single();

  if (error) {
    throw error;
  }

  return data as ProfileRow;
}

export type UploadAvatarParams = {
  userId: string;
  file: {
    uri: string;
    name: string;
    type?: string;
  };
  bucket?: string;
};

export type UploadAvatarResult = {
  publicUrl: string;
  path: string;
};

export async function uploadAvatar(params: UploadAvatarParams): Promise<UploadAvatarResult> {
  const { userId, file, bucket = "avatars" } = params;
  const response = await fetch(file.uri);
  const blob = await response.blob();
  const objectPath = `${userId}/${Date.now()}_${file.name}`;

  const { data, error } = await supabase.storage.from(bucket).upload(objectPath, blob, {
    contentType: file.type ?? "image/jpeg",
    upsert: true,
  });

  if (error) {
    throw error;
  }

  const publicResult = supabase.storage.from(bucket).getPublicUrl(data.path);

  return {
    publicUrl: publicResult.data.publicUrl,
    path: data.path,
  };
}

export async function completeQuest(
  params: CompleteQuestParams
): Promise<CompleteQuestResult> {
  const { userId, questId, now } = params;
  const resolvedNow = typeof now === "number" ? now : Date.now();
  const completedAtIso = new Date(resolvedNow).toISOString();

  const { data: questRow, error: questError } = await supabase
    .from("quests")
    .select("id, type, target_count")
    .eq("id", questId)
    .maybeSingle();

  if (questError) {
    throw questError;
  }

  if (!questRow) {
    throw new Error(`Quest ${questId} was not found.`);
  }

  const questType: QuestType = questRow.type === "weekly" ? "weekly" : "daily";
  const targetCount = Math.max(1, coerceNumber(questRow.target_count, 1));

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select(
      "daily_quest_id, daily_quest_progress, daily_quest_completed, " +
        "weekly_quest_id, weekly_quest_progress, weekly_quest_completed"
    )
    .eq("id", userId)
    .single();

  if (profileError) {
    throw profileError;
  }

  const profileSource = (profileRow ?? {}) as Partial<ProfileQuestRow>;

  const profile: ProfileQuestFields = {
    daily_quest_id: coerceString(profileSource.daily_quest_id),
    daily_quest_progress: coerceNumber(profileSource.daily_quest_progress, 0),
    daily_quest_completed: Boolean(profileSource.daily_quest_completed),
    weekly_quest_id: coerceString(profileSource.weekly_quest_id),
    weekly_quest_progress: coerceNumber(profileSource.weekly_quest_progress, 0),
    weekly_quest_completed: Boolean(profileSource.weekly_quest_completed),
  };

  const state = extractQuestState(profile, questType);

  if (!state.questId || state.questId !== questId) {
    throw new Error(`User ${userId} is not assigned to quest ${questId}.`);
  }

  if (state.completed) {
    return {
      questId,
      type: questType,
      completed: true,
      updatedAt: completedAtIso,
    };
  }

  const increment = Math.max(targetCount - state.progress, 0);

  if (increment <= 0) {
    return {
      questId,
      type: questType,
      completed: false,
      updatedAt: completedAtIso,
    };
  }

  const { data: completionFlag, error: updateError } = await supabase
    .rpc("update_quest_progress", {
      p_user_id: userId,
      p_quest_type: questType,
      p_progress_increment: increment,
    });

  if (updateError) {
    throw updateError;
  }

  // Update daily streak after completing quest
  try {
    const streakUpdate = await updateDailyStreak(userId);
    if (streakUpdate.isNewDay) {
      log.info(`[supabaseGateway] Daily streak updated after quest completion: ${streakUpdate.streakCount} days`);
    }
  } catch (streakError) {
    log.warn("[supabaseGateway] Failed to update daily streak after quest completion", streakError);
  }

  return {
    questId,
    type: questType,
    completed: Boolean(completionFlag ?? increment > 0),
    updatedAt: completedAtIso,
  };
}

type FetchNearbyBuildingsParams = {
  latitude: number;
  longitude: number;
  radius: number;
  filters?: {
    style_in?: string[];
    architect_in?: string[];
    year_gte?: number;
    year_lte?: number;
  };
};

export async function fetchNearbyBuildings(
  params: FetchNearbyBuildingsParams
) {
  const { latitude, longitude, radius, filters } = params;
  const { data, error } = await supabase.functions.invoke("nearby-buildings", {
    body: { latitude, longitude, radius, filters },
  });

  if (error) {
    throw new Error(error.message || "Failed to fetch nearby buildings");
  }

  const records = Array.isArray(data) ? data : [];
  return applyNearbyFilters(records, filters);
}

const WALK_SUMMARIES_FUNCTION = "past-walk-summaries";
const WALK_GEOMETRY_FUNCTION = "past-walk-geometry";

type FetchWalkSummariesParams = {
  userId?: string | null;
  platform?: string;
};

export async function fetchWalkSummaries(
  params: FetchWalkSummariesParams
): Promise<WalkSummary[]> {
  if (!params?.userId) {
    return [];
  }

  const { data, error } = await supabase.functions.invoke<WalkSummary[]>(
    WALK_SUMMARIES_FUNCTION,
    {
      body: {
        userId: params.userId,
        platform: params.platform,
      },
    }
  );

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

function applyNearbyFilters(
  buildings: Record<string, unknown>[],
  filters?: FetchNearbyBuildingsParams["filters"]
): Record<string, unknown>[] {
  if (!filters) {
    return buildings;
  }

  const styleSet = new Set(
    (filters.style_in ?? []).map((value) => value.toLowerCase().trim()).filter(Boolean)
  );
  const architectSet = new Set(
    (filters.architect_in ?? []).map((value) => value.toLowerCase().trim()).filter(Boolean)
  );
  const yearGte =
    typeof filters.year_gte === "number" && Number.isFinite(filters.year_gte)
      ? filters.year_gte
      : undefined;
  const yearLte =
    typeof filters.year_lte === "number" && Number.isFinite(filters.year_lte)
      ? filters.year_lte
      : undefined;

  const pickString = (obj: Record<string, unknown>, keys: string[]): string | undefined => {
    for (const key of keys) {
      const value = obj[key];
      if (typeof value === "string" && value.trim().length) {
        return value;
      }
    }
    return undefined;
  };

  const pickNumber = (obj: Record<string, unknown>, keys: string[]): number | undefined => {
    for (const key of keys) {
      const value = obj[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
    }
    return undefined;
  };

  return buildings.filter((building) => {
    const record = building ?? {};
    const styleValue = pickString(record as Record<string, unknown>, [
      "style",
      "primary_style",
      "style_name",
      "styleLabel",
    ]);

    if (styleSet.size) {
      const normalized = styleValue?.toLowerCase().trim();
      if (!normalized || !styleSet.has(normalized)) {
        return false;
      }
    }

    const architectValue = pickString(record as Record<string, unknown>, [
      "architect",
      "architect_name",
      "primary_architect",
    ]);

    if (architectSet.size) {
      const normalized = architectValue?.toLowerCase().trim();
      if (!normalized || !architectSet.has(normalized)) {
        return false;
      }
    }

    const yearValue = pickNumber(record as Record<string, unknown>, [
      "year_built",
      "year",
      "construction_year",
    ]);

    if (typeof yearGte === "number" && (yearValue ?? Number.MIN_SAFE_INTEGER) < yearGte) {
      return false;
    }

    if (typeof yearLte === "number" && (yearValue ?? Number.MAX_SAFE_INTEGER) > yearLte) {
      return false;
    }

    return true;
  });
}

type FetchWalkDetailParams = {
  walkId: string;
  platform?: string;
  tolerance?: number;
};

export async function fetchWalkDetail(
  params: FetchWalkDetailParams
): Promise<WalkGeometry> {
  if (!params.walkId) {
    throw new Error("walkId is required to fetch walk detail.");
  }

  const { data, error } = await supabase.functions.invoke<WalkGeometry>(
    WALK_GEOMETRY_FUNCTION,
    {
      body: {
        walkId: params.walkId,
        platform: params.platform,
        tolerance: params.tolerance,
      },
    }
  );

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`No geometry returned for walk ${params.walkId}.`);
  }

  return data;
}

type CompleteWalkParams = {
  userId: string;
  walkId: string;
  now?: number;
};

export type CompleteWalkResult = {
  walkId: string;
  userId: string;
  completedAt: string;
};

export async function completeWalk(
  params: CompleteWalkParams
): Promise<CompleteWalkResult> {
  const { userId, walkId, now } = params;
  if (!userId || !walkId) {
    throw new Error("userId and walkId are required to complete a walk.");
  }

  const completedAtIso = new Date(typeof now === "number" ? now : Date.now()).toISOString();

  const { error } = await supabase.rpc("complete_walk_session", {
    p_user_id: userId,
    p_walk_id: walkId,
    p_completed_at: completedAtIso,
  });

  if (error) {
    throw error;
  }

  return {
    walkId,
    userId,
    completedAt: completedAtIso,
  };
}

// ============================================================================
// STREAK TRACKING
// ============================================================================

export type StreakSnapshot = {
  streakCount: number;
  lastActivityDate: string | null;
  streakStartedAt: string | null;
  multiplier: number;
};

export type UpdateStreakResult = {
  streakCount: number;
  isNewDay: boolean;
  previousStreak: number;
};

/**
 * Fetch current streak data for a user
 */
export async function fetchUserStreak(userId: string): Promise<StreakSnapshot> {
  const { data, error } = await supabase
    .from("profiles")
    .select("daily_streak_count, last_activity_date, streak_started_at")
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }

  const streakCount = coerceNumber(data.daily_streak_count, 0);

  // Calculate multiplier based on streak count
  let multiplier = 1.0;
  if (streakCount >= 30) {
    multiplier = 3.0;
  } else if (streakCount >= 7) {
    multiplier = 2.0;
  } else if (streakCount >= 3) {
    multiplier = 1.5;
  }

  return {
    streakCount,
    lastActivityDate: data.last_activity_date || null,
    streakStartedAt: data.streak_started_at || null,
    multiplier,
  };
}

/**
 * Fetch the count of recent scans for a user within the last N days
 * Queries walk_seen_points table for buildings scanned during walks
 */
export async function fetchRecentScanCount(userId: string, days = 7): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { count, error } = await supabase
    .from("walk_seen_points")
    .select("*", { count: "exact", head: true })
    .eq("scanned", true)
    .in(
      "walk_id",
      supabase
        .from("walk_summaries")
        .select("id")
        .eq("user_id", userId)
        .gte("started_at", cutoffDate.toISOString())
    );

  if (error) {
    log.warn("[supabaseGateway] Failed to fetch recent scan count", error);
    return 0; // Return 0 on error rather than throwing
  }

  return count ?? 0;
}

/**
 * Update daily streak for a user after a qualifying action
 * (scan, walk completion, quest completion)
 */
export async function updateDailyStreak(userId: string): Promise<UpdateStreakResult> {
  const { data, error } = await supabase.rpc("update_daily_streak", {
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error("No data returned from update_daily_streak");
  }

  const row = data[0];

  return {
    streakCount: coerceNumber(row.streak_count, 0),
    isNewDay: Boolean(row.is_new_day),
    previousStreak: coerceNumber(row.previous_streak, 0),
  };
}
