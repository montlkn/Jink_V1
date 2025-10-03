import { supabase } from '../api/supabaseClient';

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user logged in');

    // Get user's profile to see their assigned daily quest
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('daily_quest_id, daily_quest_progress, daily_quest_completed')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    // If no quest assigned or completed, get a new one
    if (!profile.daily_quest_id || profile.daily_quest_completed) {
      const { data: newQuest } = await supabase
        .from('quests')
        .select('*')
        .eq('type', 'daily')
        .gte('active_until', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (newQuest) {
        // Assign new quest to user
        await supabase
          .from('profiles')
          .update({
            daily_quest_id: newQuest.id,
            daily_quest_progress: 0,
            daily_quest_completed: false
          })
          .eq('id', user.id);

        return {
          ...newQuest,
          progress: 0,
          completed: false
        };
      }
    }

    // Return existing quest
    if (profile.daily_quest_id) {
      const { data: quest } = await supabase
        .from('quests')
        .select('*')
        .eq('id', profile.daily_quest_id)
        .single();

      return {
        ...quest,
        progress: profile.daily_quest_progress,
        completed: profile.daily_quest_completed
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting daily quest:', error);
    return null;
  }
};

/**
 * Get active weekly quest for current user
 */
export const getActiveWeeklyQuest = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user logged in');

    // Get user's profile to see their assigned weekly quest
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('weekly_quest_id, weekly_quest_progress, weekly_quest_completed')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    // If no quest assigned or completed, get a new one
    if (!profile.weekly_quest_id || profile.weekly_quest_completed) {
      const { data: newQuest } = await supabase
        .from('quests')
        .select('*')
        .eq('type', 'weekly')
        .gte('active_until', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (newQuest) {
        // Assign new quest to user
        await supabase
          .from('profiles')
          .update({
            weekly_quest_id: newQuest.id,
            weekly_quest_progress: 0,
            weekly_quest_completed: false
          })
          .eq('id', user.id);

        return {
          ...newQuest,
          progress: 0,
          completed: false
        };
      }
    }

    // Return existing quest
    if (profile.weekly_quest_id) {
      const { data: quest } = await supabase
        .from('quests')
        .select('*')
        .eq('id', profile.weekly_quest_id)
        .single();

      return {
        ...quest,
        progress: profile.weekly_quest_progress,
        completed: profile.weekly_quest_completed
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting weekly quest:', error);
    return null;
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user logged in');

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('xp, level, xp_spent')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    return {
      xp: profile.xp || 0,
      level: profile.level || 1,
      xpSpent: profile.xp_spent || 0
    };
  } catch (error) {
    console.error('Error getting user XP:', error);
    return { xp: 0, level: 1, xpSpent: 0 };
  }
};

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

/**
 * Calculate XP needed for next level
 * Formula: Level = floor(sqrt(XP / 100)) + 1
 * Reversed: XP for level N = ((N - 1) ^ 2) * 100
 */
export const getXPForNextLevel = (currentLevel) => {
  return Math.pow(currentLevel, 2) * 100;
};

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
