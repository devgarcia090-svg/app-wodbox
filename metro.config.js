const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

console.log('[WodBox] metro.config.js loaded OK');

// Force Babel to transpile packages that use private class fields (#field syntax)
// which Hermes in Expo Go SDK 54 cannot execute untranspiled.
// Pattern WITHOUT trailing slash so "react-native" matches all react-native-* packages.
config.transformer.transformIgnorePatterns = [
  'node_modules/(?!(react-native|@react-native|@react-navigation|expo|@expo))',
];

module.exports = config;
