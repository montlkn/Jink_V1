# Hybrid Similar Buildings Feature

Find architecturally similar buildings using CLIP visual embeddings, metadata
boosting, and AI-generated commentary.

## Overview

This feature adds a "Find Similar" button to `BuildingInfoScreen` that discovers
visually and stylistically similar buildings using a three-tier approach:

1. **CLIP Embedding Search** (primary) - Fast vector similarity using
   **ViT-B-32** (512-dim)
2. **Metadata Boosting** - Rank buildings with matching
   architect/style/materials higher
3. **LLM Commentary** - Short insight always shown, expandable on tap for full
   explanation

### Design Decisions

| Decision       | Choice                   | Rationale                                         |
| -------------- | ------------------------ | ------------------------------------------------- |
| CLIP Model     | **ViT-B-32**             | Faster inference, sufficient accuracy             |
| Initial Corpus | ~**500 buildings**       | Buildings with Cloudflare R2 images               |
| Commentary UX  | **Always shown (short)** | Expands to full explanation on "Why similar?" tap |

### Cost Model

| Component                        | Cost per Query           |
| -------------------------------- | ------------------------ |
| CLIP similarity search           | **$0** (self-hosted)     |
| Supabase pgvector query          | **$0** (included)        |
| Gemini 2.0 Flash-Lite commentary | ~$0.0005 (25 tokens out) |
| **Total**                        | ~**$0.0005**             |

---

## Prerequisites

> [!IMPORTANT]
> **pgvector extension** must be enabled in Supabase. Run this once:
>
> ```sql
> CREATE EXTENSION IF NOT EXISTS vector;
> ```
>
> Verify with: `SELECT * FROM pg_extension WHERE extname = 'vector';`

---

## Proposed Changes

### Database Layer

#### [NEW] Migration: Add CLIP vector column

```sql
-- supabase/migrations/XXXX_building_clip_embeddings.sql

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to buildings table
ALTER TABLE buildings 
ADD COLUMN IF NOT EXISTS clip_embedding vector(512);

-- Create index for fast similarity search (use IVFFlat for >10K rows)
CREATE INDEX IF NOT EXISTS idx_buildings_clip_embedding 
ON buildings USING ivfflat (clip_embedding vector_cosine_ops)
WITH (lists = 100);
```

#### [NEW] RPC: `find_similar_buildings`

```sql
-- Find buildings similar to a target embedding with metadata boosting
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
    b.name,
    b.address,
    b.architect,
    b.style,
    b.materials,
    b.year::int,
    b.latitude::float,
    b.longitude::float,
    -- Visual similarity (0-1, higher is better)
    (1 - (b.clip_embedding <=> target_embedding))::float AS visual_similarity,
    -- Metadata boost (0-0.3 bonus for matching attributes)
    (
      CASE WHEN LOWER(b.style) = LOWER(target_style) THEN 0.1 ELSE 0 END +
      CASE WHEN LOWER(b.architect) = LOWER(target_architect) THEN 0.15 ELSE 0 END +
      CASE WHEN LOWER(b.materials) = LOWER(target_materials) THEN 0.05 ELSE 0 END
    )::float AS metadata_boost,
    -- Combined score
    (
      (1 - (b.clip_embedding <=> target_embedding)) +
      CASE WHEN LOWER(b.style) = LOWER(target_style) THEN 0.1 ELSE 0 END +
      CASE WHEN LOWER(b.architect) = LOWER(target_architect) THEN 0.15 ELSE 0 END +
      CASE WHEN LOWER(b.materials) = LOWER(target_materials) THEN 0.05 ELSE 0 END
    )::float AS combined_score
  FROM buildings b
  WHERE 
    b.clip_embedding IS NOT NULL
    AND (exclude_bin IS NULL OR b.bin::text != exclude_bin)
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;
```

---

### Backend Layer (Modal/Python)

#### [MODIFY] `apps/server/src/clip_matcher.py`

Add endpoint to get embedding for a specific building:

```python
async def get_building_embedding(bin: str) -> List[float]:
    """
    Retrieve pre-computed embedding from database,
    or compute from Cloudflare R2 image if not yet embedded.
    """
    # Check if embedding exists in DB
    # If not, fetch image from R2, compute embedding, store, return
    pass

async def compute_embedding_from_url(image_url: str) -> List[float]:
    """Compute CLIP embedding from any image URL"""
    async with httpx.AsyncClient() as client:
        response = await client.get(image_url)
        photo_bytes = response.content
    return await encode_photo(photo_bytes)
```

#### [NEW] Endpoint: `/api/similar-buildings`

```python
@router.post("/api/similar-buildings")
async def find_similar_buildings(
    bin: str = Form(None),
    image_url: str = Form(None),
    limit: int = Form(20)
):
    """
    Find similar buildings by:
    - bin: Use pre-computed embedding from that building
    - image_url: Compute embedding from provided image
    """
    if bin:
        embedding = await get_building_embedding(bin)
        building_meta = await get_building_metadata(bin)
    elif image_url:
        embedding = await compute_embedding_from_url(image_url)
        building_meta = {}
    else:
        raise HTTPException(400, "Provide bin or image_url")
    
    # Query Supabase RPC
    results = await supabase.rpc('find_similar_buildings', {
        'target_embedding': embedding,
        'target_style': building_meta.get('style'),
        'target_architect': building_meta.get('architect'),
        'target_materials': building_meta.get('materials'),
        'match_count': limit,
        'exclude_bin': bin
    }).execute()
    
    return {"similar_buildings": results.data}
```

---

### Frontend Layer (React Native)

#### [NEW] `src/services/similarBuildingsService.ts`

```typescript
import { log } from "@/lib/log";

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

export type SimilarBuilding = {
    bin: string;
    name: string;
    address: string;
    architect: string;
    style: string;
    materials: string;
    year: number;
    latitude: number;
    longitude: number;
    visual_similarity: number;
    metadata_boost: number;
    combined_score: number;
};

export async function findSimilarBuildings(params: {
    bin?: string;
    imageUrl?: string;
    limit?: number;
}): Promise<SimilarBuilding[]> {
    const formData = new FormData();

    if (params.bin) formData.append("bin", params.bin);
    if (params.imageUrl) formData.append("image_url", params.imageUrl);
    formData.append("limit", String(params.limit || 20));

    const response = await fetch(`${BACKEND_URL}/api/similar-buildings`, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        log.error("[SimilarBuildings] API error", response.status);
        throw new Error("Failed to find similar buildings");
    }

    const data = await response.json();
    return data.similar_buildings;
}
```

#### [NEW] `src/services/ai/architecturalCommentary.ts`

````typescript
import { getGeminiModel } from "@/services/gateways";
import { log } from "@/lib/log";

export type SimilarityCommentary = {
    short: string; // Always displayed (~15 words)
    expanded: string; // Shown on "Why similar?" tap (~50 words)
};

export async function generateSimilarityCommentary(params: {
    sourceBuilding: {
        name: string;
        style: string;
        architect: string;
        year: number;
    };
    similarBuildings: Array<
        { name: string; style: string; architect: string; year: number }
    >;
}): Promise<SimilarityCommentary> {
    const model = getGeminiModel("gemini-2.0-flash-lite");

    const prompt = `You are an architectural historian. Given:
Source: "${params.sourceBuilding.name}" (${params.sourceBuilding.style}, ${params.sourceBuilding.year})
Similar: ${
        params.similarBuildings.slice(0, 3).map((b) => `${b.name} (${b.style})`)
            .join(", ")
    }

Respond in JSON:
{"short": "<15 word insight>", "expanded": "<50 word detailed explanation>"}`;

    try {
        const response = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 100, temperature: 0.7 },
        });

        const parsed = JSON.parse(
            response.text.replace(/```json/g, "").replace(/```/g, ""),
        );
        return {
            short: parsed.short || "Visually similar architectural forms.",
            expanded: parsed.expanded ||
                "These buildings share similar design principles.",
        };
    } catch (error) {
        log.warn("[Commentary] Failed to generate", error);
        return {
            short: "Visually similar architectural forms.",
            expanded:
                "Explore buildings with similar visual characteristics and design elements.",
        };
    }
}
````

#### [NEW] `src/screens/Scan/SimilarBuildingsScreen.tsx`

Clone `RelatedBuildingsScreen.tsx` with these changes:

- Header: "Similar Buildings" instead of category name
- Display `visual_similarity` as percentage badge
- Show metadata boost indicators (style match 🎨, architect match 🏗️)
- Add LLM commentary banner at top

#### [MODIFY] `src/screens/Scan/BuildingInfoScreen.tsx`

Add "Find Similar" button to actions row:

```tsx
<TouchableOpacity
    style={styles.actionButton}
    onPress={() =>
        navigation.navigate(screens.SimilarBuildings, {
            buildingData: building,
        })}
>
    <Ionicons name="git-compare-outline" size={24} color={theme.colors.text} />
    <Text style={styles.actionText}>find similar</Text>
</TouchableOpacity>;
```

#### [MODIFY] `src/navigation/routes.ts`

Add new screen:

```typescript
SimilarBuildings: 'SimilarBuildings',
```

---

## Batch Embedding Script

#### [NEW] `scripts/batch_embed_buildings.py`

```python
"""
One-time script to compute CLIP embeddings for all buildings with images.
Run this ONCE after deploying the migration.
"""
import asyncio
from supabase import create_client
from clip_matcher import encode_photo
import httpx

BATCH_SIZE = 50
R2_BASE = "https://your-r2-bucket.r2.cloudflarestorage.com/buildings"

async def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Get buildings without embeddings
    result = supabase.table('buildings').select('bin').is_('clip_embedding', None).execute()
    bins = [r['bin'] for r in result.data]
    
    print(f"Processing {len(bins)} buildings...")
    
    for i in range(0, len(bins), BATCH_SIZE):
        batch = bins[i:i+BATCH_SIZE]
        
        for bin in batch:
            try:
                image_url = f"{R2_BASE}/{bin}/0deg_40pitch.jpg"
                async with httpx.AsyncClient() as client:
                    resp = await client.get(image_url)
                    if resp.status_code != 200:
                        continue
                    embedding = await encode_photo(resp.content)
                
                supabase.table('buildings').update({
                    'clip_embedding': embedding.tolist()
                }).eq('bin', bin).execute()
                
                print(f"✅ {bin}")
            except Exception as e:
                print(f"❌ {bin}: {e}")
        
        print(f"Batch {i//BATCH_SIZE + 1} complete")

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Verification Plan

### Automated Tests

1. **Unit test** `find_similar_buildings` RPC with mock embeddings
2. **Integration test** the full flow: building → API → results

### Manual Verification

1. Navigate to Empire State Building → tap "Find Similar"
2. Verify Art Deco buildings (Chrysler, 30 Rock) appear in top 5
3. Confirm visual similarity percentages make sense
4. Check LLM commentary loads and is architecturally relevant

---

## Implementation Order

1. ⬜ Deploy Supabase migration (add vector column + RPC)
2. ⬜ Run batch embedding script on existing buildings
3. ⬜ Add `/api/similar-buildings` endpoint to Modal backend
4. ⬜ Create `similarBuildingsService.ts`
5. ⬜ Create `architecturalCommentary.ts`
6. ⬜ Create `SimilarBuildingsScreen.tsx`
7. ⬜ Add button to `BuildingInfoScreen.tsx`
8. ⬜ Update navigation routes
9. ⬜ Test end-to-end flow
