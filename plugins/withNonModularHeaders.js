const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Allow non-modular header includes inside framework modules.
//
// Firebase requires static frameworks (ios.useFrameworks: "static"), which
// builds every pod as a framework module. @react-native-firebase's pods
// (RNFBApp, RNFBAuth, RNFBFirestore, ...) import React-Core headers
// (RCTConvert.h, RCTBridgeModule.h, RCTEventEmitter.h) non-modularly, which
// Xcode 26 rejects under -Werror,-Wnon-modular-include-in-framework-module.
// Setting CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES on every
// pod target downgrades it to a warning. Known Expo SDK 54 issue
// (expo/expo#39607). Remove once Expo ships a precompiled React-Core that
// resolves this (SDK 56+).
const MARKER = 'post_install do |installer|';
const GUARD = 'CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES';

const INJECTION = `post_install do |installer|
    # Allow non-modular header includes in framework modules (see plugins/withNonModularHeaders.js).
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_configuration|
        build_configuration.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end`;

module.exports = function withNonModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        'Podfile',
      );
      let contents = fs.readFileSync(podfilePath, 'utf8');
      if (!contents.includes(GUARD) && contents.includes(MARKER)) {
        contents = contents.replace(MARKER, INJECTION);
        fs.writeFileSync(podfilePath, contents);
      }
      return cfg;
    },
  ]);
};
