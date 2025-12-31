-- Verification queries for Similar Buildings feature
-- Run these in Supabase SQL Editor to verify the migration worked

-- 1. Check if reference_embeddings table exists and has embeddings
SELECT 
    COUNT(*) as total_embeddings,
    COUNT(DISTINCT bin) as unique_buildings
FROM reference_embeddings
WHERE embedding IS NOT NULL;
-- Should return your ~500 buildings with embeddings

-- 2. Check if the RPC function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'find_similar_buildings';
-- Should return: find_similar_buildings

-- 3. Sample an embedding to verify vector format
SELECT bin, array_length(embedding::float8[], 1) as embedding_dim
FROM reference_embeddings
WHERE embedding IS NOT NULL
LIMIT 1;
-- Should return: 512 (for ViT-B-32)

-- 4. Test the RPC function (using a real embedding from your data)
-- This grabs an actual embedding and searches for similar
WITH sample_embedding AS (
    SELECT embedding, bin 
    FROM reference_embeddings 
    WHERE embedding IS NOT NULL 
    LIMIT 1
)
SELECT * FROM find_similar_buildings(
    (SELECT embedding FROM sample_embedding),
    NULL, NULL, NULL, 
    5,
    (SELECT bin FROM sample_embedding)  -- exclude the source building
);
-- Should return up to 5 similar buildings

-- 5. Quick diagnostic of buildings with embeddings
SELECT 
    COUNT(*) as total_buildings,
    COUNT(re.bin) as with_embeddings,
    COUNT(*) FILTER (WHERE b.style IS NOT NULL) as with_style,
    COUNT(*) FILTER (WHERE b.architect IS NOT NULL) as with_architect
FROM buildings b
LEFT JOIN reference_embeddings re ON b.bin::text = re.bin::text AND re.embedding IS NOT NULL;
