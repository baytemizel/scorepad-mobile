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
| Authentication          | Apple, Google, Facebook sign-in              |
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

The app signs in with Apple natively on iOS (`expo-apple-authentication`, with a
nonce) and revokes the Apple token when a user deletes their account. That needs
three things in the [Apple Developer portal](https://developer.apple.com/account/resources/identifiers/list)
and one in Firebase. `<project-id>` below is `PROJECT_ID` from
`GoogleService-Info.plist`.

1. **Identifiers → App ID `com.oditteknoloji.scorepad`**: the **Sign In with Apple**
   capability must be ticked. EAS enables it during a build because the
   `expo-apple-authentication` config plugin adds the entitlement.
2. **Keys**: create a key with **Sign in with Apple** enabled and
   `com.oditteknoloji.scorepad` as its primary App ID. Download the `.p8` (Apple
   only lets you download it once) and note the Key ID.
3. **Identifiers → Services IDs**: create one (e.g. `com.oditteknoloji.scorepad.signin`)
   with Sign in with Apple enabled, configured with
   - Domain: `<project-id>.firebaseapp.com`
   - Return URL: `https://<project-id>.firebaseapp.com/__/auth/handler`
4. **Firebase Console → Authentication → Sign-in method → Apple**: enable it and
   fill in the Services ID, the Apple Team ID (`88S58EEEDX`), the Key ID and the
   `.p8` private key.

Token revocation (`auth().revokeToken`) depends on the Services ID and key from
steps 2–4. If revocation fails, account deletion logs a warning and still deletes
the account, so check that ScorePad disappears from the test Apple ID's
"Sign in with Apple" list after a deletion.

### Google Sign-In Setup

1. In Firebase Console → Authentication → Sign-in method, enable "Google".
2. Copy the **Web SDK configuration → Web client ID** under the Google provider.
3. Set `FIREBASE_GOOGLE_WEB_CLIENT_ID=<that value>` in your `.env` (and as an EAS secret for cloud builds).
   - It is surfaced via `app.config.ts → extra.firebaseGoogleWebClientId` and read in `app/_layout.tsx` boot to call `configureGoogleSignIn`. Without it, the Google sign-in button will throw at runtime.
4. **Android only:** Add SHA-1 fingerprints from each EAS build profile to the Android app in Firebase Console, then re-download `google-services.json`. Without the right fingerprint Google Sign-In returns `DEVELOPER_ERROR (10)`.

Email/password sign-in is switched off in the app for now (`emailAuthEnabled`
in `src/services/auth.ts`). Keep the Email/Password provider enabled in Firebase
anyway: accounts created with it in earlier versions still need it to delete
themselves from Settings.

### Facebook Login Setup

The Facebook button only appears in builds made with `FACEBOOK_APP_ID` set: the
`react-native-fbsdk-next` config plugin writes the App ID and client token into
`Info.plist` and `AndroidManifest.xml`, so adding or changing them needs a new
native build (an OTA update is not enough). iOS signs in with Facebook's
Limited Login, so it works whether or not the user allowed tracking.

1. **[Meta for Developers](https://developers.facebook.com/apps) → Create app**,
   use case "Authenticate and request data from users with Facebook Login".
   The app asks for `public_profile` and `email` only.
2. **App settings → Basic**: note the **App ID** and **App Secret**. Fill in the
   Privacy Policy URL (`https://scorepad.best/privacy`), a User data deletion
   URL (the same page covers deletion, see its "Data retention" section), the
   category and the icon. Meta won't switch the app to Live without them.
3. **App settings → Advanced → Security**: note the **Client token**.
4. **App settings → Basic → Add platform**:
   - **iOS**: Bundle ID `com.oditteknoloji.scorepad`.
   - **Android**: package `com.oditteknoloji.scorepad`, class
     `com.oditteknoloji.scorepad.MainActivity`, and the key hashes of every key
     that signs the app: the EAS upload key (`eas credentials -p android`) and
     the Play App Signing key (Play Console → Test and release → App integrity).
     Meta wants each SHA-1 in base64:
     ```bash
     echo <SHA-1 with colons removed> | xxd -r -p | openssl base64
     ```
     Without the right hash, Android login fails with "Invalid key hash".
5. **Firebase Console → Authentication → Sign-in method → Facebook**: enable it
   with the App ID and App Secret from step 2, and copy the OAuth redirect URI
   it shows (`https://<project-id>.firebaseapp.com/__/auth/handler`).
6. **Meta → Facebook Login → Settings → Valid OAuth Redirect URIs**: paste that
   URI.
7. **`eas.json`**: add `FACEBOOK_APP_ID` and `FACEBOOK_CLIENT_TOKEN` to the `env`
   of each build profile (and to `.env` for local builds). The client token is
   meant to ship inside the app, like the RevenueCat keys already there; the
   App Secret is not, and only goes into Firebase.
8. **Meta → App mode → Live**. In Development mode only people with a role on
   the Meta app can log in.

Firebase keeps one account per email address (keep the default "Link
accounts that use the same email" setting). When a sign-in hits an email that
already has an account under another provider, the app asks which provider
that account uses, signs in with it and links the new provider to the same
account (`signInAndLink` in `src/services/auth.ts`). Firebase allows the link
only after that sign-in proves the account is theirs.
