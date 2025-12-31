-- =========================================================
-- AESTHETIC PROFILE PROCESSING RPC
-- Processes unprocessed aesthetic events and updates user profiles
-- with decay, normalization, and subtype mapping
-- =========================================================

CREATE OR REPLACE FUNCTION process_aesthetic_events_for_user(
  p_user_id UUID,
  p_batch_size INT DEFAULT 100
) RETURNS JSONB AS $$
DECLARE
  v_events RECORD;
  v_profile RECORD;
  v_raw_scores JSONB;
  v_action_counts JSONB;
  v_total_weight DOUBLE PRECISION := 0;
  v_normalized_scores JSONB;
  v_confidence DOUBLE PRECISION;
  v_archetype TEXT;
  v_score DOUBLE PRECISION;
  v_events_processed INT := 0;
  v_event_uuids UUID[] := ARRAY[]::UUID[];
  v_days_since_last_decay INT;
  v_decay_factor DOUBLE PRECISION;
  v_core_archetypes TEXT[] := ARRAY['classicist', 'romantic', 'stylist', 'modernist', 'industrialist', 'visionary', 'pop_culturalist', 'vernacularist', 'austerist'];
  v_building_profile JSONB;
  v_style_archetype TEXT;
  v_style_score DOUBLE PRECISION;
BEGIN
  -- Get or create profile
  SELECT * INTO v_profile
  FROM user_aesthetic_profiles
  WHERE user_id = p_user_id;

  IF v_profile IS NULL THEN
    -- Create new profile
    INSERT INTO user_aesthetic_profiles (user_id, raw_scores, action_counts, confidence)
    VALUES (
      p_user_id,
      '{"classicist":0,"romantic":0,"stylist":0,"modernist":0,"industrialist":0,"visionary":0,"pop_culturalist":0,"vernacularist":0,"austerist":0}'::jsonb,
      '{}'::jsonb,
      10
    )
    RETURNING * INTO v_profile;
  END IF;

  v_raw_scores := v_profile.raw_scores;
  v_action_counts := v_profile.action_counts;
  v_confidence := v_profile.confidence;

  -- Apply time decay if needed (every 7 days)
  v_days_since_last_decay := EXTRACT(DAY FROM NOW() - COALESCE(v_profile.last_decay_timestamp, NOW() - INTERVAL '1 year'));

  IF v_days_since_last_decay >= 7 THEN
    -- Logarithmic decay: decay_factor = max(0.05, 1 / (1 + 0.5 * log(days + 1)))
    v_decay_factor := GREATEST(0.05, 1.0 / (1.0 + 0.5 * LN(v_days_since_last_decay + 1)));

    -- Apply decay to all archetype scores
    FOR v_archetype IN SELECT unnest(v_core_archetypes) LOOP
      v_score := COALESCE((v_raw_scores->>v_archetype)::DOUBLE PRECISION, 0) * v_decay_factor;
      v_raw_scores := jsonb_set(v_raw_scores, ARRAY[v_archetype], to_jsonb(v_score));
    END LOOP;

    -- Update last decay timestamp
    UPDATE user_aesthetic_profiles
    SET last_decay_timestamp = NOW()
    WHERE user_id = p_user_id;
  END IF;

  -- Process unprocessed events
  FOR v_events IN
    SELECT * FROM user_aesthetic_events
    WHERE user_id = p_user_id AND processed = FALSE
    ORDER BY event_timestamp ASC
    LIMIT p_batch_size
  LOOP
    v_events_processed := v_events_processed + 1;
    v_event_uuids := array_append(v_event_uuids, v_events.event_uuid);

    -- Extract building aesthetic profile if available
    v_building_profile := v_events.building_aesthetic_profile;

    IF v_building_profile IS NOT NULL THEN
      -- Process each archetype from building profile
      FOR v_archetype IN SELECT unnest(v_core_archetypes) LOOP
        v_style_archetype := v_archetype;

        -- SUBTYPE MAPPING: infrastructuralist → industrialist, naturalist → vernacularist
        IF v_building_profile ? 'infrastructuralist' AND v_archetype = 'industrialist' THEN
          v_style_score := COALESCE((v_building_profile->>'infrastructuralist')::DOUBLE PRECISION, 0);
        ELSIF v_building_profile ? 'naturalist' AND v_archetype = 'vernacularist' THEN
          v_style_score := COALESCE((v_building_profile->>'naturalist')::DOUBLE PRECISION, 0);
        ELSE
          v_style_score := COALESCE((v_building_profile->>v_archetype)::DOUBLE PRECISION, 0);
        END IF;

        -- Weight the archetype contribution by event weight and building score
        IF v_style_score > 0 THEN
          v_score := COALESCE((v_raw_scores->>v_archetype)::DOUBLE PRECISION, 0);
          v_score := v_score + (v_style_score * v_events.final_weight);
          v_raw_scores := jsonb_set(v_raw_scores, ARRAY[v_archetype], to_jsonb(v_score));
        END IF;
      END LOOP;
    END IF;

    -- Update action counts
    v_action_counts := jsonb_set(
      v_action_counts,
      ARRAY[v_events.event_type],
      to_jsonb(COALESCE((v_action_counts->>v_events.event_type)::INT, 0) + 1)
    );
  END LOOP;

  -- Calculate total weight for normalization
  FOR v_archetype IN SELECT unnest(v_core_archetypes) LOOP
    v_total_weight := v_total_weight + COALESCE((v_raw_scores->>v_archetype)::DOUBLE PRECISION, 0);
  END LOOP;

  -- Normalize scores (0-100 scale)
  v_normalized_scores := '{}'::jsonb;
  IF v_total_weight > 0 THEN
    FOR v_archetype IN SELECT unnest(v_core_archetypes) LOOP
      v_score := COALESCE((v_raw_scores->>v_archetype)::DOUBLE PRECISION, 0);
      v_normalized_scores := jsonb_set(
        v_normalized_scores,
        ARRAY[v_archetype],
        to_jsonb(ROUND((v_score / v_total_weight * 100)::numeric, 2))
      );
    END LOOP;
  ELSE
    -- Default equal distribution if no data
    FOR v_archetype IN SELECT unnest(v_core_archetypes) LOOP
      v_normalized_scores := jsonb_set(v_normalized_scores, ARRAY[v_archetype], to_jsonb(11.11));
    END LOOP;
  END IF;

  -- Calculate confidence (simple version: min(95, 10 + events_count * 1.5))
  v_confidence := LEAST(95, 10 + (COALESCE(v_profile.total_events_processed, 0) + v_events_processed) * 1.5);

  -- Update profile
  UPDATE user_aesthetic_profiles
  SET
    raw_scores = v_raw_scores,
    normalized_scores = v_normalized_scores,
    action_counts = v_action_counts,
    confidence = v_confidence,
    total_events_processed = COALESCE(total_events_processed, 0) + v_events_processed,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Mark events as processed
  IF array_length(v_event_uuids, 1) > 0 THEN
    UPDATE user_aesthetic_events
    SET processed = TRUE, processed_at = NOW()
    WHERE event_uuid = ANY(v_event_uuids);
  END IF;

  -- Return summary
  RETURN jsonb_build_object(
    'events_processed', v_events_processed,
    'normalized_scores', v_normalized_scores,
    'confidence', v_confidence,
    'total_weight', v_total_weight
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION process_aesthetic_events_for_user IS 'Process unprocessed aesthetic events with decay, normalization, and subtype mapping (infrastructuralist→industrialist, naturalist→vernacularist)';

-- Test function (run manually to process events for a user)
-- SELECT process_aesthetic_events_for_user('YOUR_USER_ID_HERE');
