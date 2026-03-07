-- Migration: Populate quests table with initial quests
-- Purpose: Add daily and weekly quests for users to complete
-- Date: 2024-12-11

-- Clear existing quests (if any)
TRUNCATE TABLE quests CASCADE;

-- Insert Daily Quests (simple scan-based quests to start)
INSERT INTO quests (type, title, description, quest_type, target_count, xp_reward, ep_reward, rewards, active_from, active_until, metadata) VALUES

-- Daily Quest 1: Simple scan quest
(
  'daily',
  'Urban Explorer',
  'Scan 3 buildings today',
  'scan',
  3,
  250,
  0,
  '{"stamps": [], "badges": []}'::jsonb,
  NOW(),
  NOW() + INTERVAL '365 days',
  '{}'::jsonb
),

-- Daily Quest 2: Scan quest
(
  'daily',
  'Architecture Detective',
  'Scan 5 buildings today',
  'scan',
  5,
  400,
  0,
  '{"stamps": [], "badges": []}'::jsonb,
  NOW(),
  NOW() + INTERVAL '365 days',
  '{}'::jsonb
),

-- Daily Quest 3: Art Deco focused (style-specific)
(
  'daily',
  'Art Deco Appreciation',
  'Scan 2 Art Deco buildings',
  'scan_style',
  2,
  300,
  0,
  '{"stamps": [], "badges": []}'::jsonb,
  NOW(),
  NOW() + INTERVAL '365 days',
  '{"required_style": "Art Deco"}'::jsonb
);

-- Insert Weekly Quests
INSERT INTO quests (type, title, description, quest_type, target_count, xp_reward, ep_reward, rewards, active_from, active_until, metadata) VALUES

-- Weekly Quest 1: Higher scan count
(
  'weekly',
  'Dedicated Explorer',
  'Scan 20 buildings this week',
  'scan',
  20,
  1000,
  0,
  '{"stamps": ["weekly_explorer"], "badges": []}'::jsonb,
  NOW(),
  NOW() + INTERVAL '365 days',
  '{}'::jsonb
),

-- Weekly Quest 2: Very high scan count
(
  'weekly',
  'Architecture Master',
  'Scan 50 buildings this week',
  'scan',
  50,
  2500,
  0,
  '{"stamps": ["weekly_master"], "badges": []}'::jsonb,
  NOW(),
  NOW() + INTERVAL '365 days',
  '{}'::jsonb
);

-- Add comment
COMMENT ON TABLE quests IS 'Quest definitions - daily and weekly challenges for users';
