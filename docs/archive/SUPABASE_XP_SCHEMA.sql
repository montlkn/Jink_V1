-- XP & Quests System Schema for Supabase
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. Add XP and Quest fields to profiles table
-- ============================================
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS xp_spent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_quest_id UUID,
ADD COLUMN IF NOT EXISTS daily_quest_progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_quest_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS weekly_quest_id UUID,
ADD COLUMN IF NOT EXISTS weekly_quest_progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS weekly_quest_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stamps TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS achievements TEXT[] DEFAULT '{}';

-- Add index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_xp ON profiles(xp DESC);

-- ============================================
-- 2. Quests Table (quest definitions)
-- ============================================
CREATE TABLE IF NOT EXISTS quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- 'daily' or 'weekly'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  quest_type TEXT NOT NULL, -- 'scan' or 'walk'
  target_count INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL,
  rewards JSONB DEFAULT '{"stamps": [], "achievements": []}'::jsonb,
  active_from TIMESTAMP WITH TIME ZONE NOT NULL,
  active_until TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for active quests
CREATE INDEX IF NOT EXISTS idx_quests_active ON quests(type, active_from, active_until);

-- Enable RLS
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;

-- Anyone can view active quests
CREATE POLICY "Anyone can view active quests" ON quests
  FOR SELECT USING (NOW() BETWEEN active_from AND active_until);

-- ============================================
-- 3. Functions
-- ============================================

-- Function to calculate level from XP
-- Simple formula: Level = floor(sqrt(XP / 100)) + 1
-- Level 1 = 0 XP, Level 2 = 100 XP, Level 3 = 400 XP, Level 5 = 1600 XP, Level 10 = 8100 XP
CREATE OR REPLACE FUNCTION calculate_level(xp_amount INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN FLOOR(SQRT(xp_amount::FLOAT / 100)) + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to award XP
CREATE OR REPLACE FUNCTION award_xp(p_user_id UUID, p_amount INTEGER)
RETURNS void AS $$
DECLARE
  v_new_xp INTEGER;
  v_new_level INTEGER;
BEGIN
  -- Update user XP
  UPDATE profiles
  SET xp = xp + p_amount
  WHERE id = p_user_id
  RETURNING xp INTO v_new_xp;

  -- Calculate and update level
  v_new_level := calculate_level(v_new_xp);

  UPDATE profiles
  SET level = v_new_level
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to add stamp to user
CREATE OR REPLACE FUNCTION add_stamp(p_user_id UUID, p_stamp_name TEXT)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET stamps = array_append(stamps, p_stamp_name)
  WHERE id = p_user_id
  AND NOT (p_stamp_name = ANY(stamps)); -- Don't add duplicates
END;
$$ LANGUAGE plpgsql;

-- Function to add achievement to user
CREATE OR REPLACE FUNCTION add_achievement(p_user_id UUID, p_achievement_name TEXT)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET achievements = array_append(achievements, p_achievement_name)
  WHERE id = p_user_id
  AND NOT (p_achievement_name = ANY(achievements)); -- Don't add duplicates
END;
$$ LANGUAGE plpgsql;

-- Function to update quest progress
CREATE OR REPLACE FUNCTION update_quest_progress(
  p_user_id UUID,
  p_quest_type TEXT, -- 'daily' or 'weekly'
  p_progress_increment INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_quest_id UUID;
  v_target INTEGER;
  v_current_progress INTEGER;
  v_xp_reward INTEGER;
  v_rewards JSONB;
  v_completed BOOLEAN;
  v_stamp TEXT;
  v_achievement TEXT;
BEGIN
  -- Get current progress based on quest type
  IF p_quest_type = 'daily' THEN
    SELECT daily_quest_id, daily_quest_progress, daily_quest_completed
    INTO v_quest_id, v_current_progress, v_completed
    FROM profiles WHERE id = p_user_id;
  ELSE
    SELECT weekly_quest_id, weekly_quest_progress, weekly_quest_completed
    INTO v_quest_id, v_current_progress, v_completed
    FROM profiles WHERE id = p_user_id;
  END IF;

  -- If already completed, do nothing
  IF v_completed THEN
    RETURN FALSE;
  END IF;

  -- Get quest details
  SELECT target_count, xp_reward, rewards
  INTO v_target, v_xp_reward, v_rewards
  FROM quests WHERE id = v_quest_id;

  -- Update progress
  v_current_progress := v_current_progress + p_progress_increment;

  -- Check if completed
  IF v_current_progress >= v_target THEN
    v_completed := TRUE;

    -- Award XP
    PERFORM award_xp(p_user_id, v_xp_reward);

    -- Award stamps
    FOR v_stamp IN SELECT jsonb_array_elements_text(v_rewards->'stamps')
    LOOP
      PERFORM add_stamp(p_user_id, v_stamp);
    END LOOP;

    -- Award achievements
    FOR v_achievement IN SELECT jsonb_array_elements_text(v_rewards->'achievements')
    LOOP
      PERFORM add_achievement(p_user_id, v_achievement);
    END LOOP;
  END IF;

  -- Update profile
  IF p_quest_type = 'daily' THEN
    UPDATE profiles
    SET daily_quest_progress = v_current_progress,
        daily_quest_completed = v_completed
    WHERE id = p_user_id;
  ELSE
    UPDATE profiles
    SET weekly_quest_progress = v_current_progress,
        weekly_quest_completed = v_completed
    WHERE id = p_user_id;
  END IF;

  RETURN v_completed;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. Sample Data (for testing)
-- ============================================

-- Insert sample daily quest
INSERT INTO quests (type, title, description, quest_type, target_count, xp_reward, rewards, active_from, active_until)
VALUES (
  'daily',
  'Discover the Flatiron District',
  'Visit and photograph 3 iconic buildings in the Flatiron neighborhood',
  'scan',
  3,
  250,
  '{"stamps": ["Flatiron Quest Stamp"], "achievements": []}'::jsonb,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 day'
);

-- Insert sample weekly quest
INSERT INTO quests (type, title, description, quest_type, target_count, xp_reward, rewards, active_from, active_until)
VALUES (
  'weekly',
  'Master of NYC Architecture',
  'Complete 5 architectural walks across different neighborhoods',
  'walk',
  5,
  1000,
  '{"stamps": ["NYC Explorer Stamp"], "achievements": ["Architecture Master"]}'::jsonb,
  DATE_TRUNC('week', CURRENT_DATE),
  DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
);
