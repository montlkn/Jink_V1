# Building Verification System

## Overview

The app uses a **3-tier progressive verification system** to verify user presence at buildings during walks. This system provides 100% coverage even for undocumented buildings without ML embeddings.

## Verification Tiers

### Tier 1: CLIP/Embedding Match (Most Accurate, Limited Coverage)

**Method**: ML-based photo matching using CLIP embeddings

**How it works**:
1. User takes photo of building
2. Photo sent to backend `/api/scan` endpoint
3. Backend compares photo embedding with stored building embeddings
4. Returns matched building if similarity > threshold

**Advantages**:
- Highest accuracy (90%+ confidence)
- Works from any angle/distance
- Identifies building even if user doesn't know which one it is

**Limitations**:
- Only works for buildings with pre-existing embeddings
- Requires backend to be online
- Cold start problem: new buildings have no embeddings

**Used in**: Both normal scan mode and verification mode

---

### Tier 2: Cone of Vision + GPS Proximity (High Accuracy, 100% Coverage)

**Method**: Geometric verification using GPS, compass, and gyroscope

**How it works**:

1. **GPS Circle Filter** (20m radius)
   ```
   distance = haversineDistance(userLat, userLng, buildingLat, buildingLng)
   include if distance <= 0.02 km (20 meters)
   ```

2. **Compass Cone Filter** (±30° from bearing)
   ```
   bearingToBuilding = atan2(Δlng, Δlat)
   angleDiff = |bearingToBuilding - compassHeading|
   include if angleDiff <= 30°
   ```

3. **Pitch Filter** (optional, if building height known)
   ```
   expectedPitch = atan2(buildingHeight/2, distance)
   include if |userPitch - expectedPitch| < 45°
   ```

**Confidence Scoring**:
- 1 candidate building → 95% confidence (auto-verify)
- 2 candidates → 75% confidence (auto-verify)
- 3 candidates → 60% confidence (auto-verify)
- 4+ candidates → 40% confidence (fail, ask user to reposition)
- 0 candidates → 0% confidence (fail)

**Advantages**:
- Works for ANY building in the database (100% coverage)
- No backend/embedding required
- Fast (instant calculation)
- Works offline

**Limitations**:
- Requires accurate GPS (10m accuracy or better)
- Requires user to point camera at building
- Urban canyons may affect GPS/compass accuracy

**Used in**: Verification mode only (walks)

---

### Tier 3: User Photo Contribution (Lazy Embedding)

**Method**: Community-driven embedding database via user-submitted photos

**How it works**:
1. User verifies building via Tier 2 (cone of vision)
2. Since CLIP didn't match (no embedding exists), contribute photo to backend
3. Backend saves photo and creates embedding for future use
4. Fire-and-forget (doesn't block user flow)
5. Next user who visits this building will match via Tier 1 (CLIP)

**Why this is better than Google Street View**:
- **Free**: No Google API costs
- **Better data**: Real viewing angles from actual users, not Street View car
- **Current photos**: Always up-to-date as users visit buildings
- **Organic growth**: Database expands naturally through usage
- **Multi-angle coverage**: Different users contribute different perspectives

**Advantages**:
- Solves cold start problem organically
- Gradually builds comprehensive embedding database
- Cheaper than pre-fetching 860k buildings from PLUTO dataset
- Better training data than synthetic/Street View images

**User Flow**:
```
User 1 visits new building:
  Tier 1 (CLIP) → No match (building has no embedding)
  Tier 2 (Cone) → Match! Verified ✓
  → Backend saves photo, creates embedding

User 2 visits same building:
  Tier 1 (CLIP) → Match! Verified ✓ (using User 1's contributed photo)
  → Fast verification, no cone needed
```

**Status**: Integration complete, requires backend endpoint `/api/contribute_building_photo`

---

## Implementation Details

### Code Architecture

**Service Layer**: `src/services/buildingVerificationService.ts`
- `verifyBuilding()` - Main orchestrator, tries each tier sequentially
- `verifyWithClip()` - Tier 1: Backend ML verification
- `verifyWithConeOfVision()` - Tier 2: Geometric verification
- `verifyWithStreetView()` - Tier 3: Placeholder for future
- `getCandidateBuildingsInVision()` - Core cone of vision algorithm

**Integration**: `src/screens/Scan/ScanScreen.js`
- Fetches nearby buildings (50m radius) when in verification mode
- Tracks phone pitch via accelerometer
- Calls `verifyBuilding()` during photo capture
- Shows detailed error messages based on verification result

### Sensor Data Used

| Sensor | Purpose | Accuracy |
|--------|---------|----------|
| GPS | User location | ±5-20m in cities |
| Compass (Magnetometer) | Camera bearing | ±5-15° |
| Gyroscope (Accelerometer) | Phone pitch/tilt | ±2° |
| Camera | Photo capture | N/A |

### Verification Flow (Walk Mode)

```
User taps "I'm Here" on WalkNavScreen
  ↓
Navigate to ScanScreen (verification mode)
  ↓
Fetch nearby buildings (50m radius)
  ↓
User takes photo
  ↓
┌─────────────────────────────────────┐
│ Tier 1: Try CLIP/Embedding match   │
│ - Send photo to backend             │
│ - If match found → VERIFIED ✓       │
│ - If no match → Continue to Tier 2  │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ Tier 2: Cone of Vision              │
│ - Filter buildings by GPS (20m)     │
│ - Filter by compass cone (±30°)     │
│ - Filter by pitch (optional)        │
│ - If 1-3 candidates → VERIFIED ✓    │
│ - If 0 or 4+ candidates → FAILED ✗  │
└─────────────────────────────────────┘
  ↓
Return to WalkNavScreen with result
  ↓
If verified: Award XP, move to next building
If failed: Show error message, stay on current building
```

### Database Requirements

**Buildings DB** (Supabase):
- Must have GPS coordinates: `geocoded_lat`, `geocoded_lng`
- Building identifier: `bin` (Building Identification Number)
- Optional: `building_height` for pitch filtering

**App DB** (Supabase):
- Aesthetic events tracked with `verification_method` field
- Walk sessions track which buildings were verified

### Configuration Parameters

```typescript
// GPS proximity radius
proximityRadiusKm: 0.02  // 20 meters

// Compass cone angle
coneAngleDeg: 30  // ±30 degrees

// Pitch tolerance
pitchToleranceDeg: 45  // ±45 degrees

// Confidence thresholds
AUTO_VERIFY_MIN_CONFIDENCE: 60  // 60%+
```

## Testing Recommendations

### Test Cases

1. **Single building in view** → Should auto-verify with 95% confidence
2. **Two adjacent buildings** → Should auto-verify with 75% confidence
3. **User pointing wrong direction** → Should fail with helpful error
4. **User too far from building (>20m)** → Should fail, suggest moving closer
5. **Building with ML embedding** → Should verify via Tier 1 (CLIP)
6. **New building without embedding** → Should verify via Tier 2 (cone)
7. **Urban canyon (poor GPS)** → May require multiple attempts
8. **Indoor scan** → Should fail (GPS accuracy too low)

### Debug Information

Enable debug logs by checking Metro console for:
- `[verification]` - Cone of vision filters and candidates
- `[scan]` - Sensor data, API calls, verification results
- `[buildingService]` - Nearby building fetches

The ScanScreen shows real-time sensor data in top-left corner:
- GPS coordinates
- Compass heading (0-360°)
- Altitude
- Position confidence
- Movement type

## Future Enhancements

1. **Tier 3 Implementation**: Add Google Street View embedding fallback
2. **Multi-candidate UI**: If 2-3 candidates, show picker to disambiguate
3. **Offline Mode**: Cache nearby buildings for offline verification
4. **Accuracy Improvements**:
   - Add sensor fusion for better heading estimation
   - Use building footprint polygons instead of point coordinates
   - Add building height data for better pitch filtering
5. **Analytics**: Track verification success rate by tier

## Performance Metrics

Expected success rates:
- **Tier 1 (CLIP)**: 85% for documented buildings
- **Tier 2 (Cone)**: 90% for all buildings (good GPS conditions)
- **Combined**: 95%+ success rate

Expected latency:
- **Tier 1**: 2-5 seconds (backend API call)
- **Tier 2**: <100ms (local calculation)
- **Overall**: 2-5 seconds (Tier 1 tries first)

## Related Files

- `src/services/buildingVerificationService.ts` - Core verification logic
- `src/services/buildingService.ts` - Nearby building fetching
- `src/screens/Scan/ScanScreen.js` - Verification UI integration
- `src/screens/Walk/WalkNavScreen.js` - Walk navigation with verification
