-- =========================================================
-- EXPANDED ACHIEVEMENTS - 30+ Achievements
-- Replaces the original 17 with a more comprehensive set
-- =========================================================

-- Clear existing achievements
TRUNCATE TABLE achievements_def CASCADE;

-- Insert 30+ achievements based on docs/elements/achievements.md
INSERT INTO achievements_def (slug, title, description, xp_reward, stamp_slug, condition_type, condition_value, is_secret, is_missable) VALUES

-- ========== SCAN MILESTONES (6) ==========
('first_scan', 'First Scan', 'Scan your first building', 25, 'explorer', 'scan_count', '{"min": 1}', false, false),
('early_explorer', 'Early Explorer', 'Scan 10 buildings', 100, 'curious', 'scan_count', '{"min": 10}', false, false),
('dedicated_scanner', 'Dedicated Scanner', 'Scan 50 buildings', 250, 'dedicated', 'scan_count', '{"min": 50}', false, false),
('100_scans', '100 Unique Scans', 'Scan 100 unique buildings', 500, 'power_user', 'scan_count', '{"min": 100}', false, false),
('power_scanner', 'Power Scanner', 'Scan 250 buildings', 1000, 'power_scanner', 'scan_count', '{"min": 250}', false, false),
('legend', 'Legend', 'Scan 500 buildings', 2000, 'legend', 'scan_count', '{"min": 500}', true, false),

-- ========== STREAK MILESTONES (5) ==========
('streak_starter', 'Streak Starter', 'Maintain a 3-day streak', 100, 'consistent', 'daily_streak', '{"min": 3}', false, false),
('weekly_warrior', 'Weekly Warrior', 'Maintain a 7-day streak', 200, 'weekly_warrior', 'daily_streak', '{"min": 7}', false, false),
('dedicated_explorer', 'Dedicated Explorer', 'Maintain a 30-day streak', 1000, 'dedicated_explorer', 'daily_streak', '{"min": 30}', false, false),
('monthly_master', 'Monthly Master', 'Maintain a 60-day streak', 2500, 'monthly_master', 'daily_streak', '{"min": 60}', false, false),
('centurion', 'Centurion', 'Maintain a 100-day streak', 5000, 'centurion', 'daily_streak', '{"min": 100}', true, false),

-- ========== QUEST ACHIEVEMENTS (4) ==========
('quest_beginner', 'Quest Beginner', 'Complete your first quest', 100, 'quester', 'quests_completed', '{"min": 1}', false, false),
('quest_regular', 'Quest Regular', 'Complete 10 quests', 300, 'quest_hunter', 'quests_completed', '{"min": 10}', false, false),
('quest_master', 'Quest Master', 'Complete 50 quests', 1500, 'quest_master', 'quests_completed', '{"min": 50}', false, false),
('perfect_week', 'Perfect Week', 'Complete both daily and weekly quests in the same week', 1200, 'perfectionist', 'perfect_week', '{}', true, true),

-- ========== TIME-BASED ACHIEVEMENTS (2) ==========
('dawn_scanner', 'Dawn Scanner', 'Complete a daily quest before 8:00 AM', 150, 'early_bird', 'dawn_completion', '{"hour": 8}', false, true),
('night_owl', 'Night Owl', 'Complete a daily quest after 10:00 PM', 150, 'night_owl', 'late_completion', '{"hour": 22}', false, true),

-- ========== NEIGHBORHOOD/GEOGRAPHY (3) ==========
('neighborhood_explorer', 'Neighborhood Explorer', 'Scan buildings in 5 different neighborhoods', 300, 'explorer', 'unique_neighborhoods', '{"min": 5}', false, false),
('borough_master', 'Borough Master', 'Scan buildings in all 5 NYC boroughs', 500, 'five_borough_explorer', 'unique_boroughs', '{"min": 5}', false, false),
('first_visa', 'First Visa', 'Earn your first neighborhood visa', 100, 'visa_holder', 'visas_earned', '{"min": 1}', false, false),

-- ========== ARCHITECTURAL STYLE ACHIEVEMENTS (5) ==========
-- These can be expanded for each style in your dataset
('art_deco_expert', 'Art Deco Expert', 'Scan 10 Art Deco buildings', 200, 'art_deco_master', 'style_explorer', '{"style": "Art Deco", "min": 10}', false, false),
('modernist_maven', 'Modernist Maven', 'Scan 10 Modernist buildings', 200, 'modernist_master', 'style_explorer', '{"style": "Modernist", "min": 10}', false, false),
('gothic_scholar', 'Gothic Scholar', 'Scan 10 Gothic Revival buildings', 200, 'gothic_master', 'style_explorer', '{"style": "Gothic Revival", "min": 10}', false, false),
('beaux_arts_buff', 'Beaux-Arts Buff', 'Scan 10 Beaux-Arts buildings', 200, 'beaux_arts_master', 'style_explorer', '{"style": "Beaux-Arts", "min": 10}', false, false),
('brutalist_believer', 'Brutalist Believer', 'Scan 10 Brutalist buildings', 200, 'brutalist_master', 'style_explorer', '{"style": "Brutalist", "min": 10}', false, false),

-- ========== CONTRIBUTION ACHIEVEMENTS (4) ==========
('photo_contributor', 'Photo Contributor', 'Submit 10 building photos', 200, 'photographer', 'photo_contributions', '{"min": 10}', false, false),
('data_pioneer', 'Data Pioneer', 'Submit 5 building corrections', 500, 'data_validator', 'building_contributions', '{"min": 5}', false, false),
('first_review', 'First Review', 'Submit your first building review', 50, 'reviewer', 'reviews_submitted', '{"min": 1}', false, false),
('reviewer_trust', 'Reviewer Trust', 'Have 5 reviews verified by moderation', 150, 'trusted_reviewer', 'reviews_verified', '{"min": 5}', false, false),

-- ========== SOCIAL ACHIEVEMENTS (3) ==========
('popular_reviewer', 'Popular Reviewer', 'Receive 100 upvotes across reviews', 500, 'popular', 'review_upvotes', '{"min": 100}', false, false),
('viral_starter', 'Viral Starter', 'Share a walk that a friend completes', 75, 'viral', 'shared_walk_completed', '{}', false, false),
('referrer', 'Referrer', 'Refer a friend who completes onboarding', 500, 'referrer', 'successful_referrals', '{"min": 1}', false, false),

-- ========== WALK/DERIVE ACHIEVEMENTS (3) ==========
('dedicated_traveler', 'Dedicated Traveler', 'Complete a walk of 90+ minutes', 200, 'traveler', 'walk_duration', '{"min": 90}', false, false),
('long_walker', 'Long Walker', 'Complete a walk of 120+ minutes', 300, 'long_walker', 'walk_duration', '{"min": 120}', false, false),
('creator_first_publish', 'First Published Walk', 'Publish your first public walk', 200, 'creator', 'walks_published', '{"min": 1}', false, false);

-- Update check_and_award_achievements to handle new achievement types
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
  v_visa_count INT;
  v_style_count INT;
  v_already_awarded BOOLEAN;
  v_condition_met BOOLEAN;
  v_required_style TEXT;
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
    SELECT COALESCE((SELECT COUNT(*) FROM user_quest_history WHERE user_id = p_user_id), 0)
    INTO v_quests_completed;
  END IF;

  IF p_trigger_type IN ('neighborhood', 'unique_neighborhoods') THEN
    SELECT COUNT(DISTINCT neighborhood) INTO v_unique_neighborhoods
    FROM quest_events WHERE user_id = p_user_id AND neighborhood IS NOT NULL;
  END IF;

  IF p_trigger_type IN ('borough', 'unique_boroughs') THEN
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

  IF p_trigger_type IN ('visa', 'visas_earned') THEN
    SELECT COUNT(*) INTO v_visa_count
    FROM user_visas WHERE user_id = p_user_id;
  END IF;

  -- Check all achievements
  FOR v_achievement IN SELECT * FROM achievements_def LOOP
    SELECT EXISTS(
      SELECT 1 FROM user_achievements
      WHERE user_id = p_user_id AND achievement_id = v_achievement.id
    ) INTO v_already_awarded;

    IF v_already_awarded THEN CONTINUE; END IF;

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

      WHEN 'visas_earned' THEN
        IF v_visa_count >= (v_achievement.condition_value->>'min')::INT THEN
          v_condition_met := TRUE;
        END IF;

      WHEN 'style_explorer' THEN
        -- Check if user has scanned enough buildings of specific style
        v_required_style := v_achievement.condition_value->>'style';
        SELECT COUNT(DISTINCT building_bbl) INTO v_style_count
        FROM quest_events
        WHERE user_id = p_user_id AND style = v_required_style;

        IF v_style_count >= (v_achievement.condition_value->>'min')::INT THEN
          v_condition_met := TRUE;
        END IF;

      WHEN 'perfect_week' THEN
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

      -- Award stamp
      IF v_achievement.stamp_slug IS NOT NULL THEN
        DECLARE v_stamp_id UUID;
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
        BEGIN
          PERFORM award_xp(p_user_id, v_achievement.xp_reward, 'achievement_unlock');
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'awarded_count', array_length(v_awarded_achievements, 1),
    'achievement_ids', to_jsonb(v_awarded_achievements)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify
SELECT 'Created ' || COUNT(*) || ' achievements' FROM achievements_def;
