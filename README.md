# ScorePad — Multi-Sport Score Tracker

A production-ready React Native + Expo mobile app for tracking scores across **basketball, football, volleyball, tennis, and table tennis**. Built for parents on sidelines, coaches, referees, and weekend warriors who want the simplest possible scoreboard with the *correct* rules.

## Highlights

- 🏀 **5 sports** with real rule engines (point progression, sets, tie-breaks, period transitions)
- 🌍 **15 languages** (en, tr, de, fr, es, it, pt, sr, el, ru, et, sv, fi, ar, he) — full RTL support
- 📱 Forced **landscape** during scoring with massive tap targets
- 💾 **Match history** with search, filter, and cloud sync (Premium)
- 💎 **One-time Premium** ($2.99) — removes ads, unlocks history & sync
- 🔐 **Auth**: email, Apple, Google, or guest
- 🎨 Dark mode, haptics, sound effects, polished animations
- 📊 **Firebase Analytics** + **AdMob** banners and interstitials

## Tech stack

| Layer        | Choice                                              |
|--------------|-----------------------------------------------------|
| Framework    | Expo SDK 52, React Native 0.76, TypeScript (strict) |
| Routing      | Expo Router (file-based)                            |
| State        | Zustand (with MMKV persist)                         |
| Data fetch   | TanStack Query                                      |
| Styling      | Custom theme tokens + dark mode                     |
| Animation    | React Native Reanimated 3                           |
| i18n         | i18next + expo-localization                         |
| Auth & sync  | Firebase Auth, Firestore, Analytics                 |
| Ads          | react-native-google-mobile-ads (AdMob)              |
| Purchases    | expo-in-app-purchases                               |
| Builds       | EAS Build / EAS Submit                              |

## Quick start

```bash
# 1. Install
npm install

# 2. Copy env
cp .env.example .env
# Fill in real AdMob/IAP IDs for production builds.
# Test IDs are used by default in dev.

# 3. Drop Firebase configs
# - firebase/GoogleService-Info.plist  (iOS)
# - firebase/google-services.json       (Android)
# See firebase/README.md

# 4. Run
npx expo start
```

## Project structure

```
.
├── app/                       # Expo Router screens
│   ├── _layout.tsx            # Root: theme, i18n, query, ads, IAP, sounds
│   ├── index.tsx              # Smart redirect on launch
│   ├── (onboarding)/          # First-run flow (5 screens)
│   ├── (auth)/                # Sign-in / sign-up
│   ├── (main)/                # Home, history, premium, settings
│   ├── match/
│   │   ├── setup.tsx          # Configure teams/format
│   │   └── score.tsx          # ★ Live scoring (landscape) ★
│   └── settings/              # Privacy, terms
├── src/
│   ├── components/
│   │   ├── ui/                # Button, Card, Input
│   │   ├── common/            # AdBanner, SportIcon, PremiumGate
│   │   └── scoring/           # BigScore, ActionButton, TeamPanel, ScoreCenterBar
│   ├── sports/                # Per-sport rule engines (pure functions)
│   ├── store/                 # Zustand stores (settings, auth, match, history)
│   ├── services/              # ads, iap, auth, analytics, firestore, feedback
│   ├── localization/          # i18n + 15 locale files
│   ├── theme/                 # Tokens, ThemeProvider
│   └── types/                 # Shared TypeScript types
├── assets/                    # Icon, splash, sounds, fonts
├── firebase/                  # Firebase config files (gitignored)
├── store-assets/              # App Store / Play Store metadata
└── docs/                      # BUILD, STORE_SUBMISSION, QA, etc.
```

## Sport rule engines

Each engine in `src/sports/` is a pure-function `SportEngine` implementing:

```ts
interface SportEngine {
  meta: SportMeta;
  init(config): MatchState;
  availableActions(state, side): SportAction[];
  apply(state, side, action): ApplyResult;
  undo(state): MatchState;
  finish(state): MatchState;
  getStatusLabel(state): StatusLabel;
  getDisplayScore(state, side): number;
  getStatLines?(state, side): StatLine[];
}
```

| Sport         | Scoring                                  | Period unit   | Period count |
|---------------|------------------------------------------|---------------|--------------|
| Basketball    | 1 / 2 / 3 points + fouls                 | Quarter/half  | 2 or 4       |
| Football      | Goals + yellow/red cards + corners       | Half          | 2            |
| Volleyball    | Rally scoring, win-by-2, 25 pts (15 dec) | Set           | Best of 3/5  |
| Tennis        | 0/15/30/40/Adv → games → sets, tiebreak  | Set           | Best of 3/5  |
| Table tennis  | 11-point sets, win-by-2, service rotates | Set           | Best of 3/5/7|

## Premium model

- One-time, non-consumable IAP: `com.oditteknoloji.scorepad.premium`
- Unlocks: ad-free experience, match history, cloud sync, detailed stats
- Restore Purchases supported on both platforms

See `docs/STORE_SUBMISSION.md` for App Store Connect & Google Play Console setup.

## Building for production

```bash
# Login once
eas login

# Configure (one-time)
eas build:configure

# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production

# Submit
eas submit --platform ios --latest
eas submit --platform android --latest
```

Full instructions in `docs/BUILD.md`.

## Environment variables

See `.env.example`. Production must override:

- `ADMOB_BANNER_IOS`, `ADMOB_BANNER_ANDROID`
- `ADMOB_INTERSTITIAL_IOS`, `ADMOB_INTERSTITIAL_ANDROID`
- `IAP_PRODUCT_PREMIUM` (default: `com.oditteknoloji.scorepad.premium`)
- `FIREBASE_GOOGLE_WEB_CLIENT_ID` (for Google Sign-In)

## License

Proprietary. All rights reserved.

## Support

Email: support@scorepad.app
