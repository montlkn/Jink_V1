# Backend Photo Contribution Endpoint

## Overview

The frontend now sends user photos to the backend when buildings are verified via Tier 2 (cone of vision) but don't have CLIP embeddings yet. This creates a community-driven embedding database.

## Required Backend Endpoint

### `POST /api/contribute_building_photo`

**Purpose**: Accept user-submitted building photos and create embeddings for future CLIP matching

**Request Format**: `multipart/form-data`

**Parameters**:
```javascript
{
  photo: File,               // JPEG image from camera
  gps_lat: string,          // User's GPS latitude
  gps_lng: string,          // User's GPS longitude
  compass_bearing: string,  // Camera bearing (0-360°)
  building_bin: string,     // Building Identification Number from PLUTO
  contribute_mode: "true"   // Flag indicating this is a contribution
}
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Photo contribution saved",
  "building_bin": "1234567",
  "embedding_created": true,
  "photo_id": "abc123"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Invalid building BIN"
}
```

## Backend Implementation Checklist

### 1. Photo Storage
- [ ] Save photo to storage (S3/cloud storage)
- [ ] Store metadata: BIN, GPS coords, bearing, timestamp, user_id
- [ ] Generate unique photo_id
- [ ] Optional: Resize/compress photo for efficiency

### 2. Embedding Generation
- [ ] Load CLIP model (same as `/api/scan` endpoint)
- [ ] Generate embedding from user photo
- [ ] Store embedding in vector database with BIN reference
- [ ] Optional: Generate multiple embeddings if photo has multiple buildings

### 3. Quality Control (Optional but Recommended)
- [ ] Check photo isn't blurry (Laplacian variance)
- [ ] Check photo has sufficient lighting
- [ ] Verify GPS coords are within 50m of building coords
- [ ] Flag suspicious contributions for review

### 4. Database Schema

**Photos Table**:
```sql
CREATE TABLE contributed_photos (
  id UUID PRIMARY KEY,
  building_bin VARCHAR(10),
  user_id UUID,
  photo_url TEXT,
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  compass_bearing DOUBLE PRECISION,
  created_at TIMESTAMP,
  quality_score DOUBLE PRECISION,
  status VARCHAR(20) -- 'pending', 'approved', 'rejected'
);
```

**Embeddings Table** (or vector DB):
```sql
CREATE TABLE building_embeddings (
  id UUID PRIMARY KEY,
  building_bin VARCHAR(10),
  embedding VECTOR(512), -- CLIP embedding dimension
  source_photo_id UUID,  -- Reference to contributed_photos
  created_at TIMESTAMP,

  INDEX idx_bin (building_bin)
);
```

## Integration Flow

### Current Behavior (No Backend Support)
```
User verifies building via cone of vision
  ↓
Frontend calls verifyWithUserPhotoContribution()
  ↓
Backend returns 404 (endpoint doesn't exist)
  ↓
Frontend logs warning, continues normally
  ↓
User gets verified, walk continues ✓
```

### Future Behavior (With Backend Support)
```
User verifies building via cone of vision
  ↓
Frontend calls verifyWithUserPhotoContribution()
  ↓
Backend saves photo + creates embedding
  ↓
Returns success response
  ↓
User gets verified, walk continues ✓
  ↓
Next user at this building → Tier 1 (CLIP) match!
```

## Growth Metrics

**Organic Database Growth**:
- Day 1: 0 embeddings (only PLUTO metadata)
- After 100 walks: ~500 building embeddings (assuming 5 buildings/walk, 100% new)
- After 1,000 walks: ~3,000-5,000 embeddings (accounting for revisits)
- After 10,000 walks: ~15,000-25,000 embeddings (core NYC coverage)

**Coverage Improvement**:
- Week 1: Tier 1 success rate ~10% (only pre-seeded buildings)
- Month 1: Tier 1 success rate ~40% (popular walking areas covered)
- Month 6: Tier 1 success rate ~70%+ (most walkable NYC covered)

## Pre-Seeding Strategy (Optional)

To bootstrap the system, you could pre-seed embeddings for popular buildings:

1. **Top 500 landmarks** - Use Google Street View or existing photo datasets
2. **High-traffic areas** - Pre-walk Manhattan, Brooklyn hotspots
3. **Architectural significance** - Pre-embed buildings from NYC Landmarks database

This gives users a good Tier 1 experience from Day 1 while community contributions fill in the gaps.

## Cost Comparison

**Option A: Pre-embed all 860k PLUTO buildings**
- Google Maps Static API: ~$2 per 1,000 requests
- 860k buildings × $2/1k = **$1,720 upfront**
- Plus ongoing compute for embedding generation

**Option B: User contribution (current approach)**
- Cost: **$0** (users provide photos)
- Coverage: Grows organically with actual usage
- Quality: Better (real-world viewing angles)

Winner: **Option B** 🏆

## Privacy Considerations

- [ ] Add user consent: "Your photos help improve building recognition"
- [ ] Optional: Allow users to opt-out of photo contribution
- [ ] Don't store user identity in public embedding database
- [ ] EXIF data stripping (remove camera/location metadata before public storage)
- [ ] Terms of service: User grants license for ML training

## Testing the Endpoint

**Local Testing**:
```bash
curl -X POST http://localhost:8000/api/contribute_building_photo \
  -F "photo=@test_building.jpg" \
  -F "gps_lat=40.7580" \
  -F "gps_lng=-73.9855" \
  -F "compass_bearing=180" \
  -F "building_bin=1234567" \
  -F "contribute_mode=true"
```

**Expected Success**:
```json
{
  "success": true,
  "message": "Photo contribution saved",
  "building_bin": "1234567",
  "embedding_created": true
}
```

## Related Files

- `src/services/buildingVerificationService.ts` - Frontend integration
- `docs/implementation/BUILDING_VERIFICATION.md` - Overall verification strategy
