const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude backend folder from Metro bundler
config.resolver.blockList = [
  /backend\/.*/
];

module.exports = config;
