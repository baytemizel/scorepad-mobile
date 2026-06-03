# Building & Releasing ScorePad

## Prerequisites

1. **Apple Developer account** ($99/yr) and an iOS distribution certificate.
2. **Google Play Developer account** ($25 one-time) and a service-account JSON key for `eas submit`.
3. **Firebase project** with iOS + Android apps registered (matching bundle IDs `com.oditteknoloji.scorepad`).
4. **AdMob account** with iOS + Android apps.
5. **EAS CLI** installed: `npm install -g eas-cli`.

## One-time configuration

```bash
eas login
eas build:configure
```

`eas.json` is already provided with `development`, `preview`, and `production` profiles.

## Environment & secrets

Production builds read AdMob and IAP product IDs from environment variables. Set them as **EAS secrets** so they're available in cloud builds:

```bash
eas secret:create --scope project --name ADMOB_BANNER_IOS --value ca-app-pub-XXX/YYY
eas secret:create --scope project --name ADMOB_BANNER_ANDROID --value ca-app-pub-XXX/YYY
eas secret:create --scope project --name ADMOB_INTERSTITIAL_IOS --value ca-app-pub-XXX/YYY
eas secret:create --scope project --name ADMOB_INTERSTITIAL_ANDROID --value ca-app-pub-XXX/YYY
eas secret:create --scope project --name IAP_PRODUCT_PREMIUM --value com.oditteknoloji.scorepad.premium
eas secret:create --scope project --name FIREBASE_GOOGLE_WEB_CLIENT_ID --value 1234567890-abc.apps.googleusercontent.com
```

For AdMob app IDs (the OS-level identifiers), edit `app.config.ts` directly — these are public and ship in `Info.plist` / `AndroidManifest.xml`.

## Firebase config files

Place these in `firebase/` (gitignored):

- `firebase/GoogleService-Info.plist`
- `firebase/google-services.json`

`app.config.ts` references them via the `googleServicesFile` field. Without these the build will fail.

## Building

### iOS

```bash
eas build --platform ios --profile production
```

The first time, EAS will offer to create signing credentials for you (recommended). Select "Let EAS handle the credentials". Provisioning profile and distribution certificate get stored on EAS servers.

### Android

```bash
eas build --platform android --profile production
```

EAS generates a release keystore on first run. **Back up the keystore via `eas credentials` immediately** — losing it locks you out of updates on the Play Store.

### Internal testing builds

```bash
eas build --profile preview --platform ios     # ad-hoc / TestFlight
eas build --profile preview --platform android # APK
```

## Submitting

```bash
# After configuring `eas.json` submit section (see template):
eas submit --platform ios --latest
eas submit --platform android --latest
```

For iOS submission you need:
- `appleId` / `ascAppId` / `appleTeamId` in `eas.json`

For Android submission you need:
- A Google Play service account JSON key, referenced from `eas.json` as `serviceAccountKeyPath`.

## Versioning

Bump `version` and the platform-specific build numbers in `app.config.ts` before each release. EAS can manage build numbers automatically with `"autoIncrement": true` (already enabled in production profile).

## Over-the-air updates

EAS Update is configured but optional. To push a JS-only fix without resubmitting:

```bash
eas update --branch production --message "Fix tennis tiebreak bug"
```

## Common pitfalls

- **App Tracking Transparency dialog not showing on iOS**: ensure `NSUserTrackingUsageDescription` is set (it is in `app.config.ts`) AND the device is iOS 14.5+ AND you call `requestTrackingPermissionsAsync` AFTER the first user interaction. We do this on app boot — confirm the dialog by toggling Settings → ScorePad → Tracking.
- **Google Sign-In failing on iOS**: the `REVERSED_CLIENT_ID` from `GoogleService-Info.plist` must be added as a CFBundleURLScheme. The Firebase plugin handles this automatically when `GoogleService-Info.plist` is in place.
- **AdMob "Unable to load ad" in dev**: this is normal until the AdMob app passes review. Use `TestIds` (already done in dev mode).
- **IAP returns "product unavailable" in TestFlight**: ensure the IAP is in "Ready to Submit" state in App Store Connect AND a Sandbox tester is signed in on the device.
