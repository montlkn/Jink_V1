require("dotenv/config");

const baseConfig = require("./app.json");

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return [...value];
  return [value];
};

module.exports = ({ config }) => {
  const googleMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    "";

  const mergedConfig = {
    ...config,
    ...(baseConfig?.expo ?? {}),
  };

  const plugins = toArray(mergedConfig.plugins);
  const pluginIndex = plugins.findIndex((entry) => {
    if (typeof entry === "string") return entry === "react-native-maps";
    if (Array.isArray(entry)) return entry[0] === "react-native-maps";
    return false;
  });

  const pluginConfig = {
    iosGoogleMapsApiKey: googleMapsApiKey,
    androidGoogleMapsApiKey: googleMapsApiKey,
  };

  if (pluginIndex === -1) {
    plugins.push(["react-native-maps", pluginConfig]);
  } else {
    const existing = plugins[pluginIndex];
    if (typeof existing === "string") {
      plugins[pluginIndex] = [existing, pluginConfig];
    } else if (Array.isArray(existing)) {
      const [name, settings = {}] = existing;
      plugins[pluginIndex] = [
        name,
        {
          ...settings,
          ...pluginConfig,
        },
      ];
    }
  }

  return {
    ...mergedConfig,
    plugins,
  };
};
