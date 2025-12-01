-- Add route tier and XP multiplier support to walks
-- Part of Phase D: Time-constrained route generation

-- Add route metadata columns to walk_summaries
ALTER TABLE walk_summaries
ADD COLUMN IF NOT EXISTS route_tier TEXT CHECK (route_tier IN ('aesthetic', 'behavioral', 'wildcard')),
ADD COLUMN IF NOT EXISTS route_xp_multiplier NUMERIC DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS compatibility_score NUMERIC,
ADD COLUMN IF NOT EXISTS target_duration_min NUMERIC,
ADD COLUMN IF NOT EXISTS estimated_duration_min NUMERIC;

-- Add index for querying by tier
CREATE INDEX IF NOT EXISTS idx_walk_summaries_route_tier
ON walk_summaries(route_tier) WHERE route_tier IS NOT NULL;

-- Create function to complete walk with XP multipliers
CREATE OR REPLACE FUNCTION complete_walk_session(
  p_user_id UUID,
  p_walk_id UUID,
  p_completed_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_walk RECORD;
  v_scan_count INTEGER;
  v_duration_minutes NUMERIC;
  v_base_xp INTEGER;
  v_duration_multiplier NUMERIC;
  v_route_tier_multiplier NUMERIC;
  v_streak_multiplier NUMERIC;
  v_total_xp INTEGER;
  v_event_uuid UUID;
BEGIN
  -- Verify walk belongs to user
  SELECT * INTO v_walk
  FROM walk_summaries
  WHERE id = p_walk_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Walk not found or does not belong to user';
  END IF;

  IF v_walk.ended_at IS NOT NULL THEN
    RAISE EXCEPTION 'Walk already completed';
  END IF;

  -- Update walk end time
  UPDATE walk_summaries
  SET ended_at = p_completed_at,
      updated_at = p_completed_at
  WHERE id = p_walk_id;

  -- Calculate walk metrics
  SELECT COUNT(*) INTO v_scan_count
  FROM walk_seen_points
  WHERE walk_id = p_walk_id AND scanned = true;

  -- Calculate actual duration in minutes
  v_duration_minutes := EXTRACT(EPOCH FROM (p_completed_at - v_walk.started_at)) / 60.0;

  -- Base XP: 10 XP per scanned building + 5 XP per minute + 10 XP completion bonus
  v_base_xp := (10 * COALESCE(v_scan_count, 0)) +
               (5 * FLOOR(v_duration_minutes)) +
               10;

  -- Time-based duration multiplier (from xp.md spec)
  v_duration_multiplier := CASE
    WHEN v_duration_minutes >= 5 AND v_duration_minutes < 10 THEN 1.2
    WHEN v_duration_minutes >= 10 AND v_duration_minutes < 20 THEN 1.5
    WHEN v_duration_minutes >= 20 AND v_duration_minutes < 35 THEN 2.0
    WHEN v_duration_minutes >= 35 AND v_duration_minutes < 45 THEN 1.2
    WHEN v_duration_minutes >= 45 AND v_duration_minutes < 55 THEN 1.5
    WHEN v_duration_minutes >= 55 AND v_duration_minutes < 65 THEN 2.0
    WHEN v_duration_minutes >= 65 AND v_duration_minutes < 75 THEN 1.5
    WHEN v_duration_minutes >= 75 AND v_duration_minutes < 80 THEN 1.2
    WHEN v_duration_minutes >= 80 AND v_duration_minutes < 85 THEN 1.0
    WHEN v_duration_minutes >= 85 AND v_duration_minutes < 90 THEN 2.0
    ELSE 1.0
  END;

  -- Route tier multiplier (wildcard = 2.5x)
  v_route_tier_multiplier := COALESCE(v_walk.route_xp_multiplier, 1.0);

  -- Streak multiplier (get from profiles table)
  SELECT CASE
    WHEN daily_streak_count >= 30 THEN 3.0
    WHEN daily_streak_count >= 7 THEN 2.0
    WHEN daily_streak_count >= 3 THEN 1.5
    ELSE 1.0
  END INTO v_streak_multiplier
  FROM profiles
  WHERE id = p_user_id;

  v_streak_multiplier := COALESCE(v_streak_multiplier, 1.0);

  -- Calculate total XP with all multipliers
  v_total_xp := FLOOR(v_base_xp * v_duration_multiplier * v_route_tier_multiplier * v_streak_multiplier);

  -- Award XP (idempotent with event_uuid)
  v_event_uuid := gen_random_uuid();

  INSERT INTO xp_transactions (
    user_id,
    amount,
    reason,
    source_type,
    source_id,
    event_uuid,
    created_at
  ) VALUES (
    p_user_id,
    v_total_xp,
    'Walk completed',
    'walk',
    p_walk_id::TEXT,
    v_event_uuid,
    p_completed_at
  );

  -- Update profile total_xp
  UPDATE profiles
  SET total_xp = total_xp + v_total_xp,
      updated_at = p_completed_at
  WHERE id = p_user_id;

  -- Return summary
  RETURN jsonb_build_object(
    'walk_id', p_walk_id,
    'user_id', p_user_id,
    'scan_count', v_scan_count,
    'duration_minutes', v_duration_minutes,
    'base_xp', v_base_xp,
    'duration_multiplier', v_duration_multiplier,
    'route_tier_multiplier', v_route_tier_multiplier,
    'streak_multiplier', v_streak_multiplier,
    'total_xp', v_total_xp,
    'route_tier', v_walk.route_tier,
    'completed_at', p_completed_at
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION complete_walk_session TO authenticated;
