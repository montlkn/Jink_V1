-- =========================================================
-- STAMPS & ACHIEVEMENTS SYSTEM
-- Creates tables, definitions, and checking logic
-- =========================================================

-- Step 1: Create stamp definitions table
CREATE TABLE IF NOT EXISTS stamps_def (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  artwork TEXT,
  series TEXT CHECK (series IN ('building', 'quest', 'achievement', 'neighborhood')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stamps_def_series ON stamps_def(series);
CREATE INDEX IF NOT EXISTS idx_stamps_def_rarity ON stamps_def(rarity);

-- Step 2: Create user stamps collection table
CREATE TABLE IF NOT EXISTS user_stamps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stamp_id UUID NOT NULL REFERENCES stamps_def(id) ON DELETE CASCADE,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  source_type TEXT CHECK (source_type IN ('building_scan', 'quest_completion', 'achievement_unlock', 'manual')),
  source_id TEXT,
  serial_number INT,
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, stamp_id)
);

CREATE INDEX IF NOT EXISTS idx_user_stamps_user ON user_stamps(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stamps_stamp ON user_stamps(stamp_id);
CREATE INDEX IF NOT EXISTS idx_user_stamps_rarity ON user_stamps(user_id, stamp_id);

ALTER TABLE user_stamps ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_stamps' AND policyname = 'user_stamps_policy') THEN
    CREATE POLICY user_stamps_policy ON user_stamps FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Step 3: Create achievement definitions table (17 hardcoded achievements)
CREATE TABLE IF NOT EXISTS achievements_def (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  xp_reward INT DEFAULT 0,
  stamp_slug TEXT,
  condition_type TEXT NOT NULL,
  condition_value JSONB NOT NULL,
  is_secret BOOLEAN DEFAULT FALSE,
  is_missable BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_achievements_def_slug ON achievements_def(slug);

-- Step 4: Create user achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements_def(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON user_achievements(achievement_id);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_achievements' AND policyname = 'user_achievements_policy') THEN
    CREATE POLICY user_achievements_policy ON user_achievements FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Step 5: Insert the 17 hardcoded achievements
INSERT INTO achievements_def (slug, title, description, xp_reward, stamp_slug, condition_type, condition_value, is_secret) VALUES

-- Scan-based achievements
('first_scan', 'First Steps', 'Scan your first building', 50, 'explorer', 'scan_count', '{"min": 1}', false),
('early_explorer', 'Early Explorer', 'Scan 10 buildings', 100, 'curious', 'scan_count', '{"min": 10}', false),
('dedicated_scanner', 'Dedicated Scanner', 'Scan 50 buildings', 250, 'dedicated', 'scan_count', '{"min": 50}', false),
('power_scanner', 'Power Scanner', 'Scan 100 buildings', 500, 'power_user', 'scan_count', '{"min": 100}', false),
('legend', 'Legend', 'Scan 500 buildings', 2000, 'legend', 'scan_count', '{"min": 500}', false),

-- Streak-based achievements
('streak_starter', 'Streak Starter', 'Maintain a 3-day streak', 100, 'consistent', 'daily_streak', '{"min": 3}', false),
('weekly_warrior', 'Weekly Warrior', 'Maintain a 7-day streak', 200, 'weekly_warrior', 'daily_streak', '{"min": 7}', false),
('monthly_master', 'Monthly Master', 'Maintain a 30-day streak', 1000, 'monthly_master', 'daily_streak', '{"min": 30}', false),
('centurion', 'Centurion', 'Maintain a 100-day streak', 5000, 'centurion', 'daily_streak', '{"min": 100}', true),

-- Quest-based achievements
('quest_beginner', 'Quest Beginner', 'Complete your first quest', 100, 'quester', 'quests_completed', '{"min": 1}', false),
('quest_regular', 'Quest Regular', 'Complete 10 quests', 300, 'quest_hunter', 'quests_completed', '{"min": 10}', false),
('quest_master', 'Quest Master', 'Complete 50 quests', 1500, 'quest_master', 'quests_completed', '{"min": 50}', false),

-- Neighborhood-based achievements
('neighborhood_explorer', 'Neighborhood Explorer', 'Scan buildings in 5 different neighborhoods', 300, 'explorer', 'unique_neighborhoods', '{"min": 5}', false),
('borough_master', 'Borough Master', 'Scan buildings in all 5 NYC boroughs', 500, 'five_borough_explorer', 'unique_boroughs', '{"min": 5}', false),

-- Contribution-based achievements
('photo_contributor', 'Photo Contributor', 'Submit 10 building photos', 200, 'photographer', 'photo_contributions', '{"min": 10}', false),
('data_pioneer', 'Data Pioneer', 'Submit 5 building corrections', 500, 'data_validator', 'building_contributions', '{"min": 5}', false),

-- Special achievement
('perfect_week', 'Perfect Week', 'Complete both daily and weekly quests in the same week', 1000, 'perfectionist', 'perfect_week', '{}', true);

-- Step 6: Create achievement checking RPC
CREATE OR REPLACE FUNCTION check_and_award_achievements(
  p_user_id UUID,
  p_trigger_type TEXT,
  p_metadata JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
  v_achievement RECORD;
  v_awarded_achievements UUID[] := ARRAY[]::UUID[];
  v_scan_count INT;
  v_streak_count INT;
  v_quests_completed INT;
  v_unique_neighborhoods INT;
  v_unique_boroughs INT;
  v_photo_count INT;
  v_contribution_count INT;
  v_already_awarded BOOLEAN;
  v_condition_met BOOLEAN;
BEGIN
  -- Fetch user stats based on trigger type
  IF p_trigger_type IN ('scan', 'scan_count') THEN
    SELECT COUNT(DISTINCT building_bbl) INTO v_scan_count
    FROM quest_events WHERE user_id = p_user_id AND event_type = 'scan';
  END IF;

  IF p_trigger_type IN ('streak', 'daily_streak') THEN
    SELECT daily_streak_count INTO v_streak_count
    FROM profiles WHERE id = p_user_id;
  END IF;

  IF p_trigger_type IN ('quest', 'quests_completed') THEN
    -- Count completed quests from profile history
    SELECT
      COALESCE((SELECT COUNT(*) FROM user_quest_history WHERE user_id = p_user_id), 0)
    INTO v_quests_completed;
  END IF;

  IF p_trigger_type IN ('neighborhood', 'unique_neighborhoods') THEN
    SELECT COUNT(DISTINCT neighborhood) INTO v_unique_neighborhoods
    FROM quest_events WHERE user_id = p_user_id AND neighborhood IS NOT NULL;
  END IF;

  IF p_trigger_type IN ('borough', 'unique_boroughs') THEN
    -- Get unique boroughs from metadata or quest events
    SELECT COUNT(DISTINCT metadata->>'borough') INTO v_unique_boroughs
    FROM quest_events WHERE user_id = p_user_id AND metadata->>'borough' IS NOT NULL;
  END IF;

  IF p_trigger_type IN ('photo', 'photo_contributions') THEN
    SELECT COUNT(*) INTO v_photo_count
    FROM quest_events WHERE user_id = p_user_id AND event_type = 'photo';
  END IF;

  IF p_trigger_type IN ('contribution', 'building_contributions') THEN
    SELECT COUNT(*) INTO v_contribution_count
    FROM quest_events WHERE user_id = p_user_id AND event_type = 'contribution';
  END IF;

  -- Check all achievements
  FOR v_achievement IN SELECT * FROM achievements_def LOOP
    -- Check if already awarded
    SELECT EXISTS(
      SELECT 1 FROM user_achievements
      WHERE user_id = p_user_id AND achievement_id = v_achievement.id
    ) INTO v_already_awarded;

    IF v_already_awarded THEN
      CONTINUE;
    END IF;

    -- Check condition
    v_condition_met := FALSE;

    CASE v_achievement.condition_type
      WHEN 'scan_count' THEN
        IF v_scan_count >= (v_achievement.condition_value->>'min')::INT THEN
          v_condition_met := TRUE;
        END IF;

      WHEN 'daily_streak' THEN
        IF v_streak_count >= (v_achievement.condition_value->>'min')::INT THEN
          v_condition_met := TRUE;
        END IF;

      WHEN 'quests_completed' THEN
        IF v_quests_completed >= (v_achievement.condition_value->>'min')::INT THEN
          v_condition_met := TRUE;
        END IF;

      WHEN 'unique_neighborhoods' THEN
        IF v_unique_neighborhoods >= (v_achievement.condition_value->>'min')::INT THEN
          v_condition_met := TRUE;
        END IF;

      WHEN 'unique_boroughs' THEN
        IF v_unique_boroughs >= (v_achievement.condition_value->>'min')::INT THEN
          v_condition_met := TRUE;
        END IF;

      WHEN 'photo_contributions' THEN
        IF v_photo_count >= (v_achievement.condition_value->>'min')::INT THEN
          v_condition_met := TRUE;
        END IF;

      WHEN 'building_contributions' THEN
        IF v_contribution_count >= (v_achievement.condition_value->>'min')::INT THEN
          v_condition_met := TRUE;
        END IF;

      WHEN 'perfect_week' THEN
        -- Special check: both daily and weekly quests completed in same week
        -- Simplified: check if metadata indicates both completed
        IF p_metadata->>'daily_completed' = 'true' AND p_metadata->>'weekly_completed' = 'true' THEN
          v_condition_met := TRUE;
        END IF;

      ELSE
        v_condition_met := FALSE;
    END CASE;

    -- Award achievement if condition met
    IF v_condition_met THEN
      INSERT INTO user_achievements (user_id, achievement_id, metadata)
      VALUES (p_user_id, v_achievement.id, p_metadata)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;

      v_awarded_achievements := array_append(v_awarded_achievements, v_achievement.id);

      -- Award associated stamp if specified
      IF v_achievement.stamp_slug IS NOT NULL THEN
        DECLARE
          v_stamp_id UUID;
        BEGIN
          SELECT id INTO v_stamp_id FROM stamps_def WHERE slug = v_achievement.stamp_slug;
          IF v_stamp_id IS NOT NULL THEN
            INSERT INTO user_stamps (user_id, stamp_id, source_type, source_id)
            VALUES (p_user_id, v_stamp_id, 'achievement_unlock', v_achievement.id::TEXT)
            ON CONFLICT (user_id, stamp_id) DO NOTHING;
          END IF;
        END;
      END IF;

      -- Award XP
      IF v_achievement.xp_reward > 0 THEN
        -- Call award_xp RPC if it exists
        BEGIN
          PERFORM award_xp(p_user_id, v_achievement.xp_reward, 'achievement_unlock');
        EXCEPTION WHEN OTHERS THEN
          NULL; -- Silently fail if award_xp doesn't exist
        END;
      END IF;
    END IF;
  END LOOP;

  -- Return newly awarded achievements
  RETURN jsonb_build_object(
    'awarded_count', array_length(v_awarded_achievements, 1),
    'achievement_ids', to_jsonb(v_awarded_achievements)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE stamps_def IS 'Stamp definitions with rarity tiers';
COMMENT ON TABLE achievements_def IS '17 hardcoded achievements for progression milestones';
COMMENT ON FUNCTION check_and_award_achievements IS 'Check and award achievements based on trigger type';

-- Verify
SELECT 'Created ' || COUNT(*) || ' achievements' FROM achievements_def;
