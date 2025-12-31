-- =========================================================
-- VISAS & NEIGHBORHOODS SYSTEM
-- Neighborhood-based achievements for local exploration
-- =========================================================

-- Step 1: Create visa definitions table
CREATE TABLE IF NOT EXISTS visas_def (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  borough TEXT,
  requirement INT DEFAULT 10, -- buildings needed to unlock
  description TEXT,
  artwork TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visas_def_neighborhood ON visas_def(neighborhood);
CREATE INDEX IF NOT EXISTS idx_visas_def_borough ON visas_def(borough);

-- Step 2: Create user visas table
CREATE TABLE IF NOT EXISTS user_visas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visa_id UUID NOT NULL REFERENCES visas_def(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_for JSONB DEFAULT '[]', -- Array of building BBLs that contributed
  building_count INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, visa_id)
);

CREATE INDEX IF NOT EXISTS idx_user_visas_user ON user_visas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_visas_visa ON user_visas(visa_id);

ALTER TABLE user_visas ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_visas' AND policyname = 'user_visas_policy') THEN
    CREATE POLICY user_visas_policy ON user_visas FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Step 3: Seed NYC neighborhood visas
-- Using major NYC neighborhoods across all 5 boroughs
INSERT INTO visas_def (slug, title, neighborhood, borough, requirement, description) VALUES

-- Manhattan
('visa_tribeca', 'TriBeCa Explorer', 'Tribeca', 'Manhattan', 10, 'Granted for exploring 10 buildings in Tribeca'),
('visa_soho', 'SoHo Connoisseur', 'SoHo', 'Manhattan', 10, 'Granted for exploring 10 buildings in SoHo'),
('visa_greenwich', 'Greenwich Village Dweller', 'Greenwich Village', 'Manhattan', 10, 'Granted for exploring 10 buildings in Greenwich Village'),
('visa_chelsea', 'Chelsea Navigator', 'Chelsea', 'Manhattan', 10, 'Granted for exploring 10 buildings in Chelsea'),
('visa_midtown', 'Midtown Maven', 'Midtown', 'Manhattan', 10, 'Granted for exploring 10 buildings in Midtown'),
('visa_upper_east', 'Upper East Side Regular', 'Upper East Side', 'Manhattan', 10, 'Granted for exploring 10 buildings in Upper East Side'),
('visa_upper_west', 'Upper West Side Familiar', 'Upper West Side', 'Manhattan', 10, 'Granted for exploring 10 buildings in Upper West Side'),
('visa_harlem', 'Harlem Insider', 'Harlem', 'Manhattan', 10, 'Granted for exploring 10 buildings in Harlem'),

-- Brooklyn
('visa_williamsburg', 'Williamsburg Local', 'Williamsburg', 'Brooklyn', 10, 'Granted for exploring 10 buildings in Williamsburg'),
('visa_park_slope', 'Park Slope Native', 'Park Slope', 'Brooklyn', 10, 'Granted for exploring 10 buildings in Park Slope'),
('visa_dumbo', 'DUMBO Denizen', 'DUMBO', 'Brooklyn', 10, 'Granted for exploring 10 buildings in DUMBO'),
('visa_brooklyn_heights', 'Brooklyn Heights Resident', 'Brooklyn Heights', 'Brooklyn', 10, 'Granted for exploring 10 buildings in Brooklyn Heights'),
('visa_bushwick', 'Bushwick Explorer', 'Bushwick', 'Brooklyn', 10, 'Granted for exploring 10 buildings in Bushwick'),

-- Queens
('visa_astoria', 'Astoria Insider', 'Astoria', 'Queens', 10, 'Granted for exploring 10 buildings in Astoria'),
('visa_long_island_city', 'LIC Local', 'Long Island City', 'Queens', 10, 'Granted for exploring 10 buildings in Long Island City'),
('visa_flushing', 'Flushing Navigator', 'Flushing', 'Queens', 10, 'Granted for exploring 10 buildings in Flushing'),

-- Bronx
('visa_bronx_park', 'Bronx Park Explorer', 'Bronx Park', 'Bronx', 10, 'Granted for exploring 10 buildings in Bronx Park'),
('visa_fordham', 'Fordham Familiar', 'Fordham', 'Bronx', 10, 'Granted for exploring 10 buildings in Fordham'),

-- Staten Island
('visa_st_george', 'St. George Regular', 'St. George', 'Staten Island', 10, 'Granted for exploring 10 buildings in St. George'),
('visa_tottenville', 'Tottenville Navigator', 'Tottenville', 'Staten Island', 10, 'Granted for exploring 10 buildings in Tottenville')

ON CONFLICT (slug) DO NOTHING;

-- Step 4: Create visa checking RPC
CREATE OR REPLACE FUNCTION check_and_award_visas(
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_neighborhood RECORD;
  v_visa RECORD;
  v_building_count INT;
  v_building_bbls TEXT[];
  v_newly_granted UUID[] := ARRAY[]::UUID[];
  v_already_has_visa BOOLEAN;
BEGIN
  -- Get unique neighborhoods the user has scanned
  FOR v_neighborhood IN
    SELECT DISTINCT neighborhood, COUNT(*) as scan_count, ARRAY_AGG(DISTINCT building_bbl) as bbls
    FROM quest_events
    WHERE user_id = p_user_id
      AND event_type = 'scan'
      AND neighborhood IS NOT NULL
    GROUP BY neighborhood
    HAVING COUNT(DISTINCT building_bbl) >= 10
  LOOP
    -- Find matching visa definition
    SELECT * INTO v_visa
    FROM visas_def
    WHERE LOWER(neighborhood) = LOWER(v_neighborhood.neighborhood)
    LIMIT 1;

    IF v_visa IS NULL THEN
      -- No visa defined for this neighborhood yet, skip
      CONTINUE;
    END IF;

    -- Check if user already has this visa
    SELECT EXISTS(
      SELECT 1 FROM user_visas
      WHERE user_id = p_user_id AND visa_id = v_visa.id
    ) INTO v_already_has_visa;

    IF v_already_has_visa THEN
      CONTINUE;
    END IF;

    -- Award visa
    INSERT INTO user_visas (user_id, visa_id, granted_for, building_count)
    VALUES (
      p_user_id,
      v_visa.id,
      to_jsonb(v_neighborhood.bbls),
      array_length(v_neighborhood.bbls, 1)
    )
    ON CONFLICT (user_id, visa_id) DO NOTHING;

    v_newly_granted := array_append(v_newly_granted, v_visa.id);

    -- Award corresponding stamp (rare rarity)
    DECLARE
      v_stamp_id UUID;
      v_stamp_slug TEXT := 'visa_' || LOWER(REPLACE(v_visa.neighborhood, ' ', '_'));
    BEGIN
      -- Try to find or create stamp
      SELECT id INTO v_stamp_id FROM stamps_def WHERE slug = v_stamp_slug;

      IF v_stamp_id IS NULL THEN
        -- Create stamp definition for this visa
        INSERT INTO stamps_def (slug, title, rarity, series, description, metadata)
        VALUES (
          v_stamp_slug,
          v_visa.title,
          'rare',
          'neighborhood',
          v_visa.description,
          jsonb_build_object('neighborhood', v_visa.neighborhood, 'borough', v_visa.borough)
        )
        RETURNING id INTO v_stamp_id;
      END IF;

      -- Award stamp to user
      IF v_stamp_id IS NOT NULL THEN
        INSERT INTO user_stamps (user_id, stamp_id, source_type, source_id, metadata)
        VALUES (
          p_user_id,
          v_stamp_id,
          'achievement_unlock',
          v_visa.id::TEXT,
          jsonb_build_object('neighborhood', v_visa.neighborhood, 'building_count', array_length(v_neighborhood.bbls, 1))
        )
        ON CONFLICT (user_id, stamp_id) DO NOTHING;
      END IF;
    END;
  END LOOP;

  -- Return newly granted visas
  RETURN jsonb_build_object(
    'granted_count', array_length(v_newly_granted, 1),
    'visa_ids', to_jsonb(v_newly_granted)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_and_award_visas IS 'Check and award neighborhood visas (requires 10+ unique buildings per neighborhood)';

-- Verify
SELECT 'Created ' || COUNT(*) || ' neighborhood visas' FROM visas_def;
