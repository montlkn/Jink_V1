-- Add daily streak tracking columns to profiles table

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS daily_streak_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_date DATE,
ADD COLUMN IF NOT EXISTS streak_started_at TIMESTAMPTZ;

-- Create index for efficient streak queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_activity
ON profiles(last_activity_date);

-- Function to check and update daily streak
-- Call this after any qualifying action (scan, walk completion, quest completion)
CREATE OR REPLACE FUNCTION update_daily_streak(p_user_id UUID)
RETURNS TABLE(
  streak_count INTEGER,
  is_new_day BOOLEAN,
  previous_streak INTEGER
) AS $$
DECLARE
  v_last_activity DATE;
  v_current_streak INTEGER;
  v_today DATE;
  v_is_new_day BOOLEAN;
  v_previous_streak INTEGER;
BEGIN
  v_today := CURRENT_DATE;

  -- Get current streak data
  SELECT last_activity_date, daily_streak_count
  INTO v_last_activity, v_current_streak
  FROM profiles
  WHERE id = p_user_id;

  v_previous_streak := COALESCE(v_current_streak, 0);

  -- Case 1: First activity ever
  IF v_last_activity IS NULL THEN
    v_current_streak := 1;
    v_is_new_day := true;

    UPDATE profiles
    SET
      daily_streak_count = 1,
      last_activity_date = v_today,
      streak_started_at = NOW()
    WHERE id = p_user_id;

  -- Case 2: Already active today - no change to streak
  ELSIF v_last_activity = v_today THEN
    v_is_new_day := false;
    -- Keep existing streak
    v_current_streak := COALESCE(v_current_streak, 0);

  -- Case 3: Activity yesterday - increment streak
  ELSIF v_last_activity = v_today - INTERVAL '1 day' THEN
    v_current_streak := COALESCE(v_current_streak, 0) + 1;
    v_is_new_day := true;

    UPDATE profiles
    SET
      daily_streak_count = v_current_streak,
      last_activity_date = v_today
    WHERE id = p_user_id;

  -- Case 4: Missed a day - streak broken, reset to 1
  ELSE
    v_current_streak := 1;
    v_is_new_day := true;

    UPDATE profiles
    SET
      daily_streak_count = 1,
      last_activity_date = v_today,
      streak_started_at = NOW()
    WHERE id = p_user_id;
  END IF;

  RETURN QUERY
  SELECT v_current_streak, v_is_new_day, v_previous_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get streak multiplier based on current streak count
CREATE OR REPLACE FUNCTION get_streak_multiplier(p_streak_count INTEGER)
RETURNS NUMERIC AS $$
BEGIN
  -- 30+ days: 3x multiplier
  IF p_streak_count >= 30 THEN
    RETURN 3.0;
  -- 7-29 days: 2x multiplier
  ELSIF p_streak_count >= 7 THEN
    RETURN 2.0;
  -- 3-6 days: 1.5x multiplier
  ELSIF p_streak_count >= 3 THEN
    RETURN 1.5;
  -- 0-2 days: no multiplier
  ELSE
    RETURN 1.0;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_daily_streak(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_streak_multiplier(INTEGER) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION update_daily_streak IS
'Updates user daily streak based on last activity date. Returns current streak count, whether this is a new day, and the previous streak count. Streak breaks if a full day (24h UTC) passes without activity.';
