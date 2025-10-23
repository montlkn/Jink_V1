// Dynamic Expo config to inject Google Maps (iOS) without committing secrets.

const appJson = require('./app.json');

module.exports = () => {
  const iosGoogleMapsApiKey = process.env.IOS_GOOGLE_MAPS_API_KEY || null;

  const config = {
    expo: {
      ...appJson.expo,
      plugins: [
        ...(appJson.expo.plugins || []),
        [
          'react-native-maps',
          iosGoogleMapsApiKey ? { iosGoogleMapsApiKey } : {},
        ],
      ],
    },
  };

  return config;
};

