import type { AuthError, Session } from "@supabase/supabase-js";
import { supabase } from "@/api/supabaseClient";
import type { WalkGeometry, WalkSummary } from "@/types/walks";

type QuestType = "daily" | "weekly";

type ProfileQuestFields = {
  daily_quest_id: string | null;
  daily_quest_progress: number | null;
  daily_quest_completed: boolean | null;
  weekly_quest_id: string | null;
  weekly_quest_progress: number | null;
  weekly_quest_completed: boolean | null;
};

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

type FetchActiveQuestsResult = {
  daily: QuestWithState | null;
  weekly: QuestWithState | null;
};

type FetchXpSummaryResult = {
  xp: number;
  level: number;
  xpSpent: number;
};

type CompleteQuestParams = {
  userId: string;
  questId: string;
  now?: number;
};

type CompleteQuestResult = {
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

export const supabaseGateway = supabase;

export const getSupabaseClient = () => supabase;

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data?.session ?? null;
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
  userId: string
): Promise<FetchActiveQuestsResult> {
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

  const profile: ProfileQuestFields = {
    daily_quest_id: coerceString(profileRow?.daily_quest_id),
    daily_quest_progress: coerceNumber(profileRow?.daily_quest_progress, 0),
    daily_quest_completed: Boolean(profileRow?.daily_quest_completed),
    weekly_quest_id: coerceString(profileRow?.weekly_quest_id),
    weekly_quest_progress: coerceNumber(profileRow?.weekly_quest_progress, 0),
    weekly_quest_completed: Boolean(profileRow?.weekly_quest_completed),
  };

  const nowIso = new Date().toISOString();

  const [daily, weekly] = await Promise.all([
    ensureQuest({ userId, questType: "daily", profile, nowIso }),
    ensureQuest({ userId, questType: "weekly", profile, nowIso }),
  ]);

  return { daily, weekly };
}

export async function fetchXpSummary(userId: string): Promise<FetchXpSummaryResult> {
  const { data, error } = await supabase
    .from("profiles")
    .select("xp, level, xp_spent")
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }

  return {
    xp: coerceNumber(data?.xp, 0),
    level: Math.max(1, coerceNumber(data?.level, 1)),
    xpSpent: coerceNumber(data?.xp_spent, 0),
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

  const profile: ProfileQuestFields = {
    daily_quest_id: coerceString(profileRow?.daily_quest_id),
    daily_quest_progress: coerceNumber(profileRow?.daily_quest_progress, 0),
    daily_quest_completed: Boolean(profileRow?.daily_quest_completed),
    weekly_quest_id: coerceString(profileRow?.weekly_quest_id),
    weekly_quest_progress: coerceNumber(profileRow?.weekly_quest_progress, 0),
    weekly_quest_completed: Boolean(profileRow?.weekly_quest_completed),
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

  return {
    questId,
    type: questType,
    completed: Boolean(completionFlag ?? increment > 0),
    updatedAt: completedAtIso,
  };
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

type CompleteWalkResult = {
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

export type {
  QuestWithState,
  FetchActiveQuestsResult,
  FetchXpSummaryResult,
  CompleteQuestResult,
  CompleteWalkResult,
};
