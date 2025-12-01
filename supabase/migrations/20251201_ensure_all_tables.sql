  -- ============================================================================
  -- COMPREHENSIVE MIGRATION (CORRECTED FOR POLICY SYNTAX)
  -- ============================================================================

  -- Ensure profiles has total_xp
  ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

  -- Migrate old xp to total_xp if needed
  ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS xp INTEGER;

  UPDATE profiles
  SET total_xp = COALESCE(xp, 0)
  WHERE total_xp = 0 AND xp IS NOT NULL AND xp > 0;

  CREATE INDEX IF NOT EXISTS idx_profiles_total_xp ON profiles(total_xp DESC);

  -- ============================================================================
  -- XP TRANSACTIONS TABLE
  -- ============================================================================

  CREATE TABLE IF NOT EXISTS xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount != 0),
    reason TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_id TEXT,
    event_uuid UUID UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON xp_transactions(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_xp_transactions_event_uuid ON xp_transactions(event_uuid) WHERE
  event_uuid IS NOT NULL;

  ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view own XP transactions" ON xp_transactions;
  CREATE POLICY "Users can view own XP transactions"
    ON xp_transactions FOR SELECT
    USING (auth.uid() = user_id);

  -- ============================================================================
  -- USER AESTHETIC EVENTS TABLE
  -- ============================================================================

  CREATE TABLE IF NOT EXISTS user_aesthetic_events (
    event_uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT NOT NULL,
    event_subtype TEXT,
    building_bbl VARCHAR(10),
    building_aesthetic_profile JSONB,
    payload JSONB NOT NULL DEFAULT '{}',
    aesthetic_vector JSONB,
    base_weight DOUBLE PRECISION,
    contextual_weight DOUBLE PRECISION DEFAULT 1.0,
    final_weight DOUBLE PRECISION,
    sequence_bonus NUMERIC DEFAULT 0,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    event_timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
  );

  -- Drop and recreate constraint to add new event types
  DO $$
  BEGIN
    ALTER TABLE user_aesthetic_events DROP CONSTRAINT IF EXISTS valid_event_type;
    ALTER TABLE user_aesthetic_events ADD CONSTRAINT valid_event_type CHECK (event_type IN (
      'quiz_answer', 'building_scan', 'building_like', 'building_save',
      'building_unlike', 'add_note', 'route_complete', 'detail_view',
      'quick_dismiss', 'dwell_time_15s', 'dwell_time_30s', 'dwell_time_60s+'
    ));
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;

  CREATE INDEX IF NOT EXISTS idx_events_user_unprocessed
    ON user_aesthetic_events(user_id, processed)
    WHERE NOT processed;

  CREATE INDEX IF NOT EXISTS idx_events_timestamp
    ON user_aesthetic_events(event_timestamp DESC);

  CREATE INDEX IF NOT EXISTS idx_events_building
    ON user_aesthetic_events(building_bbl)
    WHERE building_bbl IS NOT NULL;

  CREATE INDEX IF NOT EXISTS idx_events_type
    ON user_aesthetic_events(event_type);

  ALTER TABLE user_aesthetic_events ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can insert their own events" ON user_aesthetic_events;
  CREATE POLICY "Users can insert their own events"
    ON user_aesthetic_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can view their own events" ON user_aesthetic_events;
  CREATE POLICY "Users can view their own events"
    ON user_aesthetic_events FOR SELECT
    USING (auth.uid() = user_id);

  -- ============================================================================
  -- USER AESTHETIC PROFILES TABLE
  -- ============================================================================

  CREATE TABLE IF NOT EXISTS user_aesthetic_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    raw_scores JSONB NOT NULL DEFAULT '{}',
    normalized_scores JSONB NOT NULL DEFAULT '{}',
    confidence NUMERIC DEFAULT 10,
    action_counts JSONB DEFAULT '{}',
    action_diversity INT DEFAULT 0,
    entropy NUMERIC,
    confidence_components JSONB,
    last_decay_days NUMERIC,
    total_events_processed INT DEFAULT 0,
    primary_archetype TEXT,
    secondary_archetype TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    last_decay_timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_aesthetic_profiles_user ON user_aesthetic_profiles(user_id);

  ALTER TABLE user_aesthetic_profiles ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view own aesthetic profile" ON user_aesthetic_profiles;
  CREATE POLICY "Users can view own aesthetic profile"
    ON user_aesthetic_profiles FOR SELECT
    USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can insert own aesthetic profile" ON user_aesthetic_profiles;
  CREATE POLICY "Users can insert own aesthetic profile"
    ON user_aesthetic_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can update own aesthetic profile" ON user_aesthetic_profiles;
  CREATE POLICY "Users can update own aesthetic profile"
    ON user_aesthetic_profiles FOR UPDATE
    USING (auth.uid() = user_id);

  -- ============================================================================
  -- USER SESSION TRACKING
  -- ============================================================================

  CREATE TABLE IF NOT EXISTS user_session_tracking (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    session_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    style_counts JSONB NOT NULL DEFAULT '{}',
    last_event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_session_tracking_user
    ON user_session_tracking(user_id, session_start);

  ALTER TABLE user_session_tracking ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view own session data" ON user_session_tracking;
  CREATE POLICY "Users can view own session data"
    ON user_session_tracking FOR SELECT
    USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can insert own session data" ON user_session_tracking;
  CREATE POLICY "Users can insert own session data"
    ON user_session_tracking FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can update own session data" ON user_session_tracking;
  CREATE POLICY "Users can update own session data"
    ON user_session_tracking FOR UPDATE
    USING (auth.uid() = user_id);
