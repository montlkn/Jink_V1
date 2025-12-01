-- Migration: Create user_aesthetic_events table
-- Purpose: Store all user interactions (scans, likes, saves, etc.) for profile evolution

CREATE TABLE IF NOT EXISTS public.user_aesthetic_events (
    event_uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Event classification
    event_type TEXT NOT NULL,
    event_subtype TEXT,

    -- Building context (nullable for non-building events)
    building_bbl VARCHAR(10),
    building_aesthetic_profile JSONB,

    -- Event metadata
    payload JSONB NOT NULL DEFAULT '{}',
    aesthetic_vector JSONB,

    -- Weighting (calculated on insert)
    base_weight DOUBLE PRECISION,
    contextual_weight DOUBLE PRECISION DEFAULT 1.0,
    final_weight DOUBLE PRECISION,

    -- Processing state
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    event_timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT valid_event_type CHECK (event_type IN (
        'quiz_answer', 'building_scan', 'building_like',
        'building_save', 'building_unlike', 'add_note',
        'route_complete', 'detail_view', 'quick_dismiss'
    ))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_events_user_unprocessed
    ON public.user_aesthetic_events(user_id, processed)
    WHERE NOT processed;

CREATE INDEX IF NOT EXISTS idx_events_timestamp
    ON public.user_aesthetic_events(event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_events_building
    ON public.user_aesthetic_events(building_bbl)
    WHERE building_bbl IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_type
    ON public.user_aesthetic_events(event_type);

-- Row Level Security
ALTER TABLE public.user_aesthetic_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own events"
    ON public.user_aesthetic_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own events"
    ON public.user_aesthetic_events FOR SELECT
    USING (auth.uid() = user_id);
