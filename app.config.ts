import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'ScorePad',
  slug: 'scorepad',
  version: '1.0.1',
  // Keep the native config permissive so iOS Info.plist
  // (UISupportedInterfaceOrientations) includes landscape — required for the
  // score screen to rotate. Portrait everywhere else is enforced at runtime via
  // a root-level lock (app/_layout.tsx), overridden only on the score screen.
  orientation: 'default',
  icon: './assets/icons/icon.png',
  scheme: 'scorepad',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.oditteknoloji.scorepad',
    buildNumber: '1',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSUserTrackingUsageDescription:
        'This identifier will be used to deliver personalized ads to you.',
      UIBackgroundModes: [],
      CFBundleAllowMixedLocalizations: true,
      CFBundleLocalizations: [
        'en', 'tr', 'de', 'fr', 'es', 'it', 'pt', 'sr', 'el', 'ru', 'et', 'sv', 'fi', 'ar', 'he',
      ],
    },
    googleServicesFile: process.env.GOOGLE_SERVICES_PLIST ?? './firebase/GoogleService-Info.plist',
    config: {
      usesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/icons/adaptive-icon.png',
      backgroundColor: '#0B1220',
    },
    package: 'com.oditteknoloji.scorepad',
    versionCode: 1,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './firebase/google-services.json',
    permissions: [
      'com.google.android.gms.permission.AD_ID',
      'INTERNET',
      'VIBRATE',
    ],
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
    ],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-localization',
    'expo-screen-orientation',
    'expo-font',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#0B1220',
        imageWidth: 420,
      },
    ],
    [
      'expo-build-properties',
      {
        ios: {
          useFrameworks: 'static',
          deploymentTarget: '15.1',
        },
        android: {
          // Google Play requires new releases to target Android 16 (API 36)
          // from 2026-08-31. Expo SDK 52 ships AGP 8.6.0, which emits an
          // "untested compileSdk" warning at 36 but builds successfully.
          compileSdkVersion: 36,
          targetSdkVersion: 36,
          buildToolsVersion: '36.0.0',
          minSdkVersion: 24,
          kotlinVersion: '1.9.25',
        },
      },
    ],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: process.env.ADMOB_ANDROID_APP_ID ?? 'ca-app-pub-6243163976423366~2881851180',
        iosAppId: process.env.ADMOB_IOS_APP_ID ?? 'ca-app-pub-3940256099942544~1458002511',
        userTrackingUsageDescription:
          'This identifier will be used to deliver personalized ads to you.',
        skAdNetworkItems: [
          'cstr6suwn9.skadnetwork',
          '4fzdc2evr5.skadnetwork',
          '2fnua5tdw4.skadnetwork',
          'ydx93a7ass.skadnetwork',
          'p78axxw29g.skadnetwork',
          'v72qych5uu.skadnetwork',
        ],
      },
    ],
    [
      'expo-tracking-transparency',
      {
        userTrackingPermission:
          'This identifier will be used to deliver personalized ads to you.',
      },
    ],
    [
      'expo-apple-authentication',
    ],
    '@react-native-firebase/app',
    '@react-native-firebase/auth',
    // Only register the Facebook SDK plugin when credentials are present;
    // the plugin throws if appID/scheme are empty.
    ...(process.env.FACEBOOK_APP_ID
      ? ([
          [
            'react-native-fbsdk-next',
            {
              appID: process.env.FACEBOOK_APP_ID,
              clientToken: process.env.FACEBOOK_CLIENT_TOKEN ?? '',
              displayName: 'ScorePad',
              scheme: `fb${process.env.FACEBOOK_APP_ID}`,
              advertiserIDCollectionEnabled: false,
              autoLogAppEventsEnabled: false,
              isAutoInitEnabled: true,
            },
          ],
        ] as NonNullable<ExpoConfig['plugins']>)
      : []),
  ],
  extra: {
    eas: {
      projectId: 'f32f68f7-1bf7-4656-9fba-9356293318b1',
    },
    facebookEnabled: !!process.env.FACEBOOK_APP_ID,
    firebaseGoogleWebClientId: process.env.FIREBASE_GOOGLE_WEB_CLIENT_ID ?? '',
    revenueCatIosKey: process.env.REVENUECAT_IOS_API_KEY ?? '',
    revenueCatAndroidKey: process.env.REVENUECAT_ANDROID_API_KEY ?? '',
  },
  experiments: {
    typedRoutes: true,
  },
  updates: {
    url: process.env.EXPO_UPDATES_URL,
    fallbackToCacheTimeout: 0,
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
});
