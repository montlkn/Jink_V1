// Dynamic Expo config to inject Google Maps (iOS) without committing secrets.

const appJson = require('./app.json');

module.exports = () => {
  const iosGoogleMapsApiKey = process.env.IOS_GOOGLE_MAPS_API_KEY || null;

  const basePlugins = [...(appJson.expo.plugins || [])];
  const hasExpoRouter = basePlugins.some((plugin) =>
    Array.isArray(plugin) ? plugin[0] === 'expo-router' : plugin === 'expo-router'
  );
  if (!hasExpoRouter) {
    basePlugins.push('expo-router');
  }

  const baseExtra = {
    ...(appJson.expo.extra || {}),
    expoRouter: {
      ...(appJson.expo.extra?.expoRouter || {}),
      appRoot: appJson.expo.extra?.expoRouter?.appRoot || 'app',
    },
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
