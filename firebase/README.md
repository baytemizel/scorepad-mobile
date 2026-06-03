# Firebase configuration

This directory holds the platform configuration files that the React Native Firebase SDK reads at build time. **Both files are gitignored and must be downloaded from your Firebase Console before the first build.**

## Required files

### iOS — `GoogleService-Info.plist`

1. Open [Firebase Console](https://console.firebase.google.com/) → your project.
2. Project settings → "Your apps" → iOS app with bundle ID `com.oditteknoloji.scorepad`.
3. If the app doesn't exist yet, create it. **Bundle ID must match exactly**: `com.oditteknoloji.scorepad`.
4. Click "GoogleService-Info.plist" to download.
5. Save it as `firebase/GoogleService-Info.plist` in this repo.

### Android — `google-services.json`

1. Same Firebase project.
2. Project settings → "Your apps" → Android app with package name `com.oditteknoloji.scorepad`.
3. Generate a SHA-1 fingerprint for each EAS build profile and add them in Firebase:
   ```bash
   eas credentials -p android   # then read the SHA-1 from the keystore info
   ```
4. Click "google-services.json" to download.
5. Save it as `firebase/google-services.json` in this repo.

## Verify

`app.config.ts` references these files via:

```ts
ios: {
  googleServicesFile: "./firebase/GoogleService-Info.plist",
},
android: {
  googleServicesFile: "./firebase/google-services.json",
},
```

If either file is missing, `eas build` will fail loudly during prebuild.

## Services used

ScorePad uses these Firebase products. **Enable each one in the console** before shipping:

| Service                 | Used for                                     |
|-------------------------|----------------------------------------------|
| Authentication          | Email, Apple, Google sign-in                 |
| Firestore               | Premium users — match history cloud sync     |
| Analytics               | Anonymous usage events                       |

### Firestore security rules

A reasonable starting point — paste this into Firebase Console → Firestore → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
      match /matches/{matchId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
}
```

This means:
- A user can only read/write their own document and their own matches.
- Anonymous (no auth) requests are blocked.
- Cross-user reads are blocked.

### Apple Sign-In Setup

For Apple sign-in to work via Firebase, also do this in **Firebase Console → Authentication → Sign-in method**:

1. Enable "Apple"
2. Add your Service ID and Team ID from [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list/serviceId)
3. Upload your `.p8` Apple authentication key

### Google Sign-In Setup

1. In Firebase Console → Authentication → Sign-in method, enable "Google".
2. Copy the **Web SDK configuration → Web client ID** under the Google provider.
3. Set `FIREBASE_GOOGLE_WEB_CLIENT_ID=<that value>` in your `.env` (and as an EAS secret for cloud builds).
   - It is surfaced via `app.config.ts → extra.firebaseGoogleWebClientId` and read in `app/_layout.tsx` boot to call `configureGoogleSignIn`. Without it, the Google sign-in button will throw at runtime.
4. **Android only:** Add SHA-1 fingerprints from each EAS build profile to the Android app in Firebase Console, then re-download `google-services.json`. Without the right fingerprint Google Sign-In returns `DEVELOPER_ERROR (10)`.
