# Contribution System Fixes

## Date: December 4, 2025

## Issues Fixed

### 1. Photo Upload Path Structure ✅
**Problem**: Contribution photos were uploading to wrong location
- **Before**: `building-images/contributions/{uuid}/{angle}_{timestamp}.jpg`
- **After**: `user-images/{user_id}/{BIN}/{scan_id}_{angle}_{timestamp}.jpg`

**Why this matters**:
- Separates user contributions from reference images
- Organizes by user and building for easy analytics
- Follows proper bucket structure documented in R2_BUCKET_STRUCTURE.md
- Enables user-specific operations (deletion, statistics, etc.)

**Files Changed**:
- `/Users/lucienmount/coding/nyc_scan/backend/routers/contribute.py`

**Changes Made**:
```python
# Added imports
from utils.storage import upload_image, upload_image_to_bucket
from models.config import get_settings

# Updated upload logic in /contributions/photos endpoint
user_folder = user_id if user_id and user_id != 'anonymous' else 'anonymous'
bin_folder = bin_value if bin_value and bin_value != 'unknown' else 'unknown'

# Generate proper key structure
key = f"{user_folder}/{bin_folder}/{contribution_uuid}_{angle}_{timestamp}.jpg"

# Upload to user-images bucket instead of building-images
user_images_public_url = settings.r2_user_images_public_url or settings.r2_public_url
url = await upload_image_to_bucket(
    image_bytes=photo_bytes,
    key=key,
    bucket=settings.r2_user_images_bucket,  # ← Changed from default bucket
    public_url=user_images_public_url,
    content_type='image/jpeg',
    make_public=True,
    create_thumbnail=True
)
```

### 2. Enhanced Debug Logging for Modal Freeze ✅
**Problem**: Contribution modal was freezing after button press - couldn't identify where execution stopped

**Files Changed**:
- `/Users/lucienmount/Arch_App_V2/architecture-app/src/components/contribute/MultiAnglePhotoCapture.tsx`
- `/Users/lucienmount/Arch_App_V2/architecture-app/docs/TESTING_CONTRIBUTION_BUG.md`

**Logging Added**:
```typescript
console.log('[MultiAnglePhotoCapture] Component rendering, visible:', visible);
console.log('[MultiAnglePhotoCapture] Permission state:', permission);
console.log('[MultiAnglePhotoCapture] Visible, checking permission...');
console.log('[MultiAnglePhotoCapture] Permission not granted, showing permission screen');
console.log('[MultiAnglePhotoCapture] Showing preview screen with', capturedPhotos.length, 'photos');
console.log('[MultiAnglePhotoCapture] Showing camera capture screen');
```

**Expected Log Flow** (updated in TESTING_CONTRIBUTION_BUG.md):
```
[NotHerePrompt] Just Add Photo pressed
[NotFoundScreen] handleAddPhotoOnly called
[MultiAnglePhotoCapture] Component rendering, visible: true
[MultiAnglePhotoCapture] Permission state: {granted: true/false, ...}
[MultiAnglePhotoCapture] Visible, checking permission...
[MultiAnglePhotoCapture] Showing camera capture screen
```

## Next Steps

### Immediate Testing Required:
1. **Test contribution flow** with new debug logs to identify exact freeze point
2. **Verify photo uploads** go to `user-images` bucket with correct path structure
3. **Check Cloudflare dashboard** to confirm photos appear in user-images bucket

### Suspected Issues to Investigate:
The logs will reveal if the freeze is caused by:
- `useCameraPermissions()` hook causing UI thread freeze
- Permission check failing silently
- Modal rendering issue
- CameraView component initialization

## Folder Structure

### user-images Bucket (Correct Structure)
```
user-images/
├── {user_id}/
│   ├── {BIN}/
│   │   ├── {uuid}_front_20251204_130000.jpg
│   │   ├── {uuid}_front_20251204_130000_thumb.jpg
│   │   ├── {uuid}_left_20251204_130015.jpg
│   │   └── ... (multiple angles)
│   └── {another_BIN}/
└── anonymous/
    └── {BIN}/
        └── ...
```

### Example Paths:
- User contribution: `user-images/user-123-abc/1234567/contrib-uuid_front_20251204_150030.jpg`
- Anonymous contribution: `user-images/anonymous/1234567/contrib-uuid_detail_20251204_150030.jpg`

## Benefits of New Structure

1. **Organization**: Easy to find all photos by user or building
2. **Analytics**: Count contributions per user, buildings covered
3. **Privacy**: Can delete all user photos if requested
4. **Monitoring**: Track storage growth per user
5. **Billing**: Separate costs for reference vs. user images
6. **Embedding**: Daily job can process new user photos for CLIP embeddings

## Environment Variables Required

Ensure these are set in backend `.env`:
```bash
# User Images Bucket (separate from reference images)
R2_USER_IMAGES_BUCKET=user-images
R2_USER_IMAGES_PUBLIC_URL=https://pub-234fc67c039149b2b46b864a1357763d.r2.dev
```

## Testing Checklist

- [ ] Test contribution photo upload
- [ ] Check logs for MultiAnglePhotoCapture rendering
- [ ] Verify photos appear in Cloudflare user-images bucket
- [ ] Confirm path structure matches: `{user_id}/{BIN}/{uuid}_{angle}_{timestamp}.jpg`
- [ ] Test re-scan retrieval (photos should be associated with building)
- [ ] Verify thumbnails are created
- [ ] Check XP is awarded correctly

## Related Documentation

- `/Users/lucienmount/coding/nyc_scan/backend/docs/R2_BUCKET_STRUCTURE.md` - Full bucket structure documentation
- `/Users/lucienmount/Arch_App_V2/architecture-app/docs/TESTING_CONTRIBUTION_BUG.md` - Debugging guide for contribution freeze bug
