const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Force every CocoaPods target to compile in the Swift 5 language mode.
//
// Apple now requires building with the iOS 26 SDK (Xcode 26). Under Xcode 26
// the Swift compiler defaults to the Swift 6 language mode, which promotes a
// number of previously-benign warnings to hard errors. Expo SDK 52's bundled
// Swift modules (expo-localization, expo-image, expo-apple-authentication,
// expo-file-system, ...) trip these: non-exhaustive switches over imported
// enums and non-final classes conforming to Sendable. Pinning SWIFT_VERSION to
// 5.0 keeps them as warnings so the pods compile with the iOS 26 SDK without
// patching each module. Remove this once the project moves to an Expo SDK that
// officially supports Xcode 26 (SDK 54+).
const MARKER = 'post_install do |installer|';
const GUARD = "build_configuration.build_settings['SWIFT_VERSION'] = '5.0'";

const INJECTION = `post_install do |installer|
    # Pin all pods to the Swift 5 language mode (see plugins/withIosSwiftVersion.js).
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_configuration|
        build_configuration.build_settings['SWIFT_VERSION'] = '5.0'
      end
    end`;

module.exports = function withIosSwiftVersion(config) {
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
