-- Migration: Populate quests table with proper templates
-- Purpose: Add daily and weekly quests following QUEST_SYSTEM.md templates
-- Date: 2024-12-11

-- Clear existing quests (if any)
TRUNCATE TABLE quests CASCADE;

-- Insert Daily Quests with proper verification JSONB
INSERT INTO quests (type, title, description, quest_type, target_count, xp_reward, rewards, verification, active_from, active_until, metadata) VALUES

-- Daily Quest 1: Simple scan count (like Daily Scanner)
(
  'daily',
  'Daily Scanner',
  'Scan 3 different buildings today',
  'scan_count',
  3,
  250,
  '{"stamps": [], "achievements": []}'::jsonb,
  '{"method": "scan_count", "unique": true, "time_window": "24h"}'::jsonb,
  NOW(),
  NOW() + INTERVAL '30 days',
  '{}'::jsonb
),

-- Daily Quest 2: Neighborhood explorer
(
  'daily',
  'Neighborhood Explorer',
  'Scan buildings in 2 different neighborhoods',
  'neighborhood_visit',
  2,
  300,
  '{"stamps": ["Explorer"], "achievements": []}'::jsonb,
  '{"method": "unique_neighborhoods", "source": "building.neighborhood"}'::jsonb,
  NOW(),
  NOW() + INTERVAL '30 days',
  '{}'::jsonb
),

-- Daily Quest 3: Art Deco style hunter
(
  'daily',
  'Art Deco Detective',
  'Scan 2 Art Deco buildings',
  'architectural_style',
  2,
  300,
  '{"stamps": [], "achievements": []}'::jsonb,
  '{"method": "style_match", "required_style": "Art Deco"}'::jsonb,
  NOW(),
  NOW() + INTERVAL '30 days',
  '{"required_style": "Art Deco"}'::jsonb
),

-- Daily Quest 4: Photo contributor
(
  'daily',
  'Photo Contributor',
  'Submit 2 building photos today',
  'photo_contribution',
  2,
  200,
  '{"stamps": [], "achievements": []}'::jsonb,
  '{"method": "photo_count", "time_window": "24h"}'::jsonb,
  NOW(),
  NOW() + INTERVAL '30 days',
  '{}'::jsonb
);

-- Insert Weekly Quests
INSERT INTO quests (type, title, description, quest_type, target_count, xp_reward, rewards, verification, active_from, active_until, metadata) VALUES

-- Weekly Quest 1: Power user (25 scans)
(
  'weekly',
  'Power User',
  'Scan 25 unique buildings this week',
  'scan_count',
  25,
  1000,
  '{"stamps": ["Power User"], "achievements": ["Weekly Warrior"]}'::jsonb,
  '{"method": "scan_count", "unique": true, "time_window": "7d"}'::jsonb,
  NOW(),
  NOW() + INTERVAL '60 days',
  '{}'::jsonb
),

-- Weekly Quest 2: Borough tour (all 5 boroughs)
(
  'weekly',
  'Borough Tour',
  'Scan buildings in all 5 boroughs',
  'borough_coverage',
  5,
  1500,
  '{"stamps": ["Five Borough Explorer"], "achievements": []}'::jsonb,
  '{"method": "unique_boroughs", "required_boroughs": ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"]}'::jsonb,
  NOW(),
  NOW() + INTERVAL '60 days',
  '{"required_boroughs": ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"]}'::jsonb
),

-- Weekly Quest 3: Data champion (photos + contributions)
(
  'weekly',
  'Data Champion',
  'Submit 5 photo contributions AND 2 full building submissions',
  'contribution_combo',
  7,
  1200,
  '{"stamps": ["Data Validator", "Pioneer"], "achievements": []}'::jsonb,
  '{"method": "combined", "requirements": [{"type": "photo_contribution", "count": 5}, {"type": "building_contribution", "count": 2}]}'::jsonb,
  NOW(),
  NOW() + INTERVAL '60 days',
  '{}'::jsonb
);

-- Add comment
COMMENT ON TABLE quests IS 'Quest definitions with proper verification JSONB following QUEST_SYSTEM.md templates';
