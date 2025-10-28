// Dynamic Expo config to inject Google Maps (iOS) without committing secrets.

const appJson = require('./app.json');

module.exports = () => {
  const iosGoogleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || null;

  const basePlugins = (appJson.expo.plugins || []).filter((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    return name !== 'expo-router';
  });

  const baseExtra = {
    ...(appJson.expo.extra || {}),
  };

  const config = {
    expo: {
      ...appJson.expo,
      extra: baseExtra,
      plugins: [
        ...basePlugins,
        [
          'react-native-maps',
          iosGoogleMapsApiKey ? { iosGoogleMapsApiKey } : {},
        ],
      ],
    },
  };

  return config;
};
