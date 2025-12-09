module.exports = () => {
  const scheme = process.env.EXPO_DEEP_LINKING_SCHEME ?? "jink";
  const appUrl = process.env.EXPO_PUBLIC_APP_URL;
  let appHost = null;
  if (appUrl) {
    try {
      appHost = new URL(appUrl).host;
    } catch (error) {
      console.warn("[config] Invalid EXPO_PUBLIC_APP_URL; skipping host config", error);
    }
  }

  // Google Maps API key only needed for Android
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  // Mapbox public token (pk.) - for runtime map display
  const mapboxPublicToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

  return {
    name: "jink",
    slug: "architecture-app",
    scheme,
    version: "1.0.0",
    orientation: "portrait",
    plugins: [
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "We use your location to guide your walk. Don't worry, we won't share your location with anyone.",
        },
      ],
      [
        "expo-camera",
        {
          cameraPermission: "Allow $(PRODUCT_NAME) to access your camera to scan buildings.",
        },
      ],
      "expo-asset",
      [
        "@rnmapbox/maps",
        {
          RNMapboxMapsImpl: "mapbox",
          // NO download token here - it reads from RNMAPBOX_MAPS_DOWNLOAD_TOKEN env var
        },
      ],
    ],
    extra: {
      deepLinkingScheme: scheme,
      appUrl,
      buildingsSupabaseUrl: process.env.EXPO_PUBLIC_BUILDINGS_SUPABASE_URL,
      buildingsSupabaseAnonKey: process.env.EXPO_PUBLIC_BUILDINGS_SUPABASE_ANON_KEY,
      mapboxAccessToken: mapboxPublicToken,
      eas: {
        projectId: "b12162bd-7319-470b-b952-a352382cfd2c",
      },
    },
    ios: {
      newArchEnabled: false,
      bundleIdentifier: "com.lucienmount.architectureapp",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSMotionUsageDescription: "Motion is used to animate lighting reflections.",
        UISupportedInterfaceOrientations: ["UIInterfaceOrientationPortrait"],
      },
      appleTeamId: "5JRD794HZ9",
      ...(appHost
        ? {
            associatedDomains: [`applinks:${appHost}`],
          }
        : {}),
    },
    android: {
      permissions: [
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
      ],
      package: "com.lucienmount.architectureapp",
      intentFilters: [
        {
          action: "VIEW",
          category: ["BROWSABLE", "DEFAULT"],
          data: [
            { scheme },
            ...(appHost ? [{ scheme: "https", host: appHost, pathPrefix: "/" }] : []),
          ],
        },
      ],
    },
  };
};
