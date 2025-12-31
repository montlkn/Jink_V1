-- Migration: Fix building_bbl VARCHAR length
-- Purpose: Increase building_bbl from VARCHAR(10) to VARCHAR(20) to handle all NYC identifiers
-- Issue: VARCHAR(10) was too restrictive for some BIN/BBL values

ALTER TABLE public.user_aesthetic_events
  ALTER COLUMN building_bbl TYPE VARCHAR(20);
