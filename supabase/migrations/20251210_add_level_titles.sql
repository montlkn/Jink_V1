-- Migration: Add level_title and level_tier columns to profiles
-- Purpose: Enable level-up celebrations with tier-specific styling
-- Date: 2024-12-10

-- Add level_title and level_tier columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS level_title TEXT DEFAULT 'Newcomer',
ADD COLUMN IF NOT EXISTS level_tier TEXT DEFAULT 'explorer';

-- Create index for tier queries (future leaderboards)
CREATE INDEX IF NOT EXISTS idx_profiles_level_tier ON profiles(level_tier);

-- Add comments for documentation
COMMENT ON COLUMN profiles.level_title IS 'User level title (e.g., Newcomer, Explorer, Curator, Legend)';
COMMENT ON COLUMN profiles.level_tier IS 'User progression tier: explorer (1-10), connoisseur (11-20), authority (21-30), mythic (31-50)';

-- Note: The xpGateway.ts already updates these columns after awarding XP
-- No changes to award_xp() RPC function needed
