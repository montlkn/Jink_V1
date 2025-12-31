-- Migration: Add verification column to quests table
-- Purpose: Enable quest verification logic with JSONB configuration
-- Date: 2024-12-11

ALTER TABLE quests
ADD COLUMN IF NOT EXISTS verification JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN quests.verification IS 'Quest verification method and requirements in JSONB format (e.g., {"method": "scan_count", "unique": true})';
