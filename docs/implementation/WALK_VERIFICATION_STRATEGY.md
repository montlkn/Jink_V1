# Walk Verification Strategy

> **Status**: Future Implementation (costs deferred, using existing embeddings
> for now)

This document outlines the walk verification strategy for confirming building
scans during walks.

---

## Overview

The walk verification system ensures users are looking at the correct building
by:

1. **Pre-fetching** reference images and embeddings before walks start
2. **Multi-position capture** from Street View (avoiding 180° contamination)
3. **CLIP-first matching** with GPS/address fallback

---

## The 180° Problem

### Current Issue

When capturing Street View images for a building, rotating 180° captures the
OPPOSITE building across the street, contaminating the embeddings.

```
    [Building A]         <-- Target building
        ▲
        │
────────●──────── Street
        │
        ▼
    [Building B]         <-- Captured in 180° rotation (WRONG!)
```

### Solution: Multi-Position Capture

Capture from multiple positions along the street, all facing the SAME direction
toward the target building:

```
    [Building A]         <-- Target building
    ▲   ▲   ▲
   /    │    \
  ●     ●     ●          <- Multiple capture points
  P1    P2    P3            (all facing same direction)
──────────────── Street
```

---

## Capture Strategy

### Old Approach (Poisoned)

```
Point on Street ──┬── 0° photo
                  ├── 90° photo
                  ├── 180° photo ← WRONG BUILDING
                  └── 270° photo
```

### New Approach (Clean)

```
Position 1 (Above)  ──┬── Front 0°
                      └── Front 20° pitch

Position 2 (Center) ──┬── Front 0°
                      └── Front 40° pitch

Position 3 (Below)  ──── Front 0°
```

### Multi-Position Capture Locations

For each building, capture from these positions:

| Position    | Offset from Building   | Direction       | Pitches      |
| ----------- | ---------------------- | --------------- | ------------ |
| P1 (Above)  | 20m north along street | Toward building | 0°, 20°, 40° |
| P2 (Center) | Directly across street | Toward building | 0°, 20°, 40° |
| P3 (Below)  | 20m south along street | Toward building | 0°, 20°, 40° |

**Total: 9 images per building** (vs 12 with 180° rotation)

- ✅ Less API cost
- ✅ No contamination from opposite buildings
- ✅ Better coverage of building facade

---

## Verification Pipeline

### Order of Operations (CLIP First!)

```
┌─────────────────────────────────────────────────────────────┐
│  1. CLIP MATCHING (Primary)                                 │
│     ├── Check building-images embeddings                    │
│     └── Check user-images embeddings                        │
├─────────────────────────────────────────────────────────────┤
│  2. ADDRESS MATCHING (Fallback)                             │
│     ├── Reverse geocode user GPS                            │
│     └── Match address to building database                  │
├─────────────────────────────────────────────────────────────┤
│  3. GPS + CONE-OF-VISION (Last Resort)                      │
│     ├── Find buildings within cone angle                    │
│     └── Score by distance and angle from center             │
└─────────────────────────────────────────────────────────────┘
```

### Pre-Walk Preparation Flow

```
User                    App                     Backend              StreetView           CLIP
 │                       │                         │                      │                │
 ├─Start Walk Setup──────►                         │                      │                │
 │                       ├──Create Walk Session────►                      │                │
 │                       │                         ├──Get buildings on route               │
 │                       │                         │                      │                │
 │                       │         ┌───────────────┴────────────────┐     │                │
 │                       │         │ For each building w/o embeddings│    │                │
 │                       │         └───────────────┬────────────────┘     │                │
 │                       │                         │                      │                │
 │                       │                         ├──Request images──────►                │
 │                       │                         │  (multi-position)    │                │
 │                       │                         ◄──Return images───────┤                │
 │                       │                         │                      │                │
 │                       │                         ├──Generate embeddings─┼────────────────►
 │                       │                         ◄──Return vectors──────┼────────────────┤
 │                       │                         │                      │                │
 │                       │                         ├──Cache in walk_building_cache         │
 │                       │                         │                      │                │
 │                       ◄──Walk ready─────────────┤                      │                │
 │                       │  (with cached embeddings)                      │                │
 │                       │                         │                      │                │
 ├─Walk & Scan buildings─►                         │                      │                │
 │                       ├──Verify scan────────────►                      │                │
 │                       │  (compare to cache)     │                      │                │
```

---

## Database Schema

### Cached Embeddings for Walk Verification

```sql
-- Cached embeddings for walk verification
CREATE TABLE walk_building_cache (
  id SERIAL PRIMARY KEY,
  walk_id UUID REFERENCES walks(id) ON DELETE CASCADE,
  building_bin TEXT,
  building_bbl TEXT,
  building_lat FLOAT,
  building_lng FLOAT,
  capture_position TEXT, -- 'above', 'center', 'below'
  capture_pitch INTEGER, -- 0, 20, 40
  image_url TEXT,
  clip_embedding VECTOR(512),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_walk_cache_walk_id ON walk_building_cache(walk_id);
CREATE INDEX idx_walk_cache_bin ON walk_building_cache(building_bin);
```

### Reusable Primary Embeddings

```sql
-- For reusable embeddings (not tied to specific walk)
CREATE TABLE building_primary_embeddings (
  id SERIAL PRIMARY KEY,
  building_bin TEXT NOT NULL,
  building_bbl TEXT,
  capture_position TEXT,
  capture_pitch INTEGER,
  image_url TEXT,
  clip_embedding VECTOR(512),
  source TEXT DEFAULT 'street_view', -- 'street_view', 'user_contributed'
  quality_score FLOAT, -- for ranking during verification
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(building_bin, capture_position, capture_pitch)
);
```

---

## Verification Algorithm

### During Walk Scan

```python
async def verify_building_scan(
    walk_id: str,
    user_photo_embedding: list[float],
    gps_lat: float,
    gps_lng: float,
    heading: float
) -> VerificationResult:
    """
    Verify a user's photo matches the expected building.
    CLIP matching is PRIMARY, GPS/address is FALLBACK.
    """
    
    # 1. CLIP MATCHING (Primary)
    # Check building-images embeddings
    building_match = await find_clip_match(
        user_photo_embedding,
        buckets=['building-images', 'user-images']
    )
    
    if building_match and building_match.confidence > 0.75:
        return VerificationResult(
            status='verified',
            method='clip',
            building_bin=building_match.bin,
            confidence=building_match.confidence
        )
    
    # 2. ADDRESS MATCHING (Fallback)
    address = await reverse_geocode(gps_lat, gps_lng)
    address_match = await find_building_by_address(address)
    
    if address_match:
        return VerificationResult(
            status='verified',
            method='address',
            building_bin=address_match.bin,
            confidence=0.6  # Lower confidence for address-only
        )
    
    # 3. GPS + CONE-OF-VISION (Last Resort)
    cone_match = await find_building_in_cone(gps_lat, gps_lng, heading)
    
    if cone_match and cone_match.confidence > 0.5:
        return VerificationResult(
            status='unverified_gps_only',
            method='cone',
            building_bin=cone_match.bin,
            confidence=cone_match.confidence
        )
    
    return VerificationResult(status='unknown', confidence=0)
```

---

## User Contribution Naming

### Current Issue

User contributions are going to `user-images/{user_id}/unknown/` instead of
organized by building.

### Proposed Solution: Address-Based Organization

Since BIN may be hard to source and incorrect BINs could pollute datasets, use
**address** as the primary identifier:

```
user-images/
├── {user_id}/
│   ├── {normalized_address}/          # e.g., "405-lexington-ave"
│   │   ├── {uuid}_front_20251205.jpg
│   │   ├── {uuid}_left_20251205.jpg
│   │   └── ...
│   └── {another_address}/
└── pending_review/                     # For unresolved addresses
    └── ...
```

### Address Normalization

```python
def normalize_address(address: str) -> str:
    """Convert address to filesystem-safe folder name."""
    # "405 Lexington Avenue, New York, NY" -> "405-lexington-avenue"
    normalized = address.lower()
    normalized = re.sub(r'[,\s]+', '-', normalized)  # spaces/commas to dashes
    normalized = re.sub(r'[^a-z0-9\-]', '', normalized)  # remove special chars
    normalized = re.sub(r'-+', '-', normalized)  # collapse multiple dashes
    return normalized[:100]  # max length
```

---

## Cost Estimates

### Multi-Position Street View Capture

- **API cost**: ~$0.007 per Street View image
- **Images per building**: 9 (3 positions × 3 pitches)
- **Cost per building**: ~$0.063

### Full Re-embed (Deferred)

- **10,000 buildings**: ~$630 one-time
- **Timeline**: 2-3 days of processing
- **Status**: Deferred due to cost/complexity

---

## Implementation Status

| Component               | Status      | Notes                            |
| ----------------------- | ----------- | -------------------------------- |
| Multi-position capture  | 📋 Planned  | Requires Street View API updates |
| Walk building cache     | 📋 Planned  | Database schema ready            |
| CLIP-first verification | 📋 Planned  | Algorithm designed               |
| Address-based folders   | 📋 Planned  | Naming scheme designed           |
| Pre-walk preparation    | 📋 Planned  | Pipeline designed                |
| Full re-embedding       | ⏸️ Deferred | Using existing supply for now    |
