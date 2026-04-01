-- Create the missing update_daily_streak RPC called by ProgressService
-- Was missing from DB, causing a silent failure on every scan
CREATE OR REPLACE FUNCTION public.update_daily_streak(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_activity DATE;
  v_today DATE := CURRENT_DATE;
BEGIN
  SELECT last_activity_date INTO v_last_activity
  FROM profiles WHERE id = p_user_id;

  IF v_last_activity IS NULL THEN
    -- First activity ever
    UPDATE profiles
    SET daily_streak_count = 1,
        last_activity_date = v_today,
        streak_started_at = NOW()
    WHERE id = p_user_id;
  ELSIF v_last_activity = v_today THEN
    -- Already active today, no change
    NULL;
  ELSIF v_last_activity = v_today - INTERVAL '1 day' THEN
    -- Consecutive day — extend streak
    UPDATE profiles
    SET daily_streak_count = daily_streak_count + 1,
        last_activity_date = v_today
    WHERE id = p_user_id;
  ELSE
    -- Streak broken — reset to 1
    UPDATE profiles
    SET daily_streak_count = 1,
        last_activity_date = v_today,
        streak_started_at = NOW()
    WHERE id = p_user_id;
  END IF;
END;
$$;
