-- Issue 2.3: Address label corrections for known landmarks
-- Buildings Supabase (cglsuoymdcchrxyzofjb)

-- Clean up "aka" suffix from addresses — strip everything after " (aka"
UPDATE buildings_full_merge_scanning
SET address = TRIM(SPLIT_PART(address, ' (aka', 1))
WHERE address ILIKE '% (aka%';

-- Fix building_name = '0' → use NULL so iOS falls back to address display
UPDATE buildings_full_merge_scanning
SET building_name = NULL
WHERE building_name = '0';

-- Fix specific known wrong addresses
UPDATE buildings_full_merge_scanning SET address = '90 Fulton Street' WHERE bin = '1001389' AND building_name = 'The Oculus';
UPDATE buildings_full_merge_scanning SET address = '1 World Trade Center' WHERE bin = '1088469.0' AND building_name = 'One World Trade Center';
UPDATE buildings_full_merge_scanning SET address = '30 Hudson Yards' WHERE bin IN (
    SELECT bin FROM buildings_full_merge_scanning WHERE building_name ILIKE '%edge%' AND address ILIKE '%30th%' LIMIT 1
);
