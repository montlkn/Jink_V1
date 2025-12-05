# Testing Contribution Bug Fix

## Problem
When clicking buttons in the "Help Improve Our Data" modal:
- Nothing happens
- App freezes on NotFound screen
- Can't exit the screen
- No photos upload to Cloudflare
- Re-scanning doesn't show contributed data

## What Was Fixed

### 1. Modal Touch Event Handling
**File**: `src/components/contribute/NotHerePrompt.tsx`
- Added `pointerEvents="box-none"` to overlay
- Added `pointerEvents="auto"` to modal container
- This allows touches to pass through the dark overlay but be captured by the modal content

### 2. Console Logging Added
Added comprehensive logging to debug the flow:

**In NotHerePrompt.tsx:**
- `[NotHerePrompt] Add Building Info pressed`
- `[NotHerePrompt] Just Add Photo pressed`
- `[NotHerePrompt] Cancel pressed`

**In NotFoundScreen.js:**
- `[NotFoundScreen] handleContribute called`
- `[NotFoundScreen] handleAddPhotoOnly called`
- `[NotFoundScreen] handleCancelPrompt called`
- `[NotFoundScreen] handlePhotoSubmit called with X photos`

## Testing Steps

### Test 1: Modal Button Response
1. Open app and scan a building (any building)
2. Wait for "Building Not Found" screen
3. Click "🏆 Help Improve Our Data" button
4. Modal should appear with two options
5. **Check console logs** - look for which logs appear:

**Expected Log Flow:**
```
When you click "Just Add Photo":
[NotHerePrompt] Just Add Photo pressed
[NotFoundScreen] handleAddPhotoOnly called
[MultiAnglePhotoCapture] Component rendering, visible: true
[MultiAnglePhotoCapture] Permission state: {granted: true/false, ...}
[MultiAnglePhotoCapture] Visible, checking permission...
[MultiAnglePhotoCapture] Showing camera capture screen  (OR permission screen if not granted)
```

**If you see:**
- ✅ All logs including camera screen → Component working, test photo capture
- ⚠️ Stops at "Permission state" → useCameraPermissions hook is causing freeze
- ⚠️ Permission not granted → Shows permission request screen
- ⚠️ Only NotFoundScreen logs → Component not rendering at all
- ❌ No logs → Touches not registering (pointerEvents issue)

### Test 2: Photo Capture Flow
1. Click "Just Add Photo"
2. MultiAnglePhotoCapture modal should open
3. Take a photo
4. Click "Continue" or "Done"
5. **Check console** for: `[NotFoundScreen] handlePhotoSubmit called with X photos`

**If photo submission works:**
- Alert should show: "📸 Photos Submitted! You earned +X XP..."
- Should navigate back to Home screen

### Test 3: Backend Request
1. When photo submission happens, check backend logs
2. Should see: `POST /api/contributions/photos`
3. Should see upload logs with Cloudflare R2

**If backend receives request:**
- Check Cloudflare dashboard for new images in `contributions/` folder
- Check database for new row in `user_contributed_buildings` table

### Test 4: Re-Scan
1. After contributing, go back and scan the same building
2. Should now show contributed data instead of "Building Not Found"

## Debugging Guide

### Scenario A: No Console Logs at All
**Problem**: Touches not registering
**Solution**: Check Modal z-index or add `zIndex: 9999` to modal container styles

### Scenario B: Only NotHerePrompt Logs
**Problem**: Handler functions not being passed correctly
**Check**:
- Verify `onContribute={handleContribute}` prop in NotFoundScreen
- Check if functions are defined before modal renders

### Scenario C: Both Logs, But No Modal Opens
**Problem**: State not updating or MultiAnglePhotoCapture not rendering
**Check**:
- Verify `showPhotoCapture` state changes to `true`
- Check if MultiAnglePhotoCapture has `visible={showPhotoCapture}` prop

### Scenario D: Photos Taken, But Not Submitted
**Problem**: Form submission failing
**Check**:
- Console for fetch errors
- Network tab for request details
- Backend logs for incoming requests

## Current Issues to Investigate

### MOST LIKELY: Camera Permission Hook Freeze
**Problem**: The `useCameraPermissions()` hook from `expo-camera` is called immediately when the component renders (even before checking `visible`). This hook may be:
- Making an async permission check that freezes the UI thread
- Causing a native module error that crashes silently
- Waiting for user interaction that never completes

**Check logs for**: Does execution stop at `[MultiAnglePhotoCapture] Permission state:` log?

**Potential Solutions**:
1. Lazy-load the component only when needed
2. Use conditional rendering to prevent hook from running until visible
3. Check if camera permissions were previously denied
4. Use a different permission request approach

### Other Potential Issues:
1. **FormData Structure**: React Native FormData might need different format
2. **Content-Type Header**: Might need to remove or set differently
3. **File URI Format**: React Native file URIs might not match backend expectations
4. **Modal Stacking**: Two modals (NotHerePrompt + MultiAnglePhotoCapture) may cause navigation issues

## Next Steps After Fix

Once buttons work:
1. Verify Cloudflare uploads
2. Test re-scan retrieval
3. Verify XP awards
4. Test full contribution flow (with address/architect data)
5. Implement quest system
6. Add streak celebrations
7. Update UI components with level titles
