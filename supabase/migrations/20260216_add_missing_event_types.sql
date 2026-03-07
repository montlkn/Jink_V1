-- Add missing event types to user_aesthetic_events constraint
-- This includes: like, unlike, dislike, and dwell time events

ALTER TABLE user_aesthetic_events DROP CONSTRAINT IF EXISTS valid_event_type;

ALTER TABLE user_aesthetic_events ADD CONSTRAINT valid_event_type CHECK (event_type IN (
  -- Original event types
  'quiz_answer', 'building_scan', 'building_like', 'building_save',
  'building_unlike', 'add_note', 'route_complete', 'detail_view',
  'quick_dismiss', 'dwell_time_15s', 'dwell_time_30s', 'dwell_time_60s+',
  -- New event types for recommendation algorithm
  'like', 'unlike', 'dislike',
  'dwell_15', 'dwell_30', 'dwell_60'
));
