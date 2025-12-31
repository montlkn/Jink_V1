-- =========================================================
-- QUEST TEMPLATES SYSTEM - Full Implementation
-- Creates quest_templates table + generation function with personalization
-- =========================================================

-- Step 1: Create quest_templates table
CREATE TABLE IF NOT EXISTS quest_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly')),
  category TEXT NOT NULL CHECK (category IN ('scan', 'walk', 'style', 'neighborhood', 'find')),
  title_template TEXT NOT NULL,
  description_template TEXT NOT NULL,
  target_min INT NOT NULL DEFAULT 1,
  target_max INT NOT NULL DEFAULT 5,
  xp_reward_min INT NOT NULL DEFAULT 30,
  xp_reward_max INT NOT NULL DEFAULT 100,
  cooldown_days INT NOT NULL DEFAULT 7,
  weight INT NOT NULL DEFAULT 1,
  verification_method TEXT DEFAULT 'scan_count',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quest_templates_type ON quest_templates(type);
CREATE INDEX IF NOT EXISTS idx_quest_templates_category ON quest_templates(category);

-- Step 2: Insert all 50 quest templates
INSERT INTO quest_templates (type, category, title_template, description_template, target_min, target_max, xp_reward_min, xp_reward_max, cooldown_days, weight, verification_method) VALUES

-- =========================
-- DAILY — SCAN (5)
-- =========================
('daily', 'scan', 'Scan {count} {style} façades', 'Capture the textures and patterns of {style} buildings nearby', 2, 4, 40, 80, 7, 2, 'style_match'),
('daily', 'scan', 'Record {count} {style} doorways', 'Every doorway tells a story—discover {style} entrances', 3, 5, 50, 90, 7, 2, 'style_match'),
('daily', 'scan', 'Scan {count} buildings over 5 stories tall', 'Observe the vertical rhythm of your surroundings', 3, 6, 60, 100, 7, 2, 'scan_count'),
('daily', 'scan', 'Document {count} {style} details', 'Zoom in on the ornaments and curves of {style} design', 2, 3, 40, 70, 7, 2, 'style_match'),
('daily', 'scan', 'Capture {count} street corners with strong geometry', 'Trace the city''s form through its intersections', 3, 5, 50, 80, 7, 2, 'scan_count'),

-- =========================
-- DAILY — WALK (5)
-- =========================
('daily', 'walk', 'Walk {count} blocks today', 'Stretch your legs and map your micro-routes', 5, 10, 30, 60, 7, 1, 'walk_distance'),
('daily', 'walk', 'Circle around {count} city squares', 'Rediscover public space through walking loops', 2, 4, 40, 70, 7, 1, 'walk_distance'),
('daily', 'walk', 'Walk along one continuous avenue for {count} blocks', 'Follow a single street''s architectural evolution', 4, 8, 40, 70, 7, 1, 'walk_distance'),
('daily', 'walk', 'Cross {count} bridges', 'Feel the city''s topology underfoot', 1, 3, 40, 80, 7, 1, 'gps_checkpoint'),
('daily', 'walk', 'Walk past {count} murals or graffiti walls', 'Find art woven into your everyday routes', 3, 6, 50, 80, 7, 1, 'scan_count'),

-- =========================
-- DAILY — STYLE (5)
-- =========================
('daily', 'style', 'Photograph {count} {style} details', 'Seek out the motifs of {style} craftsmanship', 3, 5, 60, 100, 7, 2, 'style_match'),
('daily', 'style', 'Find {count} {style} roofs', 'Trace the skyline for {style} silhouettes', 2, 4, 50, 80, 7, 2, 'style_match'),
('daily', 'style', 'Spot {count} {style} arches', 'Every curve reveals design heritage', 3, 5, 60, 90, 7, 2, 'style_match'),
('daily', 'style', 'Capture {count} color palettes inspired by {style}', 'Notice hues and tones defining this aesthetic', 2, 3, 50, 90, 7, 2, 'style_match'),
('daily', 'style', 'Scan {count} {style} building entrances', 'Uncover how {style} greets the street', 3, 5, 60, 100, 7, 2, 'style_match'),

-- =========================
-- DAILY — NEIGHBORHOOD (5)
-- =========================
('daily', 'neighborhood', 'Visit {count} different neighborhoods', 'Expand your map of the city', 2, 3, 80, 150, 7, 2, 'unique_neighborhoods'),
('daily', 'neighborhood', 'Capture {count} neighborhood signs', 'Each sign marks identity', 3, 5, 50, 90, 7, 1, 'scan_count'),
('daily', 'neighborhood', 'Walk {count} blocks within a new area', 'Experience the unfamiliar', 4, 8, 60, 100, 7, 1, 'walk_distance'),
('daily', 'neighborhood', 'Talk to someone about the area''s history', 'Gather living knowledge of place', 1, 1, 100, 150, 7, 1, 'manual_confirm'),
('daily', 'neighborhood', 'Find {count} local cafes or corners that define a vibe', 'Explore what gives each neighborhood character', 2, 4, 60, 120, 7, 1, 'scan_count'),

-- =========================
-- DAILY — FIND (5)
-- =========================
('daily', 'find', 'Find {count} hidden architectural symbols', 'Look closely for emblems, crests, or carvings', 2, 4, 70, 110, 7, 1, 'scan_count'),
('daily', 'find', 'Locate {count} spots with reflection symmetry', 'Discover the city''s mirrored patterns', 2, 3, 60, 100, 7, 1, 'scan_count'),
('daily', 'find', 'Capture {count} building names engraved in stone', 'Search façades for lettering relics', 2, 4, 70, 120, 7, 1, 'scan_count'),
('daily', 'find', 'Discover {count} unique door knockers or handles', 'Details that time forgot', 3, 5, 80, 120, 7, 1, 'photo_count'),
('daily', 'find', 'Spot {count} public art pieces or sculptures', 'Add culture to your route', 3, 6, 60, 100, 7, 1, 'scan_count'),

-- =========================
-- WEEKLY — SCAN (5)
-- =========================
('weekly', 'scan', 'Scan {count} buildings in a single neighborhood', 'Deep dive into one area''s identity', 10, 15, 150, 250, 14, 3, 'neighborhood_focus'),
('weekly', 'scan', 'Document {count} examples of {style}', 'Build a mini-archive of {style} design', 8, 12, 200, 300, 14, 3, 'style_match'),
('weekly', 'scan', 'Create a collage from {count} building scans', 'Compose a visual story of the week', 5, 10, 150, 250, 14, 3, 'scan_count'),
('weekly', 'scan', 'Scan {count} skylines at sunrise or sunset', 'Capture the city''s glow', 3, 5, 150, 250, 14, 3, 'scan_count'),
('weekly', 'scan', 'Revisit {count} buildings from your past quests', 'Track changes and compare', 5, 8, 180, 280, 14, 3, 'revisit_count'),

-- =========================
-- WEEKLY — WALK (5)
-- =========================
('weekly', 'walk', 'Walk {count} total blocks this week', 'Stay consistent and explore wider', 30, 50, 200, 300, 14, 2, 'walk_distance'),
('weekly', 'walk', 'Trace a full street from start to end', 'Map a single artery of the city', 1, 1, 250, 350, 14, 2, 'gps_path'),
('weekly', 'walk', 'Walk through {count} parks or green spaces', 'Balance concrete with calm', 3, 5, 200, 300, 14, 2, 'gps_checkpoint'),
('weekly', 'walk', 'Follow a river or waterfront for {count} minutes', 'Explore the edge condition', 30, 60, 250, 350, 14, 2, 'walk_duration'),
('weekly', 'walk', 'Join a walking group or invite a friend', 'Share movement and discovery', 1, 1, 250, 400, 14, 2, 'manual_confirm'),

-- =========================
-- WEEKLY — STYLE (5)
-- =========================
('weekly', 'style', 'Collect {count} {style} façades for your archive', 'Document the elegance of {style}', 10, 15, 250, 400, 14, 3, 'style_match'),
('weekly', 'style', 'Compare {count} {style} buildings across neighborhoods', 'Spot regional variations', 5, 10, 200, 350, 14, 3, 'style_match'),
('weekly', 'style', 'Create a color study of {style} architecture', 'Capture materiality and tone', 5, 10, 200, 350, 14, 3, 'style_match'),
('weekly', 'style', 'Photograph {count} decorative details typical of {style}', 'Build your eye for design', 8, 12, 250, 400, 14, 3, 'style_match'),
('weekly', 'style', 'Write a short note about what {style} means to you', 'Reflect on architecture''s emotion', 1, 1, 200, 300, 14, 3, 'manual_confirm'),

-- =========================
-- WEEKLY — NEIGHBORHOOD (5)
-- =========================
('weekly', 'neighborhood', 'Explore {count} new neighborhoods', 'Broaden your city lens', 3, 5, 250, 400, 14, 3, 'unique_neighborhoods'),
('weekly', 'neighborhood', 'Compare street grids between {count} neighborhoods', 'Study urban form diversity', 2, 3, 200, 300, 14, 2, 'unique_neighborhoods'),
('weekly', 'neighborhood', 'Document streetlife in {count} distinct zones', 'Observe people and rhythm', 3, 5, 250, 400, 14, 3, 'unique_neighborhoods'),
('weekly', 'neighborhood', 'Map {count} hidden alleys or passages', 'Trace forgotten routes', 4, 6, 250, 400, 14, 3, 'scan_count'),
('weekly', 'neighborhood', 'Build a mini photo essay about one neighborhood', 'Turn observation into storytelling', 1, 1, 300, 450, 14, 3, 'photo_count'),

-- =========================
-- WEEKLY — FIND (5)
-- =========================
('weekly', 'find', 'Discover {count} hidden architectural motifs', 'Hunt for patterns across the city', 6, 10, 250, 400, 14, 2, 'scan_count'),
('weekly', 'find', 'Locate {count} historic plaques or inscriptions', 'Learn what the city remembers', 5, 8, 250, 400, 14, 2, 'scan_count'),
('weekly', 'find', 'Find {count} rooftop details visible from the street', 'Train your eye upward', 3, 5, 200, 350, 14, 2, 'scan_count'),
('weekly', 'find', 'Spot {count} reused or repurposed buildings', 'Discover adaptive reuse stories', 4, 6, 250, 400, 14, 2, 'scan_count'),
('weekly', 'find', 'Recreate {count} past finds in a themed collection', 'Return and reinterpret', 5, 8, 250, 400, 14, 2, 'revisit_count');

-- Step 3: Create user_quest_history table to track cooldowns
CREATE TABLE IF NOT EXISTS user_quest_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES quest_templates(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, template_id, assigned_at)
);

CREATE INDEX IF NOT EXISTS idx_user_quest_history_user ON user_quest_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quest_history_assigned ON user_quest_history(assigned_at);

ALTER TABLE user_quest_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_quest_history_policy ON user_quest_history FOR ALL USING (auth.uid() = user_id);

-- Step 4: Create personalized quest generation function
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
BEGIN
  -- Get cooldown period
  v_cooldown_days := CASE WHEN p_quest_type = 'daily' THEN 7 ELSE 14 END;

  -- Try to get user's aesthetic profile for personalization
  BEGIN
    SELECT aesthetic_scores INTO v_user_archetypes
    FROM user_aesthetic_profiles
    WHERE user_id = p_user_id;
  EXCEPTION WHEN OTHERS THEN
    v_user_archetypes := NULL;
  END;

  -- Determine preferred category based on user behavior (simplified)
  -- In a full implementation, this would analyze user's scan history
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
    -- Boost weight for preferred category (personalization)
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

  -- Generate random values
  v_count := floor(random() * (v_template.target_max - v_template.target_min + 1) + v_template.target_min)::INT;
  v_style := v_styles[floor(random() * array_length(v_styles, 1) + 1)::INT];
  v_xp_reward := floor(random() * (v_template.xp_reward_max - v_template.xp_reward_min + 1) + v_template.xp_reward_min)::INT;

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
    jsonb_build_object('template_id', v_template.id, 'style', v_style, 'category', v_template.category),
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

-- Step 5: Create function to assign quests to user profile
CREATE OR REPLACE FUNCTION assign_new_quest_to_user(
  p_user_id UUID,
  p_quest_type TEXT  -- 'daily' or 'weekly'
) RETURNS JSONB AS $$
DECLARE
  v_quest_id UUID;
  v_quest RECORD;
BEGIN
  -- Generate a new quest
  v_quest_id := generate_quest_for_user(p_user_id, p_quest_type);

  IF v_quest_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No quest templates available');
  END IF;

  -- Get quest details
  SELECT * INTO v_quest FROM quests WHERE id = v_quest_id;

  -- Update user profile with new quest
  IF p_quest_type = 'daily' THEN
    UPDATE profiles
    SET daily_quest_id = v_quest_id,
        daily_quest_progress = 0,
        daily_quest_completed = false
    WHERE id = p_user_id;
  ELSE
    UPDATE profiles
    SET weekly_quest_id = v_quest_id,
        weekly_quest_progress = 0,
        weekly_quest_completed = false
    WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'quest_id', v_quest_id,
    'title', v_quest.title,
    'description', v_quest.description,
    'target_count', v_quest.target_count,
    'xp_reward', v_quest.xp_reward
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Update ensureQuest logic to use template generation
-- This modifies the existing behavior to generate from templates
CREATE OR REPLACE FUNCTION ensure_user_has_active_quests(
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_profile RECORD;
  v_daily_result JSONB;
  v_weekly_result JSONB;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Get current profile state
  SELECT daily_quest_id, daily_quest_completed, weekly_quest_id, weekly_quest_completed
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id;

  -- Check if user needs a new daily quest
  IF v_profile.daily_quest_id IS NULL OR v_profile.daily_quest_completed = true THEN
    v_daily_result := assign_new_quest_to_user(p_user_id, 'daily');
  ELSE
    -- Check if current daily quest has expired
    DECLARE v_quest_until TIMESTAMPTZ;
    BEGIN
      SELECT active_until INTO v_quest_until FROM quests WHERE id = v_profile.daily_quest_id;
      IF v_quest_until < v_now THEN
        v_daily_result := assign_new_quest_to_user(p_user_id, 'daily');
      ELSE
        v_daily_result := jsonb_build_object('success', true, 'message', 'Daily quest still active');
      END IF;
    END;
  END IF;

  -- Check if user needs a new weekly quest
  IF v_profile.weekly_quest_id IS NULL OR v_profile.weekly_quest_completed = true THEN
    v_weekly_result := assign_new_quest_to_user(p_user_id, 'weekly');
  ELSE
    -- Check if current weekly quest has expired
    DECLARE v_quest_until TIMESTAMPTZ;
    BEGIN
      SELECT active_until INTO v_quest_until FROM quests WHERE id = v_profile.weekly_quest_id;
      IF v_quest_until < v_now THEN
        v_weekly_result := assign_new_quest_to_user(p_user_id, 'weekly');
      ELSE
        v_weekly_result := jsonb_build_object('success', true, 'message', 'Weekly quest still active');
      END IF;
    END;
  END IF;

  RETURN jsonb_build_object(
    'daily', v_daily_result,
    'weekly', v_weekly_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify
SELECT 'Quest templates created: ' || COUNT(*) FROM quest_templates;
