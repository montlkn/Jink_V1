-- Fix incorrect building data for One World Trade Center (Freedom Tower)
-- The current entry still shows the pre-9/11 WTC 1 data (Yamasaki, 1973)

-- First, update the main scanning table
UPDATE buildings_full_merge_scanning
SET
  building_name = 'One World Trade Center',
  address = '285 Fulton Street',
  architect = 'Skidmore, Owings & Merrill / David Childs',
  year_built = '2014',
  style = 'Neo-Futurist',
  primary_aesthetic = 'Modernist',
  mat_prim = 'Glass and Steel'
WHERE building_name ILIKE '%world trade%' 
  AND building_name ILIKE '%1%'
  AND (year_built = '1973' OR architect ILIKE '%yamasaki%');

-- Also fix Empire State Building aesthetic (Art Deco, not Modernist)
UPDATE buildings_full_merge_scanning
SET primary_aesthetic = 'Classicist'
WHERE building_name ILIKE '%empire state%'
  AND primary_aesthetic = 'Modernist';
