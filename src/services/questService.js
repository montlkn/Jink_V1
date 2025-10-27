import {
  supabaseGateway as supabase,
  fetchActiveQuests,
  fetchXpSummary,
} from "@/services/gateways";

/**
 * Quest Service
 * Handles all quest and XP related operations
 */

// ============================================
// QUEST OPERATIONS
// ============================================

/**
 * Get active daily quest for current user
 */
export const getActiveDailyQuest = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("No user logged in");

    const { daily } = await fetchActiveQuests(user.id);
    return daily ?? null;
  } catch (error) {
    console.error("Error getting daily quest:", error);
    return null;
  }
};

/**
 * Get active weekly quest for current user
 */
export const getActiveWeeklyQuest = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("No user logged in");

    const { weekly } = await fetchActiveQuests(user.id);
    return weekly ?? null;
  } catch (error) {
    console.error("Error getting weekly quest:", error);
    return null;
  }
};

/**
 * Convenience helper to fetch both daily and weekly quests in parallel.
 */
export const getActiveQuests = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("No user logged in");

    return await fetchActiveQuests(user.id);
  } catch (error) {
    console.error("Error getting active quests:", error);
    return { daily: null, weekly: null };
  }
};

/**
 * Update quest progress (called when user scans building or completes walk)
 */
export const updateQuestProgress = async (questType, increment = 1) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user logged in');

    const { data, error } = await supabase
      .rpc('update_quest_progress', {
        p_user_id: user.id,
        p_quest_type: questType,
        p_progress_increment: increment
      });

    if (error) throw error;

    // Returns true if quest was completed
    return data;
  } catch (error) {
    console.error('Error updating quest progress:', error);
    return false;
  }
};

// ============================================
// XP OPERATIONS
// ============================================

/**
 * Get user's XP and level
 */
export const getUserXP = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("No user logged in");

    const snapshot = await fetchXpSummary(user.id);
    return {
      ep: snapshot.xp,
      level: snapshot.level,
      epSpent: snapshot.xpSpent,
    };
  } catch (error) {
    console.error("Error getting user XP:", error);
    return { ep: 0, level: 1, epSpent: 0 };
  }
};

// Keep getUserEP for backwards compatibility
export const getUserEP = getUserXP;

/**
 * Award XP to user (called when building scanned, quest completed, etc.)
 */
export const awardXP = async (amount, source = 'building_scan') => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user logged in');

    const { error } = await supabase
      .rpc('award_xp', {
        p_user_id: user.id,
        p_amount: amount
      });

    if (error) throw error;

    // Also update quest progress if this was from a scan
    if (source === 'building_scan') {
      const dailyQuest = await getActiveDailyQuest();
      if (dailyQuest && dailyQuest.quest_type === 'scan' && !dailyQuest.completed) {
        await updateQuestProgress('daily', 1);
      }

      const weeklyQuest = await getActiveWeeklyQuest();
      if (weeklyQuest && weeklyQuest.quest_type === 'scan' && !weeklyQuest.completed) {
        await updateQuestProgress('weekly', 1);
      }
    }

    return true;
  } catch (error) {
    console.error('Error awarding XP:', error);
    return false;
  }
};

// Keep awardEP for backwards compatibility
export const awardEP = awardXP;

/**
 * Calculate XP needed for next level
 * Formula: Level = floor(sqrt(XP / 100)) + 1
 * Reversed: XP for level N = ((N - 1) ^ 2) * 100
 */
export const getXPForNextLevel = (currentLevel) => {
  return Math.pow(currentLevel, 2) * 100;
};

// Keep old function name for backwards compatibility
// Keep getEPForNextLevel for backwards compatibility
export const getEPForNextLevel = getXPForNextLevel;

// ============================================
// STAMP & ACHIEVEMENT OPERATIONS
// ============================================

/**
 * Get user's stamps
 */
export const getUserStamps = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user logged in');

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('stamps')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    return profile.stamps || [];
  } catch (error) {
    console.error('Error getting user stamps:', error);
    return [];
  }
};

/**
 * Get user's achievements
 */
export const getUserAchievements = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user logged in');

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('achievements')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    return profile.achievements || [];
  } catch (error) {
    console.error('Error getting user achievements:', error);
    return [];
  }
};

/**
 * Add stamp to user (called manually, or automatically via quest completion)
 */
export const addStamp = async (stampName) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user logged in');

    const { error } = await supabase
      .rpc('add_stamp', {
        p_user_id: user.id,
        p_stamp_name: stampName
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error adding stamp:', error);
    return false;
  }
};

/**
 * Add achievement to user
 */
export const addAchievement = async (achievementName) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user logged in');

    const { error } = await supabase
      .rpc('add_achievement', {
        p_user_id: user.id,
        p_achievement_name: achievementName
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error adding achievement:', error);
    return false;
  }
};
