// Learn more https://docs.expo.io/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// SERVER-ONLY MODULE SHIM
// Prevents Metro from bundling Node.js-only modules into the React Native app.
// If someone accidentally imports BullMQ, Redis, or other server code, Metro will fail
// with a clear error message instead of silently breaking the bundle.
const SERVER_ONLY_SHIM = path.resolve(__dirname, 'shims/server-only.js');

// Ensure R3F native packages resolve correctly
config.resolver = config.resolver || {};
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'cjs'];
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.assetExts = [
  ...(config.resolver.assetExts || []),
  'hdr',
  'exr',
  'ktx2',
  'wasm',
  'dat',
];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  three: path.resolve(__dirname, 'node_modules/three'),

  // CRITICAL: Block server-only modules to prevent accidental bundling
  // Job queue (Node.js only)
  'bullmq': SERVER_ONLY_SHIM,
  'bull': SERVER_ONLY_SHIM,

  // Redis client (Node.js only)
  'ioredis': SERVER_ONLY_SHIM,
  'redis': SERVER_ONLY_SHIM,

  // Node.js standard library (not available in React Native)
  'child_process': SERVER_ONLY_SHIM,
  'fs': SERVER_ONLY_SHIM,
  'net': SERVER_ONLY_SHIM,
  'tls': SERVER_ONLY_SHIM,
  'cluster': SERVER_ONLY_SHIM,
  'dgram': SERVER_ONLY_SHIM,
  'repl': SERVER_ONLY_SHIM,
};

module.exports = config;
