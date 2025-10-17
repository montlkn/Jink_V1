# Deep Link Testing Guide

## Test if your app can receive deep links

### Step 1: Make sure app is running
Start your app with:
```bash
npx expo start
# Then press 'i' for iOS or 'a' for Android
```

### Step 2: Test deep link manually

**For iOS Simulator:**
```bash
xcrun simctl openurl booted "jink://auth/callback?test=123"
```

**For Android Emulator:**
```bash
adb shell am start -W -a android.intent.action.VIEW -d "jink://auth/callback?test=123"
```

**For Physical Device:**
```bash
# iOS
npx uri-scheme open jink://auth/callback?test=123 --ios

# Android
npx uri-scheme open jink://auth/callback?test=123 --android
```

### Step 3: Check console logs

You should see in the console:
```
AuthCallback: useEffect running, current session: No session
AuthCallback: getInitialURL returned: jink://auth/callback?test=123
AuthCallback: handleOAuthCallback called
AuthCallback: URL provided: Yes
AuthCallback: Full callback URL: jink://auth/callback?test=123
```

### If you DON'T see these logs:

The URL scheme isn't registered. You need to rebuild:

```bash
# Clean and rebuild
npx expo prebuild --clean

# Then run on device/simulator
npx expo run:ios
# or
npx expo run:android
```

**IMPORTANT:** Expo Go does NOT support custom URL schemes. You MUST use a development build.

### Step 4: Check Supabase Configuration

In Supabase Dashboard:
1. Go to Authentication → URL Configuration
2. Add to "Redirect URLs":
   ```
   jink://auth/callback
   jink://*
   ```
3. Click Save

### Step 5: Verify Google OAuth flow

After confirming deep links work:
1. Sign in with Google
2. Watch console for:
   - `SSO: Redirect URL: jink://auth/callback` (should show at start)
   - `AuthCallback: Full callback URL: jink://...` (should show after OAuth)
   - `AuthProvider: Auth state changed: SIGNED_IN` (confirms session created)

If you see the first log but not the others, the OAuth redirect isn't coming back to your app - check Supabase redirect URL configuration.
