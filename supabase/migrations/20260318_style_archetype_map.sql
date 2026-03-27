-- Style → Archetype mapping table for backfilling buildings_full_merge_scanning
-- Ported directly from src/mappings/style_mappings.py in the aesthetic-scoring pipeline.
-- Weights use the same relative system: primary=10, secondary=5, tertiary=2.
-- Normalization in backfill_building_profiles() converts to 0-100 proportional scores.

CREATE TABLE IF NOT EXISTS style_archetype_map (
    style_pattern   TEXT PRIMARY KEY,  -- lowercase, trimmed (exact match key)
    classicist      NUMERIC DEFAULT 0,
    romantic        NUMERIC DEFAULT 0,
    stylist         NUMERIC DEFAULT 0,
    modernist       NUMERIC DEFAULT 0,
    industrialist   NUMERIC DEFAULT 0,
    visionary       NUMERIC DEFAULT 0,
    pop_culturalist NUMERIC DEFAULT 0,
    vernacularist   NUMERIC DEFAULT 0,
    austerist       NUMERIC DEFAULT 0
);

-- ============================================================
-- CLASSICIST: Renaissance, Beaux-Arts, Neoclassical, Georgian, Federal
-- ============================================================
INSERT INTO style_archetype_map VALUES
('renaissance',                         10, 0, 3, 0, 0, 0, 0, 0, 0),
('renaissance revival',                 10, 3, 0, 0, 0, 0, 0, 0, 0),
('neo-renaissance',                     10, 3, 0, 0, 0, 0, 0, 0, 0),
('italian renaissance',                 10, 3, 0, 0, 0, 0, 0, 0, 0),
('italian renaissance revival',         10, 3, 0, 0, 0, 0, 0, 0, 0),
('neo-italian renaissance',             10, 3, 0, 0, 0, 0, 0, 0, 0),
('italian renaissance palazzo',         10, 0, 5, 0, 0, 0, 0, 0, 0),
('florentine renaissance',              10, 3, 0, 0, 0, 0, 0, 0, 0),
('french renaissance',                  10, 5, 0, 0, 0, 0, 0, 0, 0),
('french renaissance revival',          10, 5, 0, 0, 0, 0, 0, 0, 0),
('neo-french renaissance',              10, 5, 0, 0, 0, 0, 0, 0, 0),
('francois i',                          10, 5, 0, 0, 0, 0, 0, 0, 0),
('stylized francois i',                  9, 5, 2, 0, 0, 0, 0, 0, 0),
('elizabethan renaissance revival',      9, 5, 0, 0, 0, 0, 0, 0, 0),
('elizabethan revival',                  9, 5, 0, 0, 0, 0, 0, 0, 0),
('german renaissance revival',           9, 5, 0, 0, 0, 0, 0, 0, 0),
('dutch renaissance revival',            9, 0, 0, 0, 0, 0, 0, 5, 0),
('flemish renaissance revival',          9, 5, 0, 0, 0, 0, 0, 0, 0),
('flemish renaissance',                  9, 5, 0, 0, 0, 0, 0, 0, 0),
('neo-flemish renaissance',              9, 5, 0, 0, 0, 0, 0, 0, 0),
('flemish revival',                      9, 5, 0, 0, 0, 0, 0, 0, 0),
('northern renaissance revival',         9, 5, 0, 0, 0, 0, 0, 0, 0),
('northern renaissance',                 9, 5, 0, 0, 0, 0, 0, 0, 0),
('venetian renaissance',                10, 5, 0, 0, 0, 0, 0, 0, 0),
('spanish renaissance',                  9, 5, 0, 0, 0, 0, 0, 0, 0),
('modified spanish renaissance',         8, 5, 0, 0, 0, 0, 0, 0, 0),
('neoclassical',                        10, 0, 3, 0, 0, 0, 0, 0, 0),
('neoclassicism',                       10, 0, 3, 0, 0, 0, 0, 0, 0),
('neoclassical commercial',              9, 0, 0, 0, 0, 0, 0, 0, 3),
('stylized neoclassical',                9, 0, 5, 0, 0, 0, 0, 0, 0),
('industrial neoclassical',              8, 0, 0, 0, 5, 0, 0, 0, 0),
('french neoclassical',                 10, 0, 5, 0, 0, 0, 0, 0, 0),
('english neoclassical',                10, 0, 3, 0, 0, 0, 0, 0, 0),
('modern classical',                     8, 0, 0, 5, 0, 0, 0, 0, 0),
('greek revival',                       10, 3, 0, 0, 0, 0, 0, 0, 0),
('greek revival (late)',                10, 3, 0, 0, 0, 0, 0, 0, 0),
('greek revival (simplified)',           8, 0, 0, 0, 0, 0, 0, 3, 0),
('vernacular greek revival (late)',      7, 0, 0, 0, 0, 0, 0, 5, 0),
('vernacular late greek revival',        7, 0, 0, 0, 0, 0, 0, 5, 0),
('classical',                           10, 0, 0, 0, 0, 0, 0, 0, 0),
('classical revival',                   10, 3, 0, 0, 0, 0, 0, 0, 0),
('classical (simplified)',               8, 0, 0, 0, 0, 0, 0, 0, 3),
('free classical',                       8, 5, 0, 0, 0, 0, 0, 0, 0),
('classic eclectic',                     8, 5, 0, 0, 0, 0, 0, 0, 0),
('french classic eclectic style',        9, 5, 0, 0, 0, 0, 0, 0, 0),
('neo-french classic',                  10, 0, 5, 0, 0, 0, 0, 0, 0),
('beaux-arts',                          10, 0, 5, 0, 0, 0, 0, 0, 0),
('french beaux-arts',                   10, 0, 5, 0, 0, 0, 0, 0, 0),
('beaux-arts with alterations',          8, 0, 5, 0, 0, 0, 0, 0, 0),
('federal',                              9, 0, 0, 0, 0, 0, 0, 5, 0),
('federal (late)',                        9, 0, 0, 0, 0, 0, 0, 5, 0),
('federal with french influence',         9, 5, 0, 0, 0, 0, 0, 0, 0),
('neo-federal',                          9, 0, 0, 0, 0, 0, 0, 5, 0),
('neo-federal (vernacular)',              8, 0, 0, 0, 0, 0, 0, 7, 0),
('vernacular neo-federal',               7, 0, 0, 0, 0, 0, 0, 8, 0),
('altered federal',                      8, 0, 0, 0, 0, 0, 0, 5, 0),
('georgian',                            10, 0, 0, 0, 0, 0, 0, 5, 0),
('georgian revival',                    10, 0, 0, 0, 0, 0, 0, 5, 0),
('neo-georgian',                        10, 0, 0, 0, 0, 0, 0, 5, 0),
('neo-georgian (post-world war ii)',      8, 0, 0, 0, 0, 0, 0, 0, 5),
('modified neo-georgian',                8, 0, 0, 0, 0, 0, 0, 5, 0),
('modified georgian',                    8, 0, 0, 0, 0, 0, 0, 5, 0),
('english georgian',                    10, 0, 0, 0, 0, 0, 0, 5, 0),
('georgian derivative',                  8, 0, 0, 0, 0, 0, 0, 5, 0),
('georgian eclectic',                    8, 5, 0, 0, 0, 0, 0, 0, 0),
('baroque',                             10, 5, 0, 0, 0, 0, 0, 0, 0),
('baroque revival',                     10, 5, 0, 0, 0, 0, 0, 0, 0),
('french baroque (late)',               10, 5, 0, 0, 0, 0, 0, 0, 0),
('palladian',                           10, 0, 0, 0, 0, 0, 0, 0, 0),
('palladian-inspired',                   9, 3, 0, 0, 0, 0, 0, 0, 0),
('regency',                              9, 0, 5, 0, 0, 0, 0, 0, 0),
('regency revival',                      9, 0, 5, 0, 0, 0, 0, 0, 0),
('neo-regency',                          9, 0, 5, 0, 0, 0, 0, 0, 0),
('neo-english regency',                  9, 0, 5, 0, 0, 0, 0, 0, 0),
('adamesque',                           10, 5, 0, 0, 0, 0, 0, 0, 0),
-- ============================================================
-- ROMANTIC: Gothic, Victorian, Art Nouveau, Italianate, Romanesque
-- ============================================================
('gothic',                               3,10, 0, 0, 0, 0, 0, 0, 0),
('gothic revival',                       3,10, 0, 0, 0, 0, 0, 0, 0),
('neo-gothic',                           3,10, 0, 0, 0, 0, 0, 0, 0),
('neo-gothic (simplified)',              0, 8, 0, 0, 0, 0, 0, 0, 3),
('neo-gothic revival',                   3,10, 0, 0, 0, 0, 0, 0, 0),
('victorian gothic',                     3,10, 0, 0, 0, 0, 0, 0, 0),
('collegiate gothic',                    5,10, 0, 0, 0, 0, 0, 0, 0),
('english gothic',                       5,10, 0, 0, 0, 0, 0, 0, 0),
('french gothic',                        5,10, 0, 0, 0, 0, 0, 0, 0),
('french gothic revival',                5,10, 0, 0, 0, 0, 0, 0, 0),
('neo-french gothic',                    5,10, 0, 0, 0, 0, 0, 0, 0),
('military gothic',                      0, 9, 0, 0, 0, 0, 0, 0, 5),
('stylized neo-gothic',                  0, 9, 5, 0, 0, 0, 0, 0, 0),
('victorian',                            0,10, 0, 0, 0, 0, 0, 5, 0),
('queen anne',                           0,10, 0, 0, 0, 0, 0, 5, 0),
('queen anne with alterations',          0, 8, 0, 0, 0, 0, 0, 5, 0),
('modified queen anne',                  0, 8, 0, 0, 0, 0, 0, 5, 0),
('italianate',                           5, 9, 0, 0, 0, 0, 0, 0, 0),
('italianate (simplified)',              3, 7, 0, 0, 0, 0, 0, 0, 0),
('italianate (early)',                   5, 9, 0, 0, 0, 0, 0, 0, 0),
('italianate (late)',                    5, 9, 0, 0, 0, 0, 0, 0, 0),
('modified italianate',                  5, 8, 0, 0, 0, 0, 0, 0, 0),
('vernacular italianate',                0, 7, 0, 0, 0, 0, 0, 5, 0),
('romanesque',                           5,10, 0, 0, 0, 0, 0, 0, 0),
('romanesque revival',                   5,10, 0, 0, 0, 0, 0, 0, 0),
('romanesque revival (early)',           5,10, 0, 0, 0, 0, 0, 0, 0),
('romanesque revival (late)',            5,10, 0, 0, 0, 0, 0, 0, 0),
('neo-romanesque',                       5,10, 0, 0, 0, 0, 0, 0, 0),
('transitional romanesque revival',      5, 9, 0, 0, 0, 0, 0, 0, 0),
('north italian romanesque revival',     5,10, 0, 0, 0, 0, 0, 0, 0),
('american romanesque revival',          5,10, 0, 0, 0, 0, 0, 0, 0),
('victorian romanesque',                 5,10, 0, 0, 0, 0, 0, 0, 0),
('italian romanesque',                   5,10, 0, 0, 0, 0, 0, 0, 0),
('tudor',                                0,10, 0, 0, 0, 0, 0, 5, 0),
('tudor revival',                        0,10, 0, 0, 0, 0, 0, 5, 0),
('neo-tudor',                            0,10, 0, 0, 0, 0, 0, 5, 0),
('altered neo-tudor',                    0, 8, 0, 0, 0, 0, 0, 5, 0),
('english country tudor',                0,10, 0, 0, 0, 0, 0, 7, 0),
('tudoresque',                           0, 9, 0, 0, 0, 0, 0, 5, 0),
('medieval',                             0,10, 0, 0, 0, 0, 0, 5, 0),
('medieval revival',                     0,10, 0, 0, 0, 0, 0, 5, 0),
('neo-medieval',                         0,10, 0, 0, 0, 0, 0, 5, 0),
('medieval french',                      5,10, 0, 0, 0, 0, 0, 0, 0),
('second empire',                        5, 9, 0, 0, 0, 0, 0, 0, 0),
('french second empire',                 5, 9, 0, 0, 0, 0, 0, 0, 0),
('second empire commercial',             5, 8, 0, 0, 3, 0, 0, 0, 0),
('neo-grec',                             7, 9, 0, 0, 0, 0, 0, 0, 0),
('neo-grec (late)',                      7, 9, 0, 0, 0, 0, 0, 0, 0),
('french neo-grec',                      7, 9, 0, 0, 0, 0, 0, 0, 0),
('art nouveau',                          0,10, 5, 0, 0, 0, 0, 0, 0),
('eclectic',                             0, 8, 5, 0, 0, 0, 0, 0, 0),
('jacobean revival',                     5,10, 0, 0, 0, 0, 0, 0, 0),
('neo-jacobean',                         5,10, 0, 0, 0, 0, 0, 0, 0),
('jacobethan',                           5,10, 0, 0, 0, 0, 0, 0, 0),
('norman revival',                       5,10, 0, 0, 0, 0, 0, 0, 0),
('moorish',                              0,10, 0, 0, 0, 5, 0, 0, 0),
('moorish revival',                      0,10, 0, 0, 0, 5, 0, 0, 0),
('neo-moorish',                          0,10, 0, 0, 0, 5, 0, 0, 0),
('chateauesque',                         7,10, 0, 0, 0, 0, 0, 0, 0),
('english cottage',                      0, 9, 0, 0, 0, 0, 0, 7, 0),
('storybook',                            0,10, 0, 0, 0, 0, 0, 5, 0),
('rustic',                               0, 7, 0, 0, 0, 0, 0,10, 0),
('edwardian',                            5, 8, 0, 0, 0, 0, 0, 0, 0),
('edwardian baroque',                    7, 9, 0, 0, 0, 0, 0, 0, 0),
-- ============================================================
-- STYLIST: Art Deco, Moderne, Streamline
-- ============================================================
('art deco',                             0, 0,10, 5, 0, 0, 0, 0, 0),
('classicizing art deco',                5, 0,10, 0, 0, 0, 0, 0, 0),
('moderne',                              0, 0,10, 5, 0, 0, 0, 0, 0),
('art moderne',                          0, 0,10, 5, 0, 0, 0, 0, 0),
('streamline moderne',                   0, 0,10, 5, 0, 0, 0, 0, 0),
('moderne (late)',                       0, 0, 9, 5, 0, 0, 0, 0, 0),
('moderne (post-world war ii)',          0, 0, 8, 7, 0, 0, 0, 0, 0),
('spanish modern',                       0, 0, 8, 0, 0, 0, 0, 5, 0),
('modern french',                        5, 0, 8, 0, 0, 0, 0, 0, 0),
-- ============================================================
-- MODERNIST: International Style, Bauhaus, Brutalist, Minimalist
-- ============================================================
('modern',                               0, 0, 0,10, 0, 0, 0, 0, 5),
('international style',                  0, 0, 0,10, 0, 0, 0, 0, 5),
('bauhaus',                              0, 0, 0,10, 0, 0, 0, 0, 5),
('minimalism',                           0, 0, 0,10, 0, 0, 0, 0, 5),
('minimalist',                           0, 0, 0,10, 0, 0, 0, 0, 5),
('contemporary',                         0, 0, 0, 8, 0, 5, 0, 0, 0),
('brutalist',                            0, 0, 0,10, 5, 0, 0, 0, 0),
('brut',                                 0, 0, 0,10, 5, 0, 0, 0, 0),
('industrial modern',                    0, 0, 0, 8, 7, 0, 0, 0, 0),
('international modern',                 0, 0, 0,10, 0, 0, 0, 0, 5),
('mid-20th century modern',              0, 0, 0,10, 0, 0, 0, 0, 5),
('late-20th century modern',             0, 0, 0, 9, 0, 5, 0, 0, 0),
('post-war modern',                      0, 0, 0,10, 0, 0, 0, 0, 5),
('modern eclectic',                      0, 0, 0, 8, 0, 5, 0, 0, 0),
('french rationalist',                  5, 0, 0,10, 0, 0, 0, 0, 0),
-- ============================================================
-- INDUSTRIALIST: Factories, Lofts, Utilitarian
-- ============================================================
('industrial',                           0, 0, 0, 5,10, 0, 0, 0, 0),
('utilitarian',                          0, 0, 0, 0,10, 0, 0, 0, 7),
('utilitarian, altered',                 0, 0, 0, 0, 8, 0, 0, 0, 5),
('altered utilitarian',                  0, 0, 0, 0, 8, 0, 0, 0, 5),
('late-19th century utilitarian',        0, 3, 0, 0,10, 0, 0, 0, 0),
('daylight factory',                     0, 0, 0, 5,10, 0, 0, 0, 0),
('rundbogenstil',                        0, 5, 0, 0, 9, 0, 0, 0, 0),
('american round arch',                  0, 5, 0, 0, 9, 0, 0, 0, 0),
-- ============================================================
-- VISIONARY: Postmodern, Deconstructivist, Experimental
-- ============================================================
('post-modern',                          0, 0, 0, 0, 0,10, 5, 0, 0),
('postmodern',                           0, 0, 0, 0, 0,10, 5, 0, 0),
('deconstructivist',                     0, 0, 0, 5, 0,10, 0, 0, 0),
('parametric',                           0, 0, 0, 5, 0,10, 0, 0, 0),
('expressionist',                        0, 5, 0, 0, 0,10, 0, 0, 0),
('secessionist',                         0, 5, 0, 0, 0, 9, 0, 0, 0),
('wrightian',                            0, 0, 0, 0, 0,10, 0, 5, 0),
-- ============================================================
-- POP CULTURALIST: Commercial, Themed, Entertainment
-- ============================================================
('commercial',                           0, 0, 0, 0, 0, 0, 8, 0, 5),
('commercial palace',                    0, 0, 5, 0, 0, 0, 8, 0, 0),
('early-20th century commercial',        0, 0, 0, 0, 5, 0, 8, 0, 0),
('late-19th century commercial',         0, 0, 0, 0, 5, 0, 7, 0, 0),
('20th century commercial',              0, 0, 0, 0, 0, 0, 8, 0, 5),
('mid-20th century commercial',          0, 0, 0, 0, 0, 0, 7, 0, 5),
('googie',                               0, 0, 0, 0, 0, 5, 10,0, 0),
-- ============================================================
-- VERNACULARIST: Colonial, Craftsman, Prairie, Mediterranean
-- ============================================================
('vernacular',                           0, 5, 0, 0, 0, 0, 0,10, 0),
('vernacular (simplified)',              0, 0, 0, 0, 0, 0, 0, 9, 3),
('colonial',                             5, 0, 0, 0, 0, 0, 0,10, 0),
('colonial revival',                     5, 0, 0, 0, 0, 0, 0,10, 0),
('neo-colonial',                         5, 0, 0, 0, 0, 0, 0,10, 0),
('colonial revival (simplified)',        0, 0, 0, 0, 0, 0, 0, 8, 3),
('colonial revival cottage',             0, 5, 0, 0, 0, 0, 0,10, 0),
('dutch colonial',                       0, 5, 0, 0, 0, 0, 0,10, 0),
('dutch colonial revival',               0, 5, 0, 0, 0, 0, 0,10, 0),
('spanish colonial',                     0, 5, 0, 0, 0, 0, 0,10, 0),
('spanish colonial revival',             0, 5, 0, 0, 0, 0, 0,10, 0),
('dutch revival',                        0, 5, 0, 0, 0, 0, 0,10, 0),
('craftsman',                            0, 5, 0, 0, 0, 0, 0,10, 0),
('arts & crafts',                        0, 5, 0, 0, 0, 0, 0,10, 0),
('arts & crafts bungalow',               0, 5, 0, 0, 0, 0, 0,10, 0),
('prairie',                              0, 0, 0, 5, 0, 0, 0,10, 0),
('prairie style',                        0, 0, 0, 5, 0, 0, 0,10, 0),
('shingle style',                        0, 5, 0, 0, 0, 0, 0,10, 0),
('mediterranean',                        0, 5, 0, 0, 0, 0, 0,10, 0),
('mediterranean revival',                0, 5, 0, 0, 0, 0, 0,10, 0),
('tuscan villa',                         0, 5, 0, 0, 0, 0, 0,10, 0),
('swiss chalet',                         0, 5, 0, 0, 0, 0, 0,10, 0),
-- ============================================================
-- AUSTERIST: Institutional, Corporate, No-Style
-- ============================================================
('corporate',                            0, 0, 0, 5, 0, 0, 0, 0,10),
('institutional',                        0, 0, 0, 5, 0, 0, 0, 0,10),
('no style',                             0, 0, 0, 0, 0, 0, 0, 0,10),
('military',                             3, 0, 0, 0, 0, 0, 0, 0,10)
ON CONFLICT (style_pattern) DO NOTHING;

-- ============================================================
-- Backfill function
-- Matches on exact style first; falls back to substring (mirrors Python fuzzy logic).
-- Only touches buildings where normalized_profile IS NULL.
-- ============================================================
CREATE OR REPLACE FUNCTION backfill_building_profiles()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    updated_count INT := 0;
BEGIN
    WITH candidates AS (
        SELECT
            b.bin,
            LOWER(TRIM(b.style)) AS style_lower
        FROM buildings_full_merge_scanning b
        WHERE b.normalized_profile IS NULL
          AND b.style IS NOT NULL
          AND b.style NOT IN ('', 'nan', 'not determined')
    ),
    -- Step 1: exact match
    exact_match AS (
        SELECT c.bin, m.*
        FROM candidates c
        JOIN style_archetype_map m ON c.style_lower = m.style_pattern
    ),
    -- Step 2: substring fallback for rows not covered by exact match
    -- (mirrors Python: find longest key that is contained in the style string)
    fuzzy_candidates AS (
        SELECT c.bin, c.style_lower
        FROM candidates c
        WHERE c.bin NOT IN (SELECT bin FROM exact_match)
    ),
    fuzzy_ranked AS (
        SELECT
            fc.bin,
            m.*,
            LENGTH(m.style_pattern) AS match_len,
            ROW_NUMBER() OVER (PARTITION BY fc.bin ORDER BY LENGTH(m.style_pattern) DESC) AS rn
        FROM fuzzy_candidates fc
        JOIN style_archetype_map m ON fc.style_lower LIKE '%' || m.style_pattern || '%'
    ),
    fuzzy_match AS (
        SELECT bin, style_pattern, classicist, romantic, stylist, modernist,
               industrialist, visionary, pop_culturalist, vernacularist, austerist
        FROM fuzzy_ranked WHERE rn = 1
    ),
    combined AS (
        SELECT * FROM exact_match
        UNION ALL
        SELECT * FROM fuzzy_match
    ),
    normalized AS (
        SELECT
            bin,
            classicist + romantic + stylist + modernist + industrialist +
                visionary + pop_culturalist + vernacularist + austerist AS raw_sum,
            classicist, romantic, stylist, modernist,
            industrialist, visionary, pop_culturalist, vernacularist, austerist
        FROM combined
    ),
    scored AS (
        SELECT
            bin,
            CASE WHEN raw_sum > 0 THEN ROUND((classicist     / raw_sum) * 100, 1) ELSE 0 END AS classicist,
            CASE WHEN raw_sum > 0 THEN ROUND((romantic        / raw_sum) * 100, 1) ELSE 0 END AS romantic,
            CASE WHEN raw_sum > 0 THEN ROUND((stylist         / raw_sum) * 100, 1) ELSE 0 END AS stylist,
            CASE WHEN raw_sum > 0 THEN ROUND((modernist       / raw_sum) * 100, 1) ELSE 0 END AS modernist,
            CASE WHEN raw_sum > 0 THEN ROUND((industrialist   / raw_sum) * 100, 1) ELSE 0 END AS industrialist,
            CASE WHEN raw_sum > 0 THEN ROUND((visionary       / raw_sum) * 100, 1) ELSE 0 END AS visionary,
            CASE WHEN raw_sum > 0 THEN ROUND((pop_culturalist / raw_sum) * 100, 1) ELSE 0 END AS pop_culturalist,
            CASE WHEN raw_sum > 0 THEN ROUND((vernacularist   / raw_sum) * 100, 1) ELSE 0 END AS vernacularist,
            CASE WHEN raw_sum > 0 THEN ROUND((austerist       / raw_sum) * 100, 1) ELSE 0 END AS austerist
        FROM normalized
    )
    UPDATE buildings_full_merge_scanning b
    SET
        normalized_profile = jsonb_build_object(
            'classicist',      s.classicist,
            'romantic',        s.romantic,
            'stylist',         s.stylist,
            'modernist',       s.modernist,
            'industrialist',   s.industrialist,
            'visionary',       s.visionary,
            'pop_culturalist', s.pop_culturalist,
            'vernacularist',   s.vernacularist,
            'austerist',       s.austerist
        ),
        primary_aesthetic = (
            SELECT key FROM jsonb_each_text(jsonb_build_object(
                'classicist', s.classicist, 'romantic', s.romantic,
                'stylist', s.stylist, 'modernist', s.modernist,
                'industrialist', s.industrialist, 'visionary', s.visionary,
                'pop_culturalist', s.pop_culturalist,
                'vernacularist', s.vernacularist, 'austerist', s.austerist
            ))
            ORDER BY value::NUMERIC DESC LIMIT 1
        ),
        secondary_aesthetic = (
            SELECT key FROM jsonb_each_text(jsonb_build_object(
                'classicist', s.classicist, 'romantic', s.romantic,
                'stylist', s.stylist, 'modernist', s.modernist,
                'industrialist', s.industrialist, 'visionary', s.visionary,
                'pop_culturalist', s.pop_culturalist,
                'vernacularist', s.vernacularist, 'austerist', s.austerist
            ))
            ORDER BY value::NUMERIC DESC LIMIT 1 OFFSET 1
        )
    FROM scored s
    WHERE b.bin = s.bin;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

-- Run: SELECT backfill_building_profiles();
