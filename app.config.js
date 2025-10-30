module.exports = () => {
  const iosGoogleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!iosGoogleMapsApiKey) {
    throw new Error(
      "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY must be set to build with Google Maps; Apple Maps fallback is disabled."
    );
  }

  return {
    name: "jink",
    slug: "jink",
    scheme: "jink",
    version: "1.0.0",
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
        "react-native-maps",
        {
          iosGoogleMapsApiKey,
          useGoogleMaps: true,
        },
      ],
    ],
    extra: {
      eas: {
        projectId: "b12162bd-7319-470b-b952-a352382cfd2c",
      },
    },
    ios: {
      bundleIdentifier: "com.lucienmount.architectureapp",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSMotionUsageDescription: "Motion is used to animate lighting reflections.",
      },
      appleTeamId: "5JRD794HZ9",
      config: {
        googleMapsApiKey: iosGoogleMapsApiKey,
      },
    },
    android: {
      permissions: [
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
      ],
      package: "com.lucienmount.architectureapp",
    },
  };
};
