// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // remove: 'expo-router/babel'
      ['module:react-native-dotenv', {
        moduleName: 'react-native-dotenv',
        path: '.env',
        blocklist: null,
        allowlist: null,
        safe: false,
        allowUndefined: true,
      }],
      'react-native-reanimated/plugin', // keep LAST
    ],
  };
};
