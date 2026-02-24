# JinkiOS — Swift MVP Setup

## Prerequisites
- Xcode 15+
- iOS 17+ simulator or device
- Mapbox account (for token)

## 1. Create Xcode Project
Open Xcode → File → New → Project → iOS → App
- Product Name: `JinkApp`
- Bundle Identifier: `com.lucienmount.architectureapp`
- Interface: SwiftUI
- Language: Swift
- Team: 5JRD794HZ9
- Minimum Deployment: iOS 17.0

Save into this `JinkiOS/` folder (replace the generated folder with the one here).

## 2. Add Swift Package Dependencies
File → Add Package Dependencies:
- `https://github.com/supabase/supabase-swift` → Up to Next Major `2.0.0`
- `https://github.com/mapbox/mapbox-maps-ios` → Up to Next Major `11.0.0`

## 3. Configure Secrets
```bash
cp Secrets.xcconfig.example Secrets.xcconfig
# Fill in your real values
```

## 4. Link Secrets.xcconfig to Xcode
- Click the project in the navigator → select the target → Build Settings
- At the top of Build Settings, set Configuration File to `Secrets.xcconfig`

## 5. Add Info.plist entries
Add these keys to your Info.plist (they'll be populated from Secrets.xcconfig):
```xml
<key>SUPABASE_URL</key>
<string>$(SUPABASE_URL)</string>
<key>SUPABASE_ANON_KEY</key>
<string>$(SUPABASE_ANON_KEY)</string>
<key>BUILDINGS_SUPABASE_URL</key>
<string>$(BUILDINGS_SUPABASE_URL)</string>
<key>BUILDINGS_SUPABASE_ANON_KEY</key>
<string>$(BUILDINGS_SUPABASE_ANON_KEY)</string>
<key>SCAN_API_URL</key>
<string>$(SCAN_API_URL)</string>
<key>MBXAccessToken</key>
<string>$(MAPBOX_TOKEN)</string>

<!-- Permissions -->
<key>NSCameraUsageDescription</key>
<string>Jink uses your camera to identify buildings.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Jink uses your location to find nearby buildings.</string>
```

## 6. Add Source Files
Add all files from `JinkApp/` to the Xcode target. Maintain the folder structure.

## 7. Deep Link (jink://)
Add URL Scheme in Info.plist:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array><string>jink</string></array>
  </dict>
</array>
```

## Project Structure
```
JinkApp/
├── App/           — @main entry, AppState
├── Services/      — Supabase, Location, ScanAPI, XP, Aesthetic
├── Features/
│   ├── Auth/      — Email/password + magic link
│   ├── Scan/      — Camera + GPS + API call
│   ├── Walk/      — Mapbox map + route tracking
│   └── Passport/  — XP, stats, archetype arc
├── Models/        — Building, Walk, Profile, AestheticProfile
├── Navigation/    — RootView (TabView)
└── DesignSystem/  — AppColors, ArchetypeArcView
```
