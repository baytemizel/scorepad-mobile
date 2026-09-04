# Changelog

Notable changes per released version. Store-facing copy for each release lives
in `store-assets/release-notes/`.

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
