-- Combined Migration: Quests System (Phase 1 & 2) - FINAL
-- To apply: Copy and paste this entire file into Supabase SQL Editor

-- Step 1: Add missing columns to quests table
ALTER TABLE quests
ADD COLUMN IF NOT EXISTS verification JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Step 2: Add level_title and level_tier columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS level_title TEXT DEFAULT 'Newcomer',
ADD COLUMN IF NOT EXISTS level_tier TEXT DEFAULT 'explorer';

CREATE INDEX IF NOT EXISTS idx_profiles_level_tier ON profiles(level_tier);

-- Step 3: Create quest_events table
CREATE TABLE IF NOT EXISTS quest_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  building_bbl TEXT,
  neighborhood TEXT,
  style TEXT,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quest_events_user_quest ON quest_events(user_id, quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_events_timestamp ON quest_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_quest_events_building ON quest_events(building_bbl) WHERE building_bbl IS NOT NULL;

ALTER TABLE quest_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quest_events' AND policyname = 'quest_events_user_policy') THEN
    CREATE POLICY quest_events_user_policy ON quest_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Step 4: Quest verification RPC functions
CREATE OR REPLACE FUNCTION verify_quest_scan(
  p_user_id UUID,
  p_quest_id UUID,
  p_building_bbl TEXT,
  p_building_style TEXT DEFAULT NULL,
  p_building_neighborhood TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_quest_type TEXT;
  v_quest_metadata JSONB;
  v_already_counted BOOLEAN;
  v_required_style TEXT;
BEGIN
  SELECT quest_type, metadata INTO v_quest_type, v_quest_metadata FROM quests WHERE id = p_quest_id;

  SELECT EXISTS(
    SELECT 1 FROM quest_events
    WHERE user_id = p_user_id AND quest_id = p_quest_id AND building_bbl = p_building_bbl
  ) INTO v_already_counted;

  IF v_already_counted THEN RETURN FALSE; END IF;

  CASE v_quest_type
    WHEN 'scan' THEN RETURN TRUE;
    WHEN 'scan_style', 'architectural_style' THEN
      v_required_style := v_quest_metadata->>'required_style';
      IF v_required_style IS NULL THEN RETURN TRUE; END IF;
      RETURN LOWER(p_building_style) = LOWER(v_required_style);
    ELSE RETURN TRUE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION record_quest_event(
  p_user_id UUID,
  p_quest_id UUID,
  p_event_type TEXT,
  p_building_bbl TEXT DEFAULT NULL,
  p_neighborhood TEXT DEFAULT NULL,
  p_style TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO quest_events (user_id, quest_id, event_type, building_bbl, neighborhood, style, metadata)
  VALUES (p_user_id, p_quest_id, p_event_type, p_building_bbl, p_neighborhood, p_style, p_metadata)
  RETURNING id INTO v_event_id;
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_quest_progress(
  p_user_id UUID,
  p_quest_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM quest_events WHERE user_id = p_user_id AND quest_id = p_quest_id;
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Populate quests table
TRUNCATE TABLE quests CASCADE;

-- Include active_from and active_until in the INSERT
INSERT INTO quests (type, title, description, quest_type, target_count, xp_reward, rewards, verification, metadata, active_from, active_until) VALUES
('daily', 'Daily Scanner', 'Scan 3 different buildings today', 'scan_count', 3, 250, '{"stamps": [], "achievements": []}'::jsonb, '{"method": "scan_count", "unique": true}'::jsonb, '{}'::jsonb, NOW(), NOW() + INTERVAL '60 days'),
('daily', 'Neighborhood Explorer', 'Scan buildings in 2 different neighborhoods', 'neighborhood_visit', 2, 300, '{"stamps": ["Explorer"], "achievements": []}'::jsonb, '{"method": "unique_neighborhoods"}'::jsonb, '{}'::jsonb, NOW(), NOW() + INTERVAL '60 days'),
('daily', 'Art Deco Detective', 'Scan 2 Art Deco buildings', 'architectural_style', 2, 300, '{"stamps": [], "achievements": []}'::jsonb, '{"method": "style_match", "required_style": "Art Deco"}'::jsonb, '{"required_style": "Art Deco"}'::jsonb, NOW(), NOW() + INTERVAL '60 days'),
('daily', 'Photo Contributor', 'Submit 2 building photos today', 'photo_contribution', 2, 200, '{"stamps": [], "achievements": []}'::jsonb, '{"method": "photo_count"}'::jsonb, '{}'::jsonb, NOW(), NOW() + INTERVAL '60 days'),
('weekly', 'Power User', 'Scan 25 unique buildings this week', 'scan_count', 25, 1000, '{"stamps": ["Power User"], "achievements": ["Weekly Warrior"]}'::jsonb, '{"method": "scan_count", "unique": true}'::jsonb, '{}'::jsonb, NOW(), NOW() + INTERVAL '60 days'),
('weekly', 'Borough Tour', 'Scan buildings in all 5 boroughs', 'borough_coverage', 5, 1500, '{"stamps": ["Five Borough Explorer"], "achievements": []}'::jsonb, '{"method": "unique_boroughs"}'::jsonb, '{"required_boroughs": ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"]}'::jsonb, NOW(), NOW() + INTERVAL '60 days'),
('weekly', 'Data Champion', 'Submit 5 photo contributions AND 2 full building submissions', 'contribution_combo', 7, 1200, '{"stamps": ["Data Validator", "Pioneer"], "achievements": []}'::jsonb, '{"method": "combined"}'::jsonb, '{}'::jsonb, NOW(), NOW() + INTERVAL '60 days');

SELECT 'Migration complete! Inserted ' || COUNT(*) || ' quests.' FROM quests;
