module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@': './src',
            '@app': './app',
            '@assets': './assets',
          },
        },
      ],
      // Reanimated 4 moved its Babel plugin into react-native-worklets.
      // This must stay last in the plugins list.
      'react-native-worklets/plugin',
    ],
  };
};
