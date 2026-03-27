-- Community Posts: user-pinned observations, finds, memories, and cool things
-- These show up on the explore map for ALL users with their own pin type

CREATE TABLE IF NOT EXISTS community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    -- Optional link to a building if near one
    building_bbl TEXT,
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Moderation
    is_flagged BOOLEAN DEFAULT FALSE,
    flag_reason TEXT
);

-- Index for map queries (bounding box)
CREATE INDEX idx_community_posts_location
    ON community_posts (latitude, longitude);

-- Index for user's own posts
CREATE INDEX idx_community_posts_user
    ON community_posts (user_id, created_at DESC);

-- RLS policies
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- Everyone can read all posts
CREATE POLICY "community_posts_read" ON community_posts
    FOR SELECT USING (NOT is_flagged);

-- Users can insert their own posts
CREATE POLICY "community_posts_insert" ON community_posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "community_posts_delete" ON community_posts
    FOR DELETE USING (auth.uid() = user_id);
