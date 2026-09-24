# Changelog

Notable changes per released version. Store-facing copy for each release lives
in `store-assets/release-notes/`.

## 1.0.6

Sign in with Facebook, one account per email across every sign-in method, and
sign-in screens that offer only the providers and guest mode.

### Added

- **Sign in with Facebook** on the onboarding and the sign-in screen, below
  Google and Apple. iOS uses Facebook's Limited Login, so it works whether or
  not tracking was allowed. Facebook accounts can be deleted from Settings like
  the others. The button only appears in builds made with `FACEBOOK_APP_ID`
  (setup in `firebase/README.md`).
- **Linking accounts with the same email.** A Google, Apple or Facebook
  sign-in whose email already has an account under another provider used to
  stop with "already registered with a different sign-in method". The app now
  asks which provider the account uses, signs in with it and links the new
  one, so both open the same account with its history and Premium. Signing in
  to a different account in that step links nothing.

### Changed

- **Email sign-up and sign-in are switched off.** The onboarding no longer
  offers "Create account" / "Log in", and the sign-in screen shows only the
  provider buttons and guest mode. The code stays in place behind
  `emailAuthEnabled` in `src/services/auth.ts`. Existing email accounts stay
  signed in and can still delete themselves; once signed out they cannot sign
  back in with a password.

### Fixed

- The Facebook SDK was excluded from native linking since 1.0.1 (its iOS
  adapter did not compile against Expo SDK 52), so a Facebook button would have
  had no SDK behind it. It links again now that the adapter builds on SDK 54.

## 1.0.5

The score screen gets a way out, rotates on iPhone, and makes room for bigger
buttons in portrait.

### Added

- **Back button on the score screen**: top-left in portrait, in the top-left
  corner in landscape. Leaving a match still in progress asks first, since
  the score is discarded. A finished match (already saved) leaves straight
  away.
- Android's back button and back gesture go through the same confirmation.
  They used to pop the screen and silently discard a running match.

### Fixed

- **The score screen did not rotate on iPhone.** It asked for every
  orientation including upside-down portrait, which notched iPhones do not
  support, so iOS rejected the request and the screen stayed on the app's
  portrait lock. It now asks for the orientations the device supports.
- **The rotate button's flip no longer snaps back.** Half a second after a
  manual flip the screen handed control back to the sensor, which turned it
  straight back to the way the phone was being held. The chosen orientation
  now holds until the button is tapped again or the screen is left.
- **Android splash screen.** The splash was a full-screen artwork with its own
  gradient; Android fits the splash image into a 288dp icon slot, so it showed
  up as a cropped blue rectangle with a tiny mark inside. The splash is now
  the mark alone on the navy background, sized to fit that slot.
- **Bottom buttons clear the navigation bar.** The score screen's control row
  and the match setup's Start button sat flush against Android's 3-button
  bar, the gesture handle or the screen edge. They now keep a 20pt gap
  above a 3-button bar or a bare edge, and 8pt above a gesture handle or the
  iOS home indicator. This also covers devices that lay the app out above the
  bar (ColorOS on Android 12), where no inset is reported.
- The outlined action buttons (free throw, corner, 2-min) showed a light gap
  at each corner on Android.
- The Next button was in English in 13 of the 15 languages; it is now
  translated.

### Changed

- **Portrait scoring buttons fill the screen.** They sit two to a row and grow
  into the height a tall phone has, with the symbol and label sized to the
  button, instead of staying at a fixed 46pt and leaving the space empty.
- Next and Finish use icons (skip and whistle) in place of the ⏭ and ⏹
  emoji, which each platform drew differently.
- The home screen's Match History icon is a history clock instead of a bar
  chart.

## 1.0.4

Sign in with Apple sits below Google on every sign-in screen, and accounts can
be deleted from inside the app.

### Added

- **Sign in with Apple on the onboarding screen.** It appears directly below
  "Sign in with Google" on iOS; the onboarding screen used to offer Google
  alone.
- **Delete account** in Settings. The user confirms who they are again —
  through Apple's or Google's sheet, or their password — and the app then
  deletes their cloud match history, their user document and the Firebase
  account. For Apple accounts it also revokes the app's Apple token, so
  ScorePad leaves the user's Apple ID settings. App Store guideline 5.1.1(v)
  requires in-app deletion from any app that lets people create an account.

### Changed

- The sign-in screen's Apple button is now Apple's system button, placed below
  Google. It was a translucent button without the Apple logo, above Google,
  which App Review can reject under Apple's Sign in with Apple design rules.
- Apple sign-in sends a nonce, as Firebase requires, and asks for the email
  address only. The name was requested but never stored or shown.

### Fixed

- Closing the Google or Apple sign-in sheet showed "Something went wrong".
  Since Google Sign-In SDK 13, a closed sheet resolves as "cancelled" instead
  of rejecting, and the app read that as a missing token.
- Signing in with an email already registered through a different method now
  says so instead of showing the generic error.

## 1.0.3

A brand refresh — no behaviour changes.

### Changed

- **New app icon.** The scoreboard mock-up with "PLAYER 1 / PLAYER 2" headers
  and tally marks is replaced by a flat two-tone mark: a blue and orange split
  behind a cream "6:7". The old artwork lost its detail at launcher sizes,
  where an icon is 29–60px.
- The Android adaptive icon keeps the two-tone plate full-bleed, but pulls the
  digits into the safe circle so no launcher mask clips them. Its background
  colour follows the mark's blue rather than the splash navy, so a launcher
  that insets the foreground layer shows no seam.
- The splash screen carries the new mark in place of the placeholder ring.

## 1.0.2

The scoring engines were audited sport by sport against the real rules, and the
iOS and Android builds were brought onto Expo SDK 54.

### Fixed — scoring

- **Set-based matches ended early reported a draw.** Volleyball, tennis and
  table tennis decided the winner from completed sets alone, so ending a match
  from the Finish button — which is how most set-based matches end, since Next
  never finished one — came out as a draw whenever the sets were level, even at
  20-11 in the first set. Level sets now fall back to the score still on court:
  points for volleyball and table tennis, games then points for tennis.
- **Closing the deciding set with Next did not end the match.** All three
  set-based sports opened a set that could not be played and left the user to
  press Finish, which banked a phantom empty set.
- **Table tennis alternated the wrong server between games.** It flipped
  whoever served the last point instead of the game's opening server, so
  roughly every other game started with the wrong side serving.
- **Periods were banked with the running match total** rather than that
  period's own score, so a 2-0 half followed by a 1-3 half was recorded as 2-0
  and 3-3. Nothing rendered those numbers, but they were persisted and synced.

### Fixed — how a finished match is shown

- **Set-based matches are headlined by the set score.** A 3-0 sweep showed up
  in Match History and the summary banner as "25 – 20", the points of whichever
  set happened to be last. Sets now lead once a set has been decided; a match
  ended inside its first set still shows the score it was ended on. The per-set
  points stay in the expandable period breakdown.
- **The summary listed sets that were never played.** A straight-sets win ended
  on empty rows for the rest of the best-of.
- Handball is fully localized, and the onboarding copy covers all six sports.

### Changed — build

- Expo SDK 52 → 54 (React Native 0.81.5), for the iOS 26 SDK that App Store
  Connect now requires.
- iOS: builds on the Xcode 26 image, React Native built from source so
  react-native-firebase resolves its headers under static frameworks.
- Android: Gradle 8.13 and Kotlin 2.1.20, as AGP 8.11 and React Native 0.81
  require.
- react-native-google-mobile-ads pinned to 16.3.0. Later versions pull
  play-services-ads 25.4.0, which Google ships with Kotlin 2.3 metadata that
  the SDK 54 toolchain cannot read.

### Added

- A test suite over the six sport engines and the match store — 129 tests
  covering the rules each sport is judged by, run with `npm test`.
