/**
 * Quest gateway - handles quest operations
 */
import { log } from "@/lib/log";
import { supabase, coerceNumber, coerceString } from "./supabaseClient";
import { updateDailyStreak } from "./streakGateway";

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

export type FetchActiveQuestsResult = {
  daily: QuestWithState | null;
  weekly: QuestWithState | null;
};

export type ActiveQuestsResponse = FetchActiveQuestsResult;

export type CompleteQuestResult = {
  questId: string;
  type: QuestType;
  completed: boolean;
  updatedAt: string;
};

export type QuestEventData = {
  eventType: 'scan' | 'walk' | 'contribution' | 'photo';
  buildingBbl?: string;
  neighborhood?: string;
  style?: string;
  metadata?: Record<string, any>;
};

export type VerifyQuestScanParams = {
  userId: string;
  questId: string;
  buildingBbl: string;
  buildingStyle?: string;
  buildingNeighborhood?: string;
};

const QUEST_FIELD_MAP = {
  daily: { id: "daily_quest_id", progress: "daily_quest_progress", completed: "daily_quest_completed" },
  weekly: { id: "weekly_quest_id", progress: "weekly_quest_progress", completed: "weekly_quest_completed" },
} as const;

function extractQuestState(profile: ProfileQuestFields, questType: QuestType): ProfileQuestState {
  const fields = QUEST_FIELD_MAP[questType];
  return {
    questId: coerceString((profile as any)[fields.id]),
    progress: coerceNumber((profile as any)[fields.progress], 0),
    completed: Boolean((profile as any)[fields.completed]),
  };
}

function applyQuestAssignment(profile: ProfileQuestFields, questType: QuestType, questId: string) {
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
  userId, questType, profile, nowIso,
}: {
  userId: string;
  questType: QuestType;
  profile: ProfileQuestFields;
  nowIso: string;
}): Promise<QuestWithState | null> {
  const state = extractQuestState(profile, questType);

  // Check if current quest is still valid (not completed and not expired)
  if (state.questId && !state.completed) {
    const { data: existingQuest, error: existingError } = await supabase
      .from("quests")
      .select("*")
      .eq("id", state.questId)
      .gte("active_until", nowIso)
      .maybeSingle();

    if (!existingError && existingQuest) {
      return {
        ...(existingQuest as QuestRow),
        progress: state.progress,
        completed: state.completed,
      };
    }
  }

  // Need a new quest - try to generate from templates first
  const { data: generatedResult, error: generateError } = await supabase.rpc(
    "assign_new_quest_to_user",
    { p_user_id: userId, p_quest_type: questType }
  );

  if (!generateError && generatedResult?.success && generatedResult?.quest_id) {
    // Fetch the newly generated quest
    const { data: newQuest, error: fetchError } = await supabase
      .from("quests")
      .select("*")
      .eq("id", generatedResult.quest_id)
      .single();

    if (!fetchError && newQuest) {
      applyQuestAssignment(profile, questType, newQuest.id);
      log.info(`[questGateway] Generated new ${questType} quest from template: ${newQuest.title}`);
      return { ...(newQuest as QuestRow), progress: 0, completed: false };
    }
  }

  // Fallback: pick an existing quest if template generation fails
  log.warn(`[questGateway] Template generation failed for ${questType}, falling back to existing quests`);
  const { data: fallbackQuest, error: fallbackError } = await supabase
    .from("quests")
    .select("*")
    .eq("type", questType)
    .gte("active_until", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fallbackError) throw fallbackError;

  if (fallbackQuest) {
    const updatePayload = questType === "daily"
      ? { daily_quest_id: fallbackQuest.id, daily_quest_progress: 0, daily_quest_completed: false }
      : { weekly_quest_id: fallbackQuest.id, weekly_quest_progress: 0, weekly_quest_completed: false };

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId);

    if (updateError) throw updateError;

    applyQuestAssignment(profile, questType, fallbackQuest.id);
    return { ...(fallbackQuest as QuestRow), progress: 0, completed: false };
  }

  return null;
}

export async function fetchActiveQuests(
  user: string | { userId: string }
): Promise<FetchActiveQuestsResult> {
  const userId = typeof user === "string" ? user : user.userId;
  if (!userId) throw new Error("userId is required to fetch active quests");

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select(
      "daily_quest_id, daily_quest_progress, daily_quest_completed, " +
      "weekly_quest_id, weekly_quest_progress, weekly_quest_completed"
    )
    .eq("id", userId)
    .single();

  if (profileError) throw profileError;

  const profileSource = (profileRow ?? {}) as Partial<ProfileQuestFields>;
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

export async function updateQuestProgress(
  userId: string,
  questType: QuestType,
  increment = 1
): Promise<boolean> {
  const { data, error } = await supabase.rpc("update_quest_progress", {
    p_user_id: userId,
    p_quest_type: questType,
    p_progress_increment: increment,
  });

  if (error) throw error;
  return Boolean(data);
}

type CompleteQuestParams = {
  userId: string;
  questId: string;
  now?: number;
};

export async function completeQuest(params: CompleteQuestParams): Promise<CompleteQuestResult> {
  const { userId, questId, now } = params;
  const resolvedNow = typeof now === "number" ? now : Date.now();
  const completedAtIso = new Date(resolvedNow).toISOString();

  const { data: questRow, error: questError } = await supabase
    .from("quests")
    .select("id, type, target_count")
    .eq("id", questId)
    .maybeSingle();

  if (questError) throw questError;
  if (!questRow) throw new Error(`Quest ${questId} was not found.`);

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

  if (profileError) throw profileError;

  const profileSource = (profileRow ?? {}) as Partial<ProfileQuestFields>;
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
    return { questId, type: questType, completed: true, updatedAt: completedAtIso };
  }

  const increment = Math.max(targetCount - state.progress, 0);
  if (increment <= 0) {
    return { questId, type: questType, completed: false, updatedAt: completedAtIso };
  }

  const { data: completionFlag, error: updateError } = await supabase.rpc("update_quest_progress", {
    p_user_id: userId,
    p_quest_type: questType,
    p_progress_increment: increment,
  });

  if (updateError) throw updateError;

  // Update daily streak after completing quest
  try {
    const streakUpdate = await updateDailyStreak(userId);
    if (streakUpdate.isNewDay) {
      log.info(`[questGateway] Daily streak updated after quest completion: ${streakUpdate.streakCount} days`);
    }
  } catch (streakError) {
    log.warn("[questGateway] Failed to update daily streak after quest completion", streakError);
  }

  return {
    questId,
    type: questType,
    completed: Boolean(completionFlag ?? increment > 0),
    updatedAt: completedAtIso,
  };
}

/**
 * Verify if a building scan qualifies for a quest
 * Returns true if the scan is valid and hasn't been counted yet
 */
export async function verifyQuestScan(params: VerifyQuestScanParams): Promise<boolean> {
  const { userId, questId, buildingBbl, buildingStyle, buildingNeighborhood } = params;

  const { data, error } = await supabase.rpc("verify_quest_scan", {
    p_user_id: userId,
    p_quest_id: questId,
    p_building_bbl: buildingBbl,
    p_building_style: buildingStyle || null,
    p_building_neighborhood: buildingNeighborhood || null,
  });

  if (error) {
    log.warn("[questGateway] Failed to verify quest scan", error);
    return false;
  }

  return Boolean(data);
}

/**
 * Record a quest event
 * This tracks which specific buildings/actions contributed to quest progress
 */
export async function recordQuestEvent(
  userId: string,
  questId: string,
  eventData: QuestEventData
): Promise<string | null> {
  const { data, error } = await supabase.rpc("record_quest_event", {
    p_user_id: userId,
    p_quest_id: questId,
    p_event_type: eventData.eventType,
    p_building_bbl: eventData.buildingBbl || null,
    p_neighborhood: eventData.neighborhood || null,
    p_style: eventData.style || null,
    p_metadata: eventData.metadata || {},
  });

  if (error) {
    log.warn("[questGateway] Failed to record quest event", error);
    return null;
  }

  return data as string;
}

/**
 * Get quest progress from quest_events table
 * This is the source of truth for quest completion
 */
export async function getQuestProgress(userId: string, questId: string): Promise<number> {
  const { data, error } = await supabase.rpc("get_quest_progress", {
    p_user_id: userId,
    p_quest_id: questId,
  });

  if (error) {
    log.warn("[questGateway] Failed to get quest progress", error);
    return 0;
  }

  return coerceNumber(data, 0);
}
