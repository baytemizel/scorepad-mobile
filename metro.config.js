const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('ttf', 'otf', 'wav', 'mp3', 'png', 'jpg');

module.exports = config;
