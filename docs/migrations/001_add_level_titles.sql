-- Migration: Add Level Titles to Profiles
-- Date: 2025-12-03
-- Description: Adds level_title and level_tier columns to support the 50-level progression system

-- Add columns if they don't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS level_title TEXT DEFAULT 'Newcomer',
ADD COLUMN IF NOT EXISTS level_tier TEXT DEFAULT 'explorer';

-- Create index for faster queries by tier (optional, for leaderboards)
CREATE INDEX IF NOT EXISTS idx_profiles_level_tier ON profiles(level_tier);

-- Add comment for documentation
COMMENT ON COLUMN profiles.level_title IS 'User level title (e.g., Newcomer, Explorer, Curator, Legend)';
COMMENT ON COLUMN profiles.level_tier IS 'User progression tier (explorer, connoisseur, authority, mythic)';

-- Optional: Backfill existing users with correct level titles
-- This function calculates the level from XP using the level² × 100 formula
-- and assigns the appropriate title based on cumulative XP

CREATE OR REPLACE FUNCTION get_level_from_xp(total_xp INTEGER)
RETURNS INTEGER AS $$
DECLARE
  test_level INTEGER := 1;
  cumulative_xp INTEGER := 0;
BEGIN
  -- Check levels from 1 to 50
  FOR test_level IN 1..50 LOOP
    cumulative_xp := cumulative_xp + (test_level * test_level * 100);
    IF total_xp < cumulative_xp THEN
      RETURN test_level;
    END IF;
  END LOOP;

  -- If XP exceeds level 50, return 50
  RETURN 50;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_level_title(total_xp INTEGER)
RETURNS TEXT AS $$
DECLARE
  level INTEGER;
BEGIN
  level := get_level_from_xp(total_xp);

  -- Return title based on level
  RETURN CASE level
    WHEN 1 THEN 'Newcomer'
    WHEN 2 THEN 'Observer'
    WHEN 3 THEN 'Wanderer'
    WHEN 4 THEN 'Scout'
    WHEN 5 THEN 'Enthusiast'
    WHEN 6 THEN 'Admirer'
    WHEN 7 THEN 'Student'
    WHEN 8 THEN 'Apprentice'
    WHEN 9 THEN 'Explorer'
    WHEN 10 THEN 'Pathfinder'
    WHEN 11 THEN 'Connoisseur'
    WHEN 12 THEN 'Specialist'
    WHEN 13 THEN 'Researcher'
    WHEN 14 THEN 'Documentarian'
    WHEN 15 THEN 'Chronicler'
    WHEN 16 THEN 'Curator'
    WHEN 17 THEN 'Scholar'
    WHEN 18 THEN 'Expert'
    WHEN 19 THEN 'Archivist'
    WHEN 20 THEN 'Historian'
    WHEN 21 THEN 'Authority'
    WHEN 22 THEN 'Mentor'
    WHEN 23 THEN 'Master'
    WHEN 24 THEN 'Architect''s Eye'
    WHEN 25 THEN 'Guardian'
    WHEN 26 THEN 'Advocate'
    WHEN 27 THEN 'Ambassador'
    WHEN 28 THEN 'Luminary'
    WHEN 29 THEN 'Visionary'
    WHEN 30 THEN 'Legend'
    WHEN 31 THEN 'Mythmaker'
    WHEN 32 THEN 'Iconoclast'
    WHEN 33 THEN 'Vanguard'
    WHEN 34 THEN 'Paragon'
    WHEN 35 THEN 'Monument'
    WHEN 36 THEN 'Touchstone'
    WHEN 37 THEN 'Keystone'
    WHEN 38 THEN 'Cornerstone'
    WHEN 39 THEN 'Foundation'
    WHEN 40 THEN 'Pillar'
    WHEN 41 THEN 'Bedrock'
    WHEN 42 THEN 'Eternal'
    WHEN 43 THEN 'Timeless'
    WHEN 44 THEN 'Ageless'
    WHEN 45 THEN 'Oracle'
    WHEN 46 THEN 'Sage'
    WHEN 47 THEN 'Seer'
    WHEN 48 THEN 'Prophet'
    WHEN 49 THEN 'Deity'
    WHEN 50 THEN 'Immortal'
    ELSE 'Immortal' -- Default for levels beyond 50
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_level_tier(level INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN level <= 10 THEN 'explorer'
    WHEN level <= 20 THEN 'connoisseur'
    WHEN level <= 30 THEN 'authority'
    ELSE 'mythic'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Backfill existing users (OPTIONAL - run this if you want to update existing users)
-- This will calculate and set level titles for all users based on their current XP
-- UPDATE profiles
-- SET
--   level_title = get_level_title(xp),
--   level_tier = get_level_tier(level)
-- WHERE level_title IS NULL OR level_title = 'Newcomer';

-- Verification query - check sample of users
-- SELECT id, xp, level, level_title, level_tier
-- FROM profiles
-- WHERE xp > 0
-- ORDER BY xp DESC
-- LIMIT 10;
