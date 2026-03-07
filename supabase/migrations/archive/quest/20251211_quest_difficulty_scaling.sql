-- Migration: Add difficulty scaling to quest generation
-- Purpose: Make quests harder as users level up
-- Date: 2024-12-11

CREATE OR REPLACE FUNCTION generate_quest_for_user(
  p_user_id UUID,
  p_quest_type TEXT  -- 'daily' or 'weekly'
) RETURNS UUID AS $$
DECLARE
  v_template RECORD;
  v_quest_id UUID;
  v_count INT;
  v_style TEXT;
  v_title TEXT;
  v_description TEXT;
  v_xp_reward INT;
  v_styles TEXT[] := ARRAY['Art Deco', 'Beaux-Arts', 'Gothic Revival', 'Modernist', 'Brutalist', 'Renaissance', 'Victorian', 'Federal', 'Greek Revival', 'Romanesque'];
  v_user_archetypes JSONB;
  v_preferred_category TEXT;
  v_cooldown_days INT;
  v_user_level INT := 1;
  v_level_multiplier DECIMAL := 1.0;
BEGIN
  -- Get cooldown period
  v_cooldown_days := CASE WHEN p_quest_type = 'daily' THEN 7 ELSE 14 END;

  -- Get user level for difficulty scaling
  SELECT current_level INTO v_user_level FROM profiles WHERE id = p_user_id;
  v_user_level := COALESCE(v_user_level, 1);

  -- Scale difficulty based on level tiers (1-10: 1x, 11-20: 1.2x, 21-30: 1.5x, 31-50: 2x)
  v_level_multiplier := CASE
    WHEN v_user_level >= 31 THEN 2.0
    WHEN v_user_level >= 21 THEN 1.5
    WHEN v_user_level >= 11 THEN 1.2
    ELSE 1.0
  END;

  -- Try to get user's aesthetic profile for personalization
  BEGIN
    SELECT aesthetic_scores INTO v_user_archetypes
    FROM user_aesthetic_profiles
    WHERE user_id = p_user_id;
  EXCEPTION WHEN OTHERS THEN
    v_user_archetypes := NULL;
  END;

  -- Determine preferred category based on user behavior (simplified)
  v_preferred_category := (
    SELECT category FROM quest_templates
    WHERE type = p_quest_type
    ORDER BY RANDOM()
    LIMIT 1
  );

  -- Select a template with weighted randomness, respecting cooldowns
  SELECT * INTO v_template
  FROM quest_templates qt
  WHERE qt.type = p_quest_type
    AND qt.id NOT IN (
      SELECT template_id FROM user_quest_history
      WHERE user_id = p_user_id
        AND assigned_at > NOW() - (v_cooldown_days || ' days')::INTERVAL
    )
  ORDER BY
    CASE WHEN qt.category = v_preferred_category THEN qt.weight * 1.5 ELSE qt.weight END * RANDOM() DESC
  LIMIT 1;

  -- If no template available (all on cooldown), pick any random one
  IF v_template IS NULL THEN
    SELECT * INTO v_template
    FROM quest_templates
    WHERE type = p_quest_type
    ORDER BY RANDOM()
    LIMIT 1;
  END IF;

  IF v_template IS NULL THEN
    RETURN NULL;
  END IF;

  -- Generate random values WITH LEVEL SCALING
  v_count := CEIL((floor(random() * (v_template.target_max - v_template.target_min + 1) + v_template.target_min)::INT) * v_level_multiplier);
  v_style := v_styles[floor(random() * array_length(v_styles, 1) + 1)::INT];
  v_xp_reward := CEIL((floor(random() * (v_template.xp_reward_max - v_template.xp_reward_min + 1) + v_template.xp_reward_min)::INT) * v_level_multiplier);

  -- Fill in template placeholders
  v_title := REPLACE(REPLACE(v_template.title_template, '{count}', v_count::TEXT), '{style}', v_style);
  v_description := REPLACE(REPLACE(v_template.description_template, '{count}', v_count::TEXT), '{style}', v_style);

  -- Insert into quests table
  INSERT INTO quests (
    type, title, description, quest_type, target_count, xp_reward,
    rewards, verification, metadata, active_from, active_until
  ) VALUES (
    p_quest_type,
    v_title,
    v_description,
    v_template.category,
    v_count,
    v_xp_reward,
    '{"stamps": [], "achievements": []}'::jsonb,
    jsonb_build_object('method', v_template.verification_method, 'style', v_style),
    jsonb_build_object('template_id', v_template.id, 'style', v_style, 'category', v_template.category, 'level_multiplier', v_level_multiplier),
    NOW(),
    CASE WHEN p_quest_type = 'daily' THEN NOW() + INTERVAL '24 hours' ELSE NOW() + INTERVAL '7 days' END
  )
  RETURNING id INTO v_quest_id;

  -- Record in history for cooldown tracking
  INSERT INTO user_quest_history (user_id, template_id)
  VALUES (p_user_id, v_template.id);

  RETURN v_quest_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_quest_for_user IS 'Generate personalized quest with difficulty scaling: 1x (levels 1-10), 1.2x (11-20), 1.5x (21-30), 2x (31-50)';
