// Learn more https://docs.expo.io/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure R3F native packages resolve correctly
config.resolver = config.resolver || {};
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'cjs'];
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  three: path.resolve(__dirname, 'node_modules/three'),
};

module.exports = config;
