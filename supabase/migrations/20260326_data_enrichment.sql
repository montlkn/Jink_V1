-- Data Enrichment: Missing Buildings + Materials Fix
-- Run on: Buildings Supabase (cglsuoymdcchrxyzofjb)

-- === 1. THE OCULUS (Westfield World Trade Center Transportation Hub) ===
INSERT INTO buildings_full_merge_scanning (
    bin, bbl, building_name, address, borough, architect, year_built, style,
    storytelling, landmark, mat_prim, building_type,
    geocoded_lat, geocoded_lng, primary_aesthetic, secondary_aesthetic
)
SELECT
    '1001389', '1000477501', 'The Oculus', '33 Vesey St', 'Manhattan',
    'Santiago Calatrava', '2016',
    'Neo-Futurist',
    'The Oculus is the centerpiece of the World Trade Center Transportation Hub, designed by Spanish architect Santiago Calatrava. Its soaring white steel ribs, resembling a bird in flight, were conceived as a symbol of renewal following September 11. The structure took over a decade to build and became one of the most expensive transit stations in the world. Each year on September 11, the skylight at its spine opens to align with the path of sunlight at the moment the first tower was struck, creating a powerful memorial gesture through pure architecture.',
    't', 'Steel and Glass', 'Transportation',
    40.7112, -74.0105,
    'Modernist', 'Industrialist'
WHERE NOT EXISTS (SELECT 1 FROM buildings_full_merge_scanning WHERE bin = '1001389');

-- === 2. PERLMAN HALL (Julliard School expansion) ===
INSERT INTO buildings_full_merge_scanning (
    bin, bbl, building_name, address, borough, architect, year_built, style,
    storytelling, landmark, mat_prim, building_type,
    geocoded_lat, geocoded_lng, primary_aesthetic, secondary_aesthetic
)
SELECT
    '1022670', '1011570001', 'Alice Tully Hall / The Juilliard School', '1941 Broadway', 'Manhattan',
    'Diller Scofidio + Renfro', '2009',
    'Deconstructivist',
    'The transformation of Alice Tully Hall by Diller Scofidio + Renfro peeled open Lincoln Center to the street. The angled glass facade tilts outward over Broadway like a curtain being drawn back, inviting passersby into what was once an insular cultural fortress. The lobby doubles as a public corridor, and the auditorium was rebuilt entirely around acoustic perfection. It is one of the most successful examples of architecture as urban activism: a building that decided to stop being a wall and become a window.',
    'f', 'Glass and Steel', 'Education / Performing Arts',
    40.7738, -73.9831,
    'Modernist', 'Vernacularist'
WHERE NOT EXISTS (SELECT 1 FROM buildings_full_merge_scanning WHERE bin = '1022670');

-- === 3. HOME LIFE BUILDING ===
INSERT INTO buildings_full_merge_scanning (
    bin, bbl, building_name, address, borough, architect, year_built, style,
    storytelling, landmark, mat_prim, building_type,
    geocoded_lat, geocoded_lng, primary_aesthetic, secondary_aesthetic
)
SELECT
    '1001287', '1000640001', 'Home Life Building', '256 Broadway', 'Manhattan',
    'Napoleon LeBrun & Sons', '1894',
    'Renaissance Revival',
    'The Home Life Building at 256 Broadway was one of the earliest skyscrapers in lower Manhattan, completed the same year as its twin across the street. Designed by Napoleon LeBrun and Sons in the Renaissance Revival style, it featured ornamental terra cotta detailing and a tripartite facade composition that would become the standard grammar for tall buildings. Standing at the gateway to City Hall Park, it represented the insurance industry''s confidence in vertical growth as both a financial strategy and an architectural statement.',
    't', 'Brick and Terra Cotta', 'Office',
    40.7126, -74.0058,
    'Classicist', 'Vernacularist'
WHERE NOT EXISTS (SELECT 1 FROM buildings_full_merge_scanning WHERE bin = '1001287');

-- === 4. Fix materials for notable buildings ===
UPDATE buildings_full_merge_scanning
SET mat_prim = 'Terra Cotta'
WHERE building_name ILIKE '%woolworth%'
  AND (mat_prim IS NULL OR mat_prim = '' OR mat_prim = 'unknown');

UPDATE buildings_full_merge_scanning
SET mat_prim = 'Limestone and Granite'
WHERE building_name ILIKE '%empire state%'
  AND (mat_prim IS NULL OR mat_prim = '' OR mat_prim = 'unknown');

UPDATE buildings_full_merge_scanning
SET mat_prim = 'Limestone'
WHERE building_name ILIKE '%flatiron%'
  AND (mat_prim IS NULL OR mat_prim = '' OR mat_prim = 'unknown');

UPDATE buildings_full_merge_scanning
SET mat_prim = 'Stainless Steel and Glass'
WHERE building_name ILIKE '%chrysler%'
  AND (mat_prim IS NULL OR mat_prim = '' OR mat_prim = 'unknown');

UPDATE buildings_full_merge_scanning
SET mat_prim = 'Concrete and Glass'
WHERE building_name ILIKE '%guggenheim%' AND address ILIKE '%5th%'
  AND (mat_prim IS NULL OR mat_prim = '' OR mat_prim = 'unknown');

UPDATE buildings_full_merge_scanning
SET mat_prim = 'Steel and Glass'
WHERE building_name ILIKE '%oculus%'
  AND (mat_prim IS NULL OR mat_prim = '' OR mat_prim = 'unknown');
