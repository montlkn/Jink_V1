-- Migration: Enhance user_aesthetic_profiles table
-- Purpose: Add JSONB columns for raw/normalized scores and metadata

ALTER TABLE public.user_aesthetic_profiles
    ADD COLUMN IF NOT EXISTS raw_scores JSONB DEFAULT '{"classicist":0,"romantic":0,"stylist":0,"modernist":0,"industrialist":0,"visionary":0,"pop_culturalist":0,"vernacularist":0,"austerist":0}',
    ADD COLUMN IF NOT EXISTS normalized_scores JSONB,
    ADD COLUMN IF NOT EXISTS action_counts JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION DEFAULT 10,
    ADD COLUMN IF NOT EXISTS last_decay_timestamp TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS total_events_processed INTEGER DEFAULT 0;

-- Index for recommendation queries
CREATE INDEX IF NOT EXISTS idx_profiles_normalized
    ON public.user_aesthetic_profiles USING GIN (normalized_scores);
