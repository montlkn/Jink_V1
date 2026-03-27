-- ============================================================
-- Quiz: calculate_aesthetic_profile RPC
-- Reads quiz_responses + question_options.aesthetic_scores,
-- aggregates by archetype, normalizes to 0-100, writes
-- to user_aesthetic_profiles.raw_scores and normalized_scores.
-- ============================================================

DROP FUNCTION IF EXISTS public.calculate_aesthetic_profile(UUID);

CREATE OR REPLACE FUNCTION public.calculate_aesthetic_profile(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_raw JSONB := '{"classicist":0,"romantic":0,"stylist":0,"modernist":0,"industrialist":0,"visionary":0,"pop_culturalist":0,"vernacularist":0,"austerist":0}'::jsonb;
  v_normalized JSONB := '{}'::jsonb;
  v_total DOUBLE PRECISION := 0;
  v_arch TEXT;
  v_score DOUBLE PRECISION;
  v_core_archetypes TEXT[] := ARRAY['classicist','romantic','stylist','modernist','industrialist','visionary','pop_culturalist','vernacularist','austerist'];
BEGIN
  -- Aggregate scores from quiz responses (selected option's aesthetic_scores)
  SELECT
    jsonb_build_object(
      'classicist',     COALESCE(SUM((qo.aesthetic_scores->>'classicist')::DOUBLE PRECISION), 0),
      'romantic',       COALESCE(SUM((qo.aesthetic_scores->>'romantic')::DOUBLE PRECISION), 0),
      'stylist',        COALESCE(SUM((qo.aesthetic_scores->>'stylist')::DOUBLE PRECISION), 0),
      'modernist',      COALESCE(SUM((qo.aesthetic_scores->>'modernist')::DOUBLE PRECISION), 0),
      'industrialist',  COALESCE(SUM((qo.aesthetic_scores->>'industrialist')::DOUBLE PRECISION), 0),
      'visionary',      COALESCE(SUM((qo.aesthetic_scores->>'visionary')::DOUBLE PRECISION), 0),
      'pop_culturalist',COALESCE(SUM((qo.aesthetic_scores->>'pop_culturalist')::DOUBLE PRECISION), 0),
      'vernacularist',  COALESCE(SUM((qo.aesthetic_scores->>'vernacularist')::DOUBLE PRECISION), 0),
      'austerist',      COALESCE(SUM((qo.aesthetic_scores->>'austerist')::DOUBLE PRECISION), 0)
    )
  INTO v_raw
  FROM public.quiz_responses qr
  JOIN public.question_options qo ON qr.selected_option_id::text = qo.id::text
  WHERE qr.user_id = p_user_id;

  -- If no rows, v_raw can be null from jsonb_build_object in some edge cases; keep default
  IF v_raw IS NULL THEN
    v_raw := '{"classicist":0,"romantic":0,"stylist":0,"modernist":0,"industrialist":0,"visionary":0,"pop_culturalist":0,"vernacularist":0,"austerist":0}'::jsonb;
  END IF;

  -- Total for normalization
  FOR v_arch IN SELECT unnest(v_core_archetypes) LOOP
    v_total := v_total + COALESCE((v_raw->>v_arch)::DOUBLE PRECISION, 0);
  END LOOP;

  -- Normalize to 0-100
  IF v_total > 0 THEN
    FOR v_arch IN SELECT unnest(v_core_archetypes) LOOP
      v_score := COALESCE((v_raw->>v_arch)::DOUBLE PRECISION, 0);
      v_normalized := jsonb_set(
        v_normalized,
        ARRAY[v_arch],
        to_jsonb(ROUND((v_score / v_total * 100.0)::numeric, 2))
      );
    END LOOP;
  ELSE
    -- No responses: equal split 100/9
    FOR v_arch IN SELECT unnest(v_core_archetypes) LOOP
      v_normalized := jsonb_set(v_normalized, ARRAY[v_arch], to_jsonb(11.11));
    END LOOP;
  END IF;

  -- Upsert user_aesthetic_profiles (current schema: raw_scores, normalized_scores)
  INSERT INTO public.user_aesthetic_profiles (user_id, raw_scores, normalized_scores, confidence, last_updated)
  VALUES (p_user_id, v_raw, v_normalized, 50, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    raw_scores = EXCLUDED.raw_scores,
    normalized_scores = EXCLUDED.normalized_scores,
    confidence = GREATEST(user_aesthetic_profiles.confidence, 50),
    last_updated = NOW();
END;
$$;

COMMENT ON FUNCTION public.calculate_aesthetic_profile(UUID) IS 'Aggregates quiz responses into user_aesthetic_profiles.raw_scores and normalized_scores (0-100 per archetype).';
