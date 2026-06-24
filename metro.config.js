const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Transpile packages that use private class fields (#field) unsupported by
// the Hermes version bundled in Expo Go SDK 54.
config.transformer.transformIgnorePatterns = [
  'node_modules/(?!(react-native|@react-native|react-native-svg|react-native-screens|react-native-safe-area-context|@react-navigation|expo|@expo|@unimodules|unimodules)/)',
];

module.exports = config;
