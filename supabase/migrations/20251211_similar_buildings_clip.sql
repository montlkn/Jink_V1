-- Hybrid Similar Buildings: RPC function using existing reference_embeddings table
-- Uses buildings_full_merge_scanning as the buildings table

-- Function to find similar buildings using reference_embeddings table
CREATE OR REPLACE FUNCTION find_similar_buildings(
  target_embedding vector(512),
  target_style text DEFAULT NULL,
  target_architect text DEFAULT NULL,
  target_materials text DEFAULT NULL,
  match_count int DEFAULT 20,
  exclude_bin text DEFAULT NULL
)
RETURNS TABLE (
  bin text,
  name text,
  address text,
  architect text,
  style text,
  materials text,
  year int,
  latitude float,
  longitude float,
  visual_similarity float,
  metadata_boost float,
  combined_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.bin::text,
    b.building_name::text AS name,
    b.address::text,
    b.architect::text,
    b.style::text,
    b.mat_prim::text AS materials,
    b.year_built::float::int AS year,
    b.geocoded_lat::float AS latitude,
    b.geocoded_lng::float AS longitude,
    -- Visual similarity (0-1, higher is better)
    (1 - (re.embedding <=> target_embedding))::float AS visual_similarity,
    -- Metadata boost (0-0.3 bonus for matching attributes)
    (
      CASE WHEN LOWER(b.style) = LOWER(target_style) THEN 0.1 ELSE 0 END +
      CASE WHEN LOWER(b.architect) = LOWER(target_architect) THEN 0.15 ELSE 0 END +
      CASE WHEN LOWER(b.mat_prim) = LOWER(target_materials) THEN 0.05 ELSE 0 END
    )::float AS metadata_boost,
    -- Combined score
    (
      (1 - (re.embedding <=> target_embedding)) +
      CASE WHEN LOWER(b.style) = LOWER(target_style) THEN 0.1 ELSE 0 END +
      CASE WHEN LOWER(b.architect) = LOWER(target_architect) THEN 0.15 ELSE 0 END +
      CASE WHEN LOWER(b.mat_prim) = LOWER(target_materials) THEN 0.05 ELSE 0 END
    )::float AS combined_score
  FROM reference_embeddings re
  INNER JOIN buildings_full_merge_scanning b ON b.id = re.building_id
  WHERE 
    re.embedding IS NOT NULL
    AND (exclude_bin IS NULL OR b.bin::text != exclude_bin)
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION find_similar_buildings TO authenticated;
GRANT EXECUTE ON FUNCTION find_similar_buildings TO anon;

COMMENT ON FUNCTION find_similar_buildings IS 'Find visually similar buildings using CLIP embeddings';
