-- Fix handle_new_user to also create a profiles row on signup
-- Previously only created user_aesthetic_profiles, leaving profiles empty
-- which caused award_xp RPC to silently update 0 rows (XP stuck at 0)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create aesthetic profile row
  INSERT INTO public.user_aesthetic_profiles (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Create profiles row (required for XP, level, streak)
  INSERT INTO public.profiles (id, total_xp, level, level_title, level_tier, daily_streak_count)
  VALUES (new.id, 0, 1, 'Newcomer', 'explorer', 0)
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- Backfill missing profiles for any existing auth users
INSERT INTO public.profiles (id, total_xp, level, level_title, level_tier, daily_streak_count)
SELECT u.id, 0, 1, 'Newcomer', 'explorer', 0
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;
