-- Fix achievements and XP to count from scans.confirmed_bbl
-- The DB column is confirmed_bbl (backend maps confirmed_bin form field to this column)

-- 1. award_xp base function
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT DEFAULT 'scan'
) RETURNS void AS $$
BEGIN
  INSERT INTO xp_transactions (user_id, amount, reason, source_type, event_uuid)
  VALUES (p_user_id, p_amount, p_reason, p_reason, gen_random_uuid());

  UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + p_amount WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Award XP only if building not previously scanned
DROP FUNCTION IF EXISTS award_scan_xp(UUID, TEXT, INT);
CREATE OR REPLACE FUNCTION award_scan_xp(
  p_user_id UUID,
  p_building_id TEXT,
  p_amount INT DEFAULT 50
) RETURNS BOOLEAN AS $$
DECLARE
  v_already_scanned BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM scans
    WHERE user_id = p_user_id
      AND confirmed_bbl = p_building_id
      AND created_at < NOW() - INTERVAL '10 seconds'
  ) INTO v_already_scanned;

  IF v_already_scanned THEN
    RETURN FALSE;
  END IF;

  PERFORM award_xp(p_user_id, p_amount, 'scan');
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix check_and_award_achievements to count from scans.confirmed_bbl
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
  v_already_awarded BOOLEAN;
  v_condition_met BOOLEAN;
BEGIN
  -- Count unique confirmed scans
  IF p_trigger_type IN ('scan', 'scan_count') THEN
    SELECT COUNT(DISTINCT confirmed_bbl) INTO v_scan_count
    FROM scans WHERE user_id = p_user_id AND confirmed_bbl IS NOT NULL;
  END IF;

  IF p_trigger_type IN ('streak', 'daily_streak') THEN
    SELECT daily_streak_count INTO v_streak_count
    FROM profiles WHERE id = p_user_id;
  END IF;

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
      ELSE
        v_condition_met := FALSE;
    END CASE;

    IF v_condition_met THEN
      INSERT INTO user_achievements (user_id, achievement_id, metadata)
      VALUES (p_user_id, v_achievement.id, p_metadata)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;

      v_awarded_achievements := array_append(v_awarded_achievements, v_achievement.id);

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
