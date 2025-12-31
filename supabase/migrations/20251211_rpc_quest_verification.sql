-- Migration: Quest verification RPC functions
-- Purpose: Verify quest progress and prevent duplicate counting
-- Date: 2024-12-11

-- Function: Verify if a building scan qualifies for a quest
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
  v_required_neighborhood TEXT;
BEGIN
  -- Get quest type and metadata
  SELECT quest_type, metadata INTO v_quest_type, v_quest_metadata
  FROM quests
  WHERE id = p_quest_id;

  -- Check if this building was already counted for this quest
  SELECT EXISTS(
    SELECT 1 FROM quest_events
    WHERE user_id = p_user_id
      AND quest_id = p_quest_id
      AND building_bbl = p_building_bbl
  ) INTO v_already_counted;

  -- If already counted, reject
  IF v_already_counted THEN
    RETURN FALSE;
  END IF;

  -- Verify based on quest type
  CASE v_quest_type
    WHEN 'scan' THEN
      -- Simple scan quest - any building counts
      RETURN TRUE;

    WHEN 'scan_style' THEN
      -- Style-specific quest
      v_required_style := v_quest_metadata->>'required_style';
      IF v_required_style IS NULL THEN
        RETURN TRUE; -- No style requirement
      END IF;
      RETURN LOWER(p_building_style) = LOWER(v_required_style);

    WHEN 'scan_neighborhood' THEN
      -- Neighborhood-specific quest
      v_required_neighborhood := v_quest_metadata->>'required_neighborhood';
      IF v_required_neighborhood IS NULL THEN
        RETURN TRUE; -- No neighborhood requirement
      END IF;
      RETURN LOWER(p_building_neighborhood) = LOWER(v_required_neighborhood);

    ELSE
      -- Default: allow the scan
      RETURN TRUE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Record a quest event
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
  -- Insert the quest event
  INSERT INTO quest_events (
    user_id,
    quest_id,
    event_type,
    building_bbl,
    neighborhood,
    style,
    metadata
  ) VALUES (
    p_user_id,
    p_quest_id,
    p_event_type,
    p_building_bbl,
    p_neighborhood,
    p_style,
    p_metadata
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get quest progress (count of qualifying events)
CREATE OR REPLACE FUNCTION get_quest_progress(
  p_user_id UUID,
  p_quest_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM quest_events
  WHERE user_id = p_user_id
    AND quest_id = p_quest_id;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION verify_quest_scan IS 'Verifies if a building scan qualifies for a quest (checks duplicates and requirements)';
COMMENT ON FUNCTION record_quest_event IS 'Records an event that contributes to quest progress';
COMMENT ON FUNCTION get_quest_progress IS 'Gets the current progress count for a quest';
